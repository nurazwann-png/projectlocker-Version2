import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dummyPasswordHash, normalizeEmail, setSessionCookie, verifyPassword } from "@/lib/auth";
import { clientIp, tooManyAttempts } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (tooManyAttempts(`login:${clientIp(req)}`, 20) || tooManyAttempts(`login:${email}`, 10)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  // Always run one hash check so a missing account and a wrong password look the same.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
  if (!user || !ok) return NextResponse.json({ error: "invalid" }, { status: 401 });

  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, appearance: user.appearance } });
  setSessionCookie(res, user);
  return res;
}
