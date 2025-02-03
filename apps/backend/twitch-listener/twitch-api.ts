
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