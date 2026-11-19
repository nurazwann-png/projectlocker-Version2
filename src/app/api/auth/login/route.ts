import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dummyPasswordHash, normalizeEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { clientIp, tooManyAttempts } from "@/lib/rateLimit";

/** Wrong passwords allowed before the account is locked, and for how long. */
const MAX_FAILED = 10;
const LOCK_MINUTES = 15;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (tooManyAttempts(`login:${clientIp(req)}`, 30)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  // Locked: refuse without even checking the password, so guessing stops working.
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return NextResponse.json({ error: "locked", until: user.lockedUntil.toISOString() }, { status: 423 });
  }

  // Always run one hash check so a missing account and a wrong password look the same.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));

  if (!user || !ok) {
    if (user) {
      const failed = user.failedLogins + 1;
      const lock = failed >= MAX_FAILED;
      await prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
          : { failedLogins: failed },
      });
    }
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  if (user.failedLogins || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, appearance: user.appearance } });
  setSessionCookie(res, user);
  return res;
}
