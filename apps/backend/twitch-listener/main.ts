import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

const twitchClientId = Deno.env.get("TWITCH_CLIENT_ID");
const userToken = Deno.env.get("TWITCH_USER_TOKEN");
const twitchBroadcasterLogin = "dushkycodes";

const res = await fetch(
  `https://api.twitch.tv/helix/users?login=${twitchBroadcasterLogin}`,
  {
    headers: {
      "Authorization": `Bearer ${userToken}`,
      "Client-Id": twitchClientId!,
    },
  },
);

const data = await res.json();
const broadcasterId = data.data[0].id;

const ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
let sessionId = "";

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  const type = data.metadata.message_type;
  if (type === "session_welcome") {
    sessionId = data.payload.session.id;
    const res = fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userToken}`,
        "Client-Id": twitchClientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "type": "channel.chat.message",
        "version": "1",
        "condition": {
          "broadcaster_user_id": broadcasterId,
          "user_id": broadcasterId,
        },
        "transport": {
          "method": "websocket",
          "session_id": sessionId,
        },
      }),
    });
  } else if (type === "notification") {
    const message = data.payload.event.message.text;
    if (message.startsWith("!sr")) {
      // TODO: handle faulty song requests better and write something in chat as feedback
      const link = message.split(" ")[1];
      if (!link) {
        console.log("No link provided");
        return;
      }
      if (!link.startsWith("https://open.spotify.com/")) {
        console.log("Invalid link provided: " + link);
        return;
      }
      const trackId = link.split("/track/")[1].split("?")[0];
      if (!trackId) {
        console.log("Invalid link provided: " + link);
        return;
      }
      console.log(`Received a song request: ${trackId} by ${data.payload.event.chatter_user_name}`);
      const res = await fetch('http://localhost:8001/song-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId,
          requester: data.payload.event.chatter_user_name,
        }),
      });
      if (!res.ok) {
          console.log(await res.text());
          return;
      }
      return;
    }
    console.log(`Received a non command message: ${message}`);
  } else {
    console.log(`Received an unhandled WS message type: ${type}`);
  }
};

// TODO: add routes for subscribing to a twitch channel

const router = new Router();

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8002 });

console.log("Twitch listener running on http://localhost:8002");
