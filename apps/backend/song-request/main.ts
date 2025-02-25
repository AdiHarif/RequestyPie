
import * as log from "jsr:@std/log";
import { setupLogger,  verifyJWTMiddleware} from "@scope/shared";

setupLogger("song-request");

import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray } from "drizzle-orm";
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

const protectedRouter = new Router();
protectedRouter.use(verifyJWTMiddleware);

async function refreshUserToken(refreshToken: string) {
  const res = await fetch(spotifyTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientID}:${clientSecret}`)}`,
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });

  if (!res.ok) {
    log.error("GET /song-request - Failed to refresh userToken", await res.text());
    return { newToken: "", newRefreshToken: "", expirationDate: "" };
  }

  const userTokenRes = await res.json();
  const newToken = userTokenRes.access_token;
  const expiresIn = userTokenRes.expires_in;

  let newRefreshToken = userTokenRes.refresh_token;
  if (!newRefreshToken) {
    newRefreshToken = refreshToken;
  }

  return { newToken, newRefreshToken, expirationDate: Date.now() + (expiresIn * 1000) };
}


protectedRouter.get("/song-request", async (context) => {
  let userToken = await context.cookies.get("userToken")!;
  if (!userToken) {
    log.error("GET /song-request - Request does not contain userToken cookie");
    context.response.status = 401;
    context.response.body = "Unauthorized";
    return;
  }

  if (Date.now() > parseInt((await context.cookies.get("expirationDate"))!)) {
    log.info("GET /song-request - UserToken has expired, refreshing");
    const refreshToken = await context.cookies.get("refreshToken");

    const { newToken, newRefreshToken, expirationDate } = await refreshUserToken(refreshToken!);

    if (!newToken) {
      log.error("GET /song-request - Failed to refresh userToken");
      context.response.status = 401;
      context.response.body = "Unauthorized";
      return;
    }

    userToken = newToken;
    context.cookies.set("userToken", newToken, { sameSite: "lax" });
    context.cookies.set("refreshToken", newRefreshToken, { sameSite: "lax" });
    context.cookies.set("expirationDate", expirationDate.toString(), { sameSite: "lax" });
  }

  const userRes = await fetch(`${spotifyBaseUrl}/me`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    }
  });
  if (!userRes.ok) {
    log.error("GET /song-request - userToken is invalid");
    context.response.status = 401;
    context.response.body = "Unauthorized";
    return;
  }

  const username = (await userRes.json()).display_name;

  const requests = await db.select().from(songRequestSchema).where(eq(songRequestSchema.status, "pending"));
  context.response.body = { requests, username };

  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
});

protectedRouter.post("/song-request", async (context) => {
  const { trackId, requester } = await context.request.body.json();

  const trackRes = await fetch(`${spotifyBaseUrl}/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${appToken}`,
    }
  });

  if (!trackRes.ok) {
    log.error("POST /song-request - trackId is invalid");
    context.response.status = 404;
    context.response.body = "Track not found";
    return;
  }

  const trackInfo = await trackRes.json();

  await db.insert(songRequestSchema).values({
    trackId,
    requester,
    status: "pending",
    trackInfo
  });

  context.response.status = 201;
  context.response.body = {
    trackName: trackInfo.name,
    artists: trackInfo.artists.map((artist: any) => artist.name).join(", "),
  };
});

protectedRouter.patch("/song-request", async (context) => {
  let userToken = await context.cookies.get("userToken");
  if (!userToken) {
    log.error("PATCH /song-request - Request does not contain userToken cookie");
    context.response.status = 401;
    context.response.body = "Unauthorized";
    return;
  }

  if (Date.now() > parseInt((await context.cookies.get("expirationDate"))!)) {
    log.info("PATCH /song-request - UserToken has expired, refreshing");
    const refreshToken = await context.cookies.get("refreshToken");

    const { newToken, newRefreshToken, expirationDate } = await refreshUserToken(refreshToken!);

    if (!newToken) {
      log.error("PATCH /song-request - Failed to refresh userToken");
      context.response.status = 401;
      context.response.body = "Unauthorized";
      return;
    }

    userToken = newToken;
    context.cookies.set("userToken", newToken, { sameSite: "lax" });
    context.cookies.set("refreshToken", newRefreshToken, { sameSite: "lax" });
    context.cookies.set("expirationDate", expirationDate.toString(), { sameSite: "lax" });
  }

  const { requestIds, status } = await context.request.body.json();
  if (!requestIds || !(status !== "approved" || status !== "denied")) {
    log.error("PATCH /song-request - requestIds or status is invalid");
    log.debug(requestIds, status);
    context.response.status = 400;
    context.response.body = "Bad request";
    return;
  }

  if (status === "approved") {
    const promises = (await db.select({trackId: songRequestSchema.trackId}).from(songRequestSchema).where(inArray(songRequestSchema.id, requestIds)))
      .map((row) =>
        fetch(`${spotifyBaseUrl}/me/player/queue?uri=spotify:track:${row.trackId}`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })
      );
    const results = await Promise.all(promises);

    // TODO: better handle failures
    for (const res of results) {
      if (!res.ok) {
        log.error("PATCH /song-request - Failed to queue song", await res.text());
        context.response.status = 500;
        return;
      }
    }
  }

  await db.update(songRequestSchema).set({ status }).where(inArray(songRequestSchema.id, requestIds));

  log.info(`PATCH /song-request - ${(status === "approved" ? "Approved" : "Denied")} ${requestIds.length} request(s)`);
  context.response.status = 204;

});

const app = new Application();
app.use(protectedRouter.routes());
app.use(protectedRouter.allowedMethods());

app.listen({ port: 8001 });

log.info("Server running on http://localhost:8001");
