import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/sessionToken";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(expected, actual);
}

// A real hash, so a login for an unknown email takes as long as a wrong password.
let dummyHash: Promise<string> | null = null;
export const dummyPasswordHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

/** Emails listed in ADMIN_EMAIL (comma-separated) get admin access. */
export function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** The signed-in user for this request, read from the session cookie. */
export async function auth(): Promise<{ userId: string | null; isAdmin: boolean }> {
  const claims = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims) return { userId: null, isAdmin: false };
  // Check the account still exists and the session hasn't been revoked.
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { sessionVersion: true, email: true } });
  if (!user || user.sessionVersion !== claims.ver) return { userId: null, isAdmin: false };
  return { userId: claims.sub, isAdmin: isAdminEmail(user.email) };
}

export function setSessionCookie(res: NextResponse, user: { id: string; email: string; sessionVersion: number }) {
  res.cookies.set(SESSION_COOKIE, createSessionToken({ sub: user.id, ver: user.sessionVersion }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

/** Account fields that are safe to send to the browser. */
export const PUBLIC_USER_FIELDS = { id: true, email: true, name: true, appearance: true } as const;
