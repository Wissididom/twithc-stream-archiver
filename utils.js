export function convertDate(date) {
  return Math.floor(date.getTime() / 1000);
}

export async function getUserById(clientId, accessToken, id) {
  let apiUrl = id
    ? `https://api.twitch.tv/helix/users?id=${id}`
    : `https://api.twitch.tv/helix/users`;
  let userResponse = await fetch(apiUrl, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => res.json());
  return userResponse.data[0];
}

export async function getUserByLogin(login) {
  let apiUrl = login
    ? `https://api.twitch.tv/helix/users?login=${login}`
    : `https://api.twitch.tv/helix/users`;
  let userResponse = await fetch(apiUrl, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => res.json());
  return userResponse.data[0];
}

export async function getStreams(clientId, accessToken, id) {
  let apiUrl = id
    ? `https://api.twitch.tv/helix/streams?user_id=${id}`
    : `https://api.twitch.tv/helix/streams`;
  let userResponse = await fetch(apiUrl, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  }).then((res) => res.json());
  return userResponse.data;
}

// https://dev.twitch.tv/docs/api/reference/#get-eventsub-subscriptions
export async function getSubscriptions(
  clientId,
  accessToken,
  status = null,
  type = null,
  userId = null,
  after = null,
) {
  let data = [];
  if (status) {
    data.push(`status=${encodeURIComponent(status)}`);
  }
  if (type) {
    data.push(`type=${encodeURIComponent(type)}`);
  }
  if (userId) {
    data.push(`user_id=${encodeURIComponent(userId)}`);
  }
  if (after) {
    data.push(`after=${encodeURIComponent(after)}`);
  }
  let url =
    data.length < 1
      ? "https://api.twitch.tv/helix/eventsub/subscriptions"
      : `https://api.twitch.tv/helix/eventsub/subscriptions?${data.join("&")}`;
  return await fetch(url, {
    method: "GET",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }).then(async (res) => {
    // 200 OK = Successfully retrieved the subscriptions
    // 400 Bad Request
    // 401 Unauthorized
    const json = await res.json();
    console.log(
      `getSubscriptions:${res.status}:\n${JSON.stringify(json, null, 2)}`,
    );
    if (res.status >= 200 && res.status < 300) {
      if (json.pagination && json.pagination.cursor) {
        const subJson = getSubscriptions(
          clientId,
          accessToken,
          status,
          type,
          userId,
          json.pagination.cursor,
        );
        if (subJson != null) {
          for (subEventSubEntry of subJson.data) {
            json.data.push(subEventSubEntry);
          }
        }
      }
      return json;
    } else {
      return null;
    }
  });
}

// https://dev.twitch.tv/docs/api/reference/#create-eventsub-subscription
export async function registerStreamOnlineEvent(
  clientId,
  accessToken,
  broadcasterUserId,
) {
  let data = {
    type: "stream.online",
    version: "1",
    condition: {
      broadcaster_user_id: broadcasterUserId,
    },
    transport: {
      method: "webhook",
      callback: process.env.URL ?? "https://localhost",
      secret: process.env.EVENTSUB_SECRET,
    },
  };
  return await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then(async (res) => {
    // 202 Accepted = Successfully accepted the subscription request
    // 400 Bad Request
    // 401 Unauthorized
    // 403 Forbidden = The sender is not permitted to send chat messages to the broadcaster’s chat room.
    // 409 Conflict - A subscription already exists for the specified event type and condition combination
    // 429 Too Many Requests
    const json = await res.json();
    console.log(
      `registerStreamOnlineEvent:${res.status}:\n${JSON.stringify(json, null, 2)}`,
    );
    if (res.status >= 200 && res.status < 300) {
      return json;
    } else {
      return null;
    }
  });
}

// https://dev.twitch.tv/docs/api/reference/#create-eventsub-subscription
export async function registerStreamOfflineEvent(
  clientId,
  accessToken,
  broadcasterUserId,
) {
  let data = {
    type: "stream.offline",
    version: "1",
    condition: {
      broadcaster_user_id: broadcasterUserId,
    },
    transport: {
      method: "webhook",
      callback: process.env.URL ?? "https://localhost",
      secret: process.env.EVENTSUB_SECRET,
    },
  };
  return await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then(async (res) => {
    // 202 Accepted = Successfully accepted the subscription request
    // 400 Bad Request
    // 401 Unauthorized
    // 403 Forbidden = The sender is not permitted to send chat messages to the broadcaster’s chat room.
    // 409 Conflict - A subscription already exists for the specified event type and condition combination
    // 429 Too Many Requests
    const json = await res.json();
    console.log(
      `registerStreamOfflineEvent:${res.status}:\n${JSON.stringify(json, null, 2)}`,
    );
    if (res.status >= 200 && res.status < 300) {
      return json;
    } else {
      return null;
    }
  });
}
