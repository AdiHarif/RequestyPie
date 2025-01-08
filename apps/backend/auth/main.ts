
import { Application } from "jsr:@oak/oak/application";
import { Router } from "jsr:@oak/oak/router";

const clientID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const spotifyTokenUrl = "https://accounts.spotify.com/api/token";
const spotifyUserAuthUrl = "https://accounts.spotify.com/authorize";

const redirectUri = "http://localhost:8000/callback";

const router = new Router();

router.get("/login", async (context) => {
    const scope = 'user-read-private user-modify-playback-state';

    // TODO: consider generating a random state to prevent CSRF attacks
    const queryParams = {
      response_type: 'code',
      client_id: clientID,
      scope: scope,
      redirect_uri: redirectUri,
    };

    const queryString = new URLSearchParams(queryParams).toString();
    context.response.redirect(`${spotifyUserAuthUrl}?${queryString}`);
});

router.get("/callback", async (context) => {
  const code = context.request.url.searchParams.get('code');

  const userToken = await fetch(`${spotifyTokenUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${btoa(`${clientID}:${clientSecret}`)}`
    },
    body: `grant_type=authorization_code&code=${code}&redirect_uri=${redirectUri}`,
  }).then((res) => res.json()).then((data) => data.access_token);

  context.cookies.set("userToken", userToken, { sameSite: "lax" });
  context.response.redirect("http://localhost:8001/song-request");

});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8000 });

console.log("Server running on http://localhost:8000");
