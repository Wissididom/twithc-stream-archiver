import "dotenv/config";
import * as readline from "readline";

let token = {
  access_token: null,
  expires_in: null,
  token_type: null,
};

// https://dev.twitch.tv/docs/api/reference/#delete-eventsub-subscription
async function deleteSubscription(id) {
  return await fetch(
    `https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        "Content-Type": "application/json",
      },
    },
  ).then(async (res) => {
    // 204 No Content = Successfully deleted the subscription
    // 400 Bad Request - The id query parameter is required
    // 401 Unauthorized
    // 404 Not Found - The subscription was not found
    // console.log(`${res.status}:\n${JSON.stringify(await res.json(), null, 2)}`);
    console.log(`${res.status}:\n${await res.text()}`);
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

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
readlineInterface.question(
  "Enter the subscription id of the  EventSub-Event you wnat to delete:\n",
  async (subscription) => {
    await getToken();
    await deleteSubscription(subscription);
    readlineInterface.close();
  },
);
