
import * as log from "jsr:@std/log";
import { Context } from "jsr:@oak/oak/context";
import { getAppToken } from "./twitch-api.ts";

async function sendTwitchChatMessage(message: string, broadcasterId: string, parentMessage: string, appToken: string) {
    const feedbackRes = await fetch("https://api.twitch.tv/helix/chat/messages", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${appToken}`,
            "Client-Id": Deno.env.get("TWITCH_CLIENT_ID"),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            "broadcaster_id": broadcasterId,
            "sender_id": Deno.env.get("TWITCH_USER_ID"),
            "message": message,
            "reply_parent_message_id": parentMessage,
        }),
    });
    if (!feedbackRes.ok) {
        log.error("!sr - Failed to send feedback message", await feedbackRes.text());
        return;
    }
}

function getTrackIdFromMessage(message: string): string {

    const link = message.split(" ")[1];
    if (!link || !link.startsWith("https://open.spotify.com/") || !link.includes("/track/")) {
        return "";
    }
    const trackId = link.split("/track/")[1].split("?")[0];
    return trackId;
}

export async function notificationHandler(context: Context) {
    const data = await context.request.body.json();
    const message = data.event.message.text;

    if (message.startsWith("!sr")) {
        const broadcasterId = data.event.broadcaster_user_id;
        const parentMessage = data.event.message_id;

        const trackId = getTrackIdFromMessage(message);
        if (!trackId) {
            log.info(`!sr - Invalid song request message (message: ${message})`);
            const feedbackMessage = "Invalid song request message. Format: !sr <Spotify track link>";
            await sendTwitchChatMessage(feedbackMessage, broadcasterId, parentMessage, getAppToken());
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
            log.error("!sr - Failed to send song request to song-request service", await res.text());
            const feedbackMessage = "Failed to send song request, please make sure the link provided is valid or try again later.";
            await sendTwitchChatMessage(feedbackMessage, broadcasterId, parentMessage, getAppToken());
            return;
        }

        const trackInfo = await res.json();
        const feedbackMessage = `Song request received: ${trackInfo.trackName} by ${trackInfo.artists}`;
        await sendTwitchChatMessage(feedbackMessage, broadcasterId, parentMessage, getAppToken());
        return;
    }
}

export async function verificationHandler(context: Context) {
    const challenge = (await context.request.body.json()).challenge;
    log.debug(`Received a challenge: ${challenge}`);

    context.response.headers.set("Content-Type", "text/plain");
    context.response.body = challenge;
}

export async function revocationHandler(context: Context) {
    //TODO: handle subscription revocation
    log.error("Subscription revoked", await context.request.body.text());
}

