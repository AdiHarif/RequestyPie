
import * as log from "jsr:@std/log";
import { Request } from "jsr:@oak/oak/request";

import { timingSafeEqual, createHmac } from "node:crypto";
import { Buffer } from "node:buffer";

export async function verifyMessageSignature(request: Request): Promise<boolean> {
    const hmacMessage = await getHmacMessage(request);
    if (hmacMessage === "") {
        return false;
    }

    const hmac = 'sha256=' + getHmac(Deno.env.get("TWITCH_LISTENER_SECRET")!, hmacMessage);
    return timingSafeEqual(
        Buffer.from(hmac),
        Buffer.from(request.headers.get("Twitch-Eventsub-Message-Signature")!)
    );
}

async function getHmacMessage(request: Request): Promise<string> {
    const rawBody = await request.body.text();
    if (request.headers.get("Twitch-Eventsub-Message-Id") === null ||
        request.headers.get("Twitch-Eventsub-Message-Timestamp") === null ||
        rawBody === null) {
        return "";
    }

    return (request.headers.get("Twitch-Eventsub-Message-Id")! +
        request.headers.get("Twitch-Eventsub-Message-Timestamp")! +
        rawBody);
}

function getHmac(secret: string, message: string): string {
    return createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}


let appToken: string = "";

export function getAppToken(): string {
    return appToken;
}

async function fetchAppToken() {
  const clientId = Deno.env.get("TWITCH_CLIENT_ID");
  const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET");

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
    setTimeout(() => {
      fetchAppToken();
    }, 3600000); // Retry in 1 hour
  }

  const appTokenData = await appTokenRes.json();
  appToken = appTokenData.access_token;
  log.info("Received new app token for Twitch API");

  const expiresIn = appTokenData.expires_in;
  const expirationDate = new Date(Date.now() + expiresIn * 1000);
  log.info(`App token expires on ${expirationDate.toISOString()}`);

  setTimeout(() => {
    fetchAppToken();
  }, (expiresIn - 3600) * 1000); // Refresh 1 hour before expiration
}

export async function initializeAppToken() {
    await fetchAppToken();
}