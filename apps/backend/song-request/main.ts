
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { songRequestSchema } from "./schema.ts";
import pg from "npm:pg";
const { Pool } = pg;

const clientID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const spotifyBaseUrl = "https://api.spotify.com/v1";
const spotifyTokenUrl = "https://accounts.spotify.com/api/token";

const res = await fetch(spotifyTokenUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${btoa(`${clientID}:${clientSecret}`)}`,
  },
  body: "grant_type=client_credentials",
});
const appToken = (await res.json()).access_token;

export const db = drizzle({
  client: new Pool({
    connectionString: Deno.env.get("DATABASE_URL"),
  }),
  schema: { songRequestSchema },
});

const router = new Router();

router.get("/song-request", async (context) => {
  const userToken = await context.cookies.get("userToken")!;
  if (!userToken) {
    console.log("Token is empty");
    context.response.status = 401;
    context.response.body = "Unauthorized";
    return;
  }
  const userRes = await fetch(`${spotifyBaseUrl}/me`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    }
  });
  if (!userRes.ok) {
    // console.log(userRes);
    console.log(await userRes.text());
    context.response.status = 401;
    context.response.body = "Unauthorized";
    return;
  }

  const requests = await db.select().from(songRequestSchema).where(eq(songRequestSchema.status, "pending"));
  context.response.body = requests;

  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
});

router.post("/song-request", async (context) => {
  const { trackId, requester } = await context.request.body.json();

  const trackRes = await fetch(`${spotifyBaseUrl}/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${appToken}`,
    }
  });
  if (!trackRes.ok) {
    console.log(await trackRes.text());
    context.response.status = 404;
    context.response.body = "Track not found";
    return;
  }

  const trackInfo = await trackRes.json();

  const requestId = (await db.insert(songRequestSchema).values({
    trackId,
    requester,
    status: "pending",
    trackInfo
  }).returning({ insertedId: songRequestSchema.id}))[0];

  context.response.status = 201;
  context.response.body = requestId;
});

router.delete("/song-request/:requestId", async (context) => {
  const requestId = parseInt(context.params.requestId);
  if (requestId === undefined) {
    context.response.status = 400;
    context.response.body = "Bad request";
    return;
  }
  // TODO: authenticate user
  await db.update(songRequestSchema).set({ status: "denied" }).where(eq(songRequestSchema.id, requestId));
  context.response.status = 204;
});

router.put("/song-request/:id/approve", async (context) => {
  // TODO: do better authentication here
  const userToken = await context.cookies.get("userToken")!;
  const requestId = parseInt(context.params.id);

  // TODO: check if request exists
  const { trackId } = (await db.select().from(songRequestSchema).where(eq(songRequestSchema.id, requestId)))[0];

  const queueRequest = new Request(`${spotifyBaseUrl}/me/player/queue?uri=spotify:track:${trackId}`, {
    method: "POST",
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  const queueRes = await fetch(queueRequest);
  if (!queueRes.ok) {
    console.log(await queueRes.text());
    return;
  }

  await db.update(songRequestSchema).set({ status: "approved" }).where(eq(songRequestSchema.id, requestId));

  context.response.body = 'Song queued!';
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8001 });

console.log("Server running on http://localhost:8001");
