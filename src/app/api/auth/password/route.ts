import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { checkNewPassword } from "@/lib/passwordPolicy";
import { tooManyAttempts } from "@/lib/rateLimit";

/** Change password. Every other device is signed out; this one stays signed in. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (tooManyAttempts(`password:${userId}`, 10)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const current = String(body.current ?? "");
  const next = String(body.next ?? "");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyPassword(current, user.passwordHash))) return NextResponse.json({ error: "current" }, { status: 400 });
  if (next === current) return NextResponse.json({ error: "same" }, { status: 400 });
  const problem = await checkNewPassword(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null },
  });
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, updated);
  return res;
}
