
import * as jose from "jose";

let secretString = process.env.JWT_SECRET ?? "";
if (!secretString) {
    console.warn("JWT_SECRET not set, using default secret");
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
