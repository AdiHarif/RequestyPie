
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

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

interface SongRequest {
  trackId: string;
  requester: string;
  trackInfo: any;
};

const requests = new Map<string, SongRequest>();

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

  const requestsArray = Array.from(requests.entries());
  context.response.body = requestsArray;
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

  const requestId = crypto.randomUUID().substring(0, 8);

  requests.set(requestId, { trackId, requester, trackInfo });

  console.log(requests.size);

  context.response.status = 201;
  context.response.body = requestId;
});

router.delete("/song-request/:requestId", async (context) => {
  // const { requestId } = await context.request.body.json();
  const requestId = context.params.requestId;
  if (requestId === undefined) {
    context.response.status = 400;
    context.response.body = "Bad request";
    return;
  }
  // TODO: authenticate user
  requests.delete(requestId);
  console.log(requests.size);
  context.response.status = 204;
});

router.put("/song-request/:id/approve", async (context) => {
  // TODO: do better authentication here
  const userToken = await context.cookies.get("userToken")!;
  const requestId = context.params.id;
  const trackId = requests.get(requestId)?.trackId;

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
  context.response.body = 'Song queued!';
  requests.delete(requestId);
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8001 });

console.log("Server running on http://localhost:8001");
