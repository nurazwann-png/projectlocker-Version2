import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth";
import { appUrl, resetEmail, sendMail } from "@/lib/mailer";
import { clientIp, tooManyAttempts } from "@/lib/rateLimit";

const RESET_MINUTES = 30;

/**
 * Emails a one-time reset link. The answer is the same whether or not the email
 * is registered, so this can't be used to find out who has an account.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));
  if (tooManyAttempts(`forgot:${clientIp(req)}`, 10, 60 * 60_000) || tooManyAttempts(`forgot:${email}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } }) : null;
  if (user) {
    const token = randomBytes(32).toString("base64url");
    await prisma.$transaction([
      // Only the newest link works.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
        },
      }),
    ]);
    try {
      await sendMail({ to: user.email, ...resetEmail(user.name, `${appUrl()}/reset-password?token=${token}`, RESET_MINUTES) });
    } catch (e) {
      console.error("Password reset email failed:", (e as Error).message);
      return NextResponse.json({ error: "mail_failed" }, { status: 503 });
    }
  }
  return NextResponse.json({ ok: true });
}
