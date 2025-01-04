import "dotenv/config";
import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import { Streamlink } from "@filiptypjeu/streamlink";
import fs from "fs";
import path from "path";

import {
  getUserById,
  getUserByLogin,
  getStreams,
  convertDate,
  getSubscriptions,
  registerStreamOnlineEvent,
  registerStreamOfflineEvent,
} from "./utils.js";

const app = express();

// Notification request headers
const TWITCH_MESSAGE_ID = "Twitch-Eventsub-Message-Id".toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP =
  "Twitch-Eventsub-Message-Timestamp".toLowerCase();
const TWITCH_MESSAGE_SIGNATURE =
  "Twitch-Eventsub-Message-Signature".toLowerCase();
const MESSAGE_TYPE = "Twitch-Eventsub-Message-Type".toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";
const MESSAGE_TYPE_NOTIFICATION = "notification";
const MESSAGE_TYPE_REVOCATION = "revocation";

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = "sha256=";

let token = {
  access_token: null,
  expires_in: null,
  token_type: null,
};

let messageMapping = {};

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

async function runStreamlink(login, output) {
  console.log(`Running Streamlink for channel ${login}`);
  var sl = new Streamlink(`https://twitch.tv/${login}`).output(output).begin();
  return sl;
}

app.use(helmet());

app.use(
  express.raw({
    type: "application/json",
  }),
);

const auth = (req, res, next) => {
  if (req.query.authKey && req.query.authKey == process.env.AUTHORIZATION_KEY) {
    next();
  } else {
    res.send("Invalid authorization code");
  }
};

app.use("/", auth, express.static("public"));

app.get("/get-subscriptions", auth, async (req, res) => {
  await getToken();
  const subscriptions = await getSubscriptions(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
  );
  res
    .set("Content-Type", "application/json")
    .status(200)
    .send(JSON.stringify(subscriptions));
});

app.get("/get-user-by-login/:broacasterLogin", auth, async (req, res) => {
  await getToken();
  const user = await getUserByLogin(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
    req.params.broadcasterLogin,
  );
  res
    .set("Content-Type", "application/json")
    .status(200)
    .send(JSON.stringify(user));
});

app.get("/subscribe-online/:broacasterId", auth, async (req, res) => {
  await getToken();
  const eventSubApiResponse = await registerStreamOnlineEvent(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
    req.params.broadcasterId,
  );
  res
    .set("Content-Type", "application/json")
    .status(200)
    .send(JSON.stringify(eventSubApiResponse));
});

app.get("/subscribe-offline/:broacasterId", auth, async (req, res) => {
  await getToken();
  const eventSubApiResponse = await registerStreamOfflineEvent(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
    req.params.broadcasterId,
  );
  res
    .set("Content-Type", "application/json")
    .status(200)
    .send(JSON.stringify(eventSubApiResponse));
});

app.get("/get-streams/:broadcasterId/", auth, async (req, res) => {
  let user = await getUserById(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
    req.params.broadcasterId,
  );
  user.stream = await getStream(
    process.env.TWITCH_CLIENT_ID,
    token.access_token,
    notification.event.broadcaster_user_id,
  );
  res.redirect(
    `http://${req.headers.host}/media/${req.params.broadcasterId}/${req.params.startedAt}.mkv?authKey=${req.query.authKey}`,
  );
});

app.post("/", async (req, res) => {
  let secret = process.env.EVENTSUB_SECRET;
  let message =
    req.headers[TWITCH_MESSAGE_ID] +
    req.headers[TWITCH_MESSAGE_TIMESTAMP] +
    req.body;
  let hmac =
    HMAC_PREFIX +
    crypto.createHmac("sha256", secret).update(message).digest("hex");

  if (verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
    // Get JSON object from body, so you can process the message.
    let notification = JSON.parse(req.body);
    switch (req.headers[MESSAGE_TYPE]) {
      case MESSAGE_TYPE_NOTIFICATION:
        if (notification.subscription.type == "stream.online") {
          // https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#streamonline
          await getToken();
          let stream = await getStream(
            process.env.TWITCH_CLIENT_ID,
            token.access_token,
            notification.event.broadcaster_user_id,
          );
          if (stream) {
            fs.writeFileSync(
              path.join(
                "./public/media",
                notification.event.broadcaster_user_id,
                `${convertDate(new Date(stream.started_at))}.json`,
              ),
              JSON.stringify(stream, null, 4),
            );
          }
          runStreamlink(
            notification.event.broadcaster_user_login,
            path.join(
              "./public/media",
              notification.event.broadcaster_user_id,
              `${convertDate(stream ? new Date(stream.started_at) : new Date())}.mkv`,
            ),
          );
          console.log(
            `stream.online - ${notification.event.broadcaster_user_name} (${notification.event.broadcaster_user_login})`,
          );
        } else if (notification.subscription.type == "stream.offline") {
          console.log(
            `stream.offline - ${notification.event.broadcaster_user_name} (${notification.event.broadcaster_user_login})`,
          );
        } else {
          console.log(`Event type: ${notification.subscription.type}`);
          console.log(JSON.stringify(notification.event, null, 4));
        }
        res.sendStatus(204);
        break;
      case MESSAGE_TYPE_VERIFICATION:
        res
          .set("Content-Type", "text/plain")
          .status(200)
          .send(notification.challenge);
        break;
      case MESSAGE_TYPE_REVOCATION:
        res.sendStatus(204);
        console.log(`${notification.subscription.type} notifications revoked!`);
        console.log(`reason: ${notification.subscription.status}`);
        console.log(
          `condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`,
        );
        break;
      default:
        res.sendStatus(204);
        console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        break;
    }
  } else {
    console.log("403 - Signatures didn't match.");
    res.sendStatus(403);
  }
});

function verifyMessage(hmac, verifySignature) {
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(verifySignature),
  );
}

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Server ready on port ${port}.`));

export default app;
