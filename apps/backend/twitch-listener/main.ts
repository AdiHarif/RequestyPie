
import * as log from "jsr:@std/log";
import { setupLogger } from "@scope/shared";

setupLogger("twitch-listener");

import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

import { verifyMessageSignature } from "./twitch-api.ts";

if (Deno.env.get("TWITCH_LISTENER_SECRET") === undefined) {
  log.critical("Twitch listener secret not set");
  Deno.exit(1);
}

const clientId = Deno.env.get("TWITCH_CLIENT_ID");
const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

//TODO: refresh this token when it expires
const appTokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({
    "client_id": clientId!,
    "client_secret": clientSecret!,
    "grant_type": "client_credentials",
  }),
});

if (!appTokenRes.ok) {
  log.critical("Failed to get app token for Twitch API", await appTokenRes.text());
  Deno.exit(1);
}

const appToken = (await appTokenRes.json()).access_token;
log.info("Received new app token for Twitch API");

const router = new Router();

router.post("/eventsub", async (context) => {
  if (!await verifyMessageSignature(context.request)) {
    log.warn("Received a message with an invalid signature");
    context.response.status = 403;
    return;
  }


  const messageType = context.request.headers.get("twitch-eventsub-message-type");
  log.debug(`Received a message of type ${messageType}`);

  if (messageType === "webhook_callback_verification") {
    const challenge = (await context.request.body.json()).challenge;
    log.debug(`Received a challenge: ${challenge}`);

    context.response.headers.set("Content-Type", "text/plain");
    context.response.body = challenge;
    context.response.status = 200;
    return;
  }

  else if (messageType === "notification") {
    context.response.status = 204;

    const data = await context.request.body.json();
    const message = data.event.message.text;

    if (message.startsWith("!sr")) {
      // TODO: handle faulty song requests better and write something in chat as feedback
      const link = message.split(" ")[1];
      if (!link) {
        log.error("!sr - No link provided");
        return;
      }
      if (!link.startsWith("https://open.spotify.com/")) {
        log.error(`!sr - Invalid link provided (${link})`);
        return;
      }
      if (!link.includes("/track/")) {
        log.error(`!sr - Invalid link provided (${link})`);
        return;
      }
      const trackId = link.split("/track/")[1].split("?")[0];
      if (!trackId) {
        log.error(`!sr - Invalid link provided (${link})`);
        return;
      }
      log.info(`!sr - Received a song request - ${trackId} by ${data.event.chatter_user_name}`);
      const res = await fetch('http://localhost:8001/song-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId,
          requester: data.event.chatter_user_name,
        }),
      });
      if (!res.ok) {
        log.error("!sr - Failed to send song request to song-request service");
        return;
      }

      const trackInfo = await res.json();
      const feedbackMessage = `Song request received: ${trackInfo.trackName} by ${trackInfo.artists}`;

      const feedbackRes = await fetch("https://api.twitch.tv/helix/chat/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${appToken}`,
          "Client-Id": clientId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "broadcaster_id": 587721529, //TODO: get this from the subscription
          "sender_id": Deno.env.get("TWITCH_USER_ID"),
          "message": feedbackMessage,
          "reply_parent_message_id": data.event.message_id,
        }),
      });
      if (!feedbackRes.ok) {
        log.error("!sr - Failed to send feedback message");
        return;
      }
      return;
    }
  }
  else if (messageType === "revocation") {
    //TODO: handle subscription revocation
    log.error("Subscription revoked", await context.request.body.text());
    context.response.status = 204;
    return;
  }
  else {
    log.error(`Unknown message type: ${messageType}`);
    context.response.status = 400;
    return;
  }
});

type Subscription = {
  subscriptionId: string;
  twitchUserId: string;
  requestyPieUserId: string;
}

//TODO: store this in a database
const subscriptions: Subscription[] = [];

router.post("/subscriptions", async (context) => { // * subscribe to a (new) twitch channel
  const { twitchUserId, requestyPieUserId } = await context.request.body.json();

  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${appToken}`,
      "Client-Id": clientId!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      "type": "channel.chat.message",
      "version": "1",
      "condition": {
        "broadcaster_user_id": twitchUserId,
        "user_id": Deno.env.get("TWITCH_USER_ID"),
      },
      "transport": {
        "method": "webhook",
        "callback": `${Deno.env.get("TWITCH_LISTENER_URL")}/eventsub`,
        "secret": `${Deno.env.get("TWITCH_LISTENER_SECRET")}`,
      },
    }),
  });

  if (!res.ok) {
    log.error("Failed to subscribe to chat messages", await res.text());
    context.response.status = 500;
    return;
  }

  const subscriptionId = (await res.json()).data[0].id;
  subscriptions.push({ subscriptionId, twitchUserId, requestyPieUserId });
  log.info(`Subscribed to chat messages from ${twitchUserId} for user ${requestyPieUserId}`);

  context.response.status = 201;
  context.response.body = { subscriptionId };

});

router.delete("/subscriptions/:id", async (context) => { // * unsubscribe from a twitch channel
  const subscriptionId = context.params.id;

  const subscription = subscriptions.find((sub) => sub.subscriptionId === subscriptionId);
  if (!subscription) {
    log.error(`Subscription with id ${subscriptionId} not found`);
    context.response.status = 404;
    return;
  }

  const res = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${appToken}`,
      "Client-Id": clientId!,
    },
  });

  if (!res.ok) {
    log.error("Failed to unsubscribe from chat messages", await res.text());
    context.response.status = 500;
    return;
  }

  subscriptions.splice(subscriptions.indexOf(subscription), 1);
  log.info(`Unsubscribed from chat messages from ${subscription.twitchUserId} for user ${subscription.requestyPieUserId}`);

  context.response.status = 204;
});


const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8002 });

log.info("Twitch listener running on http://localhost:8002");
