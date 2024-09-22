import "dotenv/config";

let token = {
  access_token: null,
  expires_in: null,
  token_type: null,
};

// https://dev.twitch.tv/docs/api/reference/#get-eventsub-subscriptions
async function getSubscriptions(
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
      Authorization: `Bearer ${token.access_token}`,
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      "Content-Type": "application/json",
    },
  }).then(async (res) => {
    // 200 OK = Successfully retrieved the subscriptions
    // 400 Bad Request
    // 401 Unauthorized
    console.log(`${res.status}:\n${JSON.stringify(await res.json(), null, 2)}`);
    if (res.status >= 200 && res.status < 300) {
      return true;
    } else {
      return false;
    }
  });
}

async function getToken() {
  let clientCredentials = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );
  if (clientCredentials.status >= 200 && clientCredentials.status < 300) {
    let clientCredentialsJson = await clientCredentials.json();
    token = {
      access_token: clientCredentialsJson.access_token,
      expires_in: clientCredentialsJson.expires_in,
      token_type: clientCredentialsJson.token_type,
    };
    return token;
  }
}

await getToken();
let subscriptions = await getSubscriptions();
