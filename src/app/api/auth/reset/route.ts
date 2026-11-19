import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { checkNewPassword } from "@/lib/passwordPolicy";
import { clientIp, tooManyAttempts } from "@/lib/rateLimit";

const findValid = (token: string) =>
  prisma.passwordResetToken.findFirst({
    where: { tokenHash: createHash("sha256").update(token).digest("hex"), usedAt: null, expiresAt: { gt: new Date() } },
  });

/** Is this reset link still usable? Lets the page say so before the user types a password. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  return NextResponse.json({ valid: !!token && !!(await findValid(token)) }, { headers: { "Cache-Control": "no-store" } });
}

/** Set a new password with a reset link. Signs out every device, then signs this one in. */
export async function POST(req: Request) {
  if (tooManyAttempts(`reset:${clientIp(req)}`, 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");

  const row = token ? await findValid(token) : null;
  if (!row) return NextResponse.json({ error: "expired" }, { status: 400 });
  const problem = await checkNewPassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Claim the token first so the same link can't be used twice at once.
  const claimed = await prisma.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return NextResponse.json({ error: "expired" }, { status: 400 });

  const user = await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(password), sessionVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null },
  });
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, user);
  return res;
}
