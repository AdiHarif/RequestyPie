
import * as jose from "npm:jose";
import * as log from "jsr:@std/log";
import type * as oak from "jsr:@oak/oak";

let secretString = Deno.env.get("JWT_SECRET") ?? "";
if (!secretString) {
    log.warn("JWT_SECRET not set, using default secret");
    secretString = "default-secret";
}

const secret = new TextEncoder().encode(secretString);

export async function createJWT(): Promise<string> {
  const jwt = await new jose.SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(secret);

  return jwt;
}

async function verifyJWT(token: string) {
  return await jose.jwtVerify(token, secret);;
}

export async function verifyJWTMiddleware(ctx: oak.Context, next: () => Promise<unknown>) {
    const token = ctx.request.headers.get("Authorization")?.split(" ")[1];
    if (!token) {
        ctx.response.status = 401;
        ctx.response.body = "Invalid JWT";
        log.warn("Received a request without a JWT");
        return;
    }

    try {
        await verifyJWT(token);
    }
    catch (error: any) {
        ctx.response.status = 401;
        ctx.response.body = "Invalid JWT";
        log.warn("Received a request with invalid JWT", error.code);
        return;
    }
    await next();
}
