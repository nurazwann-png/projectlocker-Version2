import { createHmac, timingSafeEqual } from "crypto";

/** Name of the httpOnly cookie that holds the signed session. */
export const SESSION_COOKIE = "pl_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionClaims {
  sub: string; // user id
  ver: number; // User.sessionVersion when issued; bumping it signs out every device
  exp: number; // unix seconds
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters)");
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

export function createSessionToken(claims: Omit<SessionClaims, "exp">): string {
  const body = Buffer.from(JSON.stringify({ ...claims, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Returns the claims if the token is genuine and unexpired, otherwise null. */
export function verifySessionToken(token: string | undefined | null): SessionClaims | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  try {
    const expected = Buffer.from(sign(body));
    const given = Buffer.from(mac);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionClaims;
    if (typeof claims.sub !== "string" || typeof claims.exp !== "number") return null;
    if (claims.exp < Date.now() / 1000) return null;
    return claims;
  } catch {
    return null;
  }
}
