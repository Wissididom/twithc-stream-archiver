# twitch-stream-archiver

## Prerequisites

- NodeJS v18+
- Twitch Client ID
- Twitch Client Secret
- Port on the server where Twitch sends the webhooks to
- EventSub Secret (must be between 1 and 100 chars in length and can be freely chosen by you)
- Hostname or IP where Twitch sends the webhooks to (`URL` environment variable or value in the `.env` file)
- Storage Path on Server where the Streams will be written to

## Setup

1. Clone this repo
2. Do `npm i` or `npm install` to install `dotenv`, `express`, `helmet` and `@filiptypjeu/streamlink`
3. Copy `example.env` to `.env` and fill out it's values
4. Run `node index.js` or `npm start` and let it run in the background (Twitch sends a verification request after creating the EventSub subscription)
5. Run `node create-online-eventsub-subscription.js` and enter the name of the channel you want to create an EventSub subscription of `stream.online` or `node create-offline-eventsub-subscription.js` for `stream.offline`
6. Twitch now tries to send an verification request to your specified URL and if that succeeds will send you a POST request on each `stream.online` and `stream.offline` event
