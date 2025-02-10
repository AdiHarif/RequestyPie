
import * as log from "jsr:@std/log";
import { setupLogger } from "@scope/shared";

setupLogger("twitch-listener");

import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

import { verifyMessageSignature } from "./twitch-api.ts";

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { eventSubSchema } from "./schema.ts";
import pg from "npm:pg";
const { Pool } = pg;

import * as es from "./eventsub.ts";

if (Deno.env.get("TWITCH_LISTENER_SECRET") === undefined) {
  log.critical("Twitch listener secret not set");
  Deno.exit(1);
}

export const db = drizzle({
  client: new Pool({
    connectionString: Deno.env.get("DATABASE_URL"),
  }),
  schema: { eventSubSchema },
});

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

  context.response.status = 204;

  switch (messageType) {
    case "webhook_callback_verification":
      es.verificationHandler(context);
      return;
    case "notification":
      es.notificationHandler(context, appToken);
      return;
    case "revocation":
      es.revocationHandler(context);
      return;
    default:
      log.error(`Unknown message type: ${messageType}`);
      context.response.status = 400;
      return;
  }
});


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

  const eventSubId = (await res.json()).data[0].id;
  // TODO: handle db failure
  await db.insert(eventSubSchema).values({ eventSubId, requestyPieUserId });
  log.info(`Subscribed to chat messages from ${twitchUserId} for user ${requestyPieUserId}`);

  context.response.status = 201;
  context.response.body = { eventSubId };
});

router.delete("/subscriptions/:id", async (context) => { // * unsubscribe from a twitch channel
  const eventSubId = context.params.id;

  const res = await fetch(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${eventSubId}`, {
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

  const dbRes = await db.delete(eventSubSchema).where(eq(eventSubSchema.eventSubId, eventSubId)).returning();
  if (dbRes.length === 0) {
    log.error(`EventSub with id ${eventSubId} not found`);
    context.response.status = 404;
    return;
  }

  log.info(`Unsubscribed from chat messages for requestyPie user ${dbRes[0].requestyPieUserId}`);

  context.response.status = 204;
});


const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8002 });

log.info("Twitch listener running on http://localhost:8002");
