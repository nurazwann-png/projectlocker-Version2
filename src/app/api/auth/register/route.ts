import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, normalizeEmail, setSessionCookie, PUBLIC_USER_FIELDS } from "@/lib/auth";
import { adoptLegacyData } from "@/lib/legacyAccounts";
import { checkNewPassword } from "@/lib/passwordPolicy";
import { clientIp, tooManyAttempts } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (tooManyAttempts(`register:${clientIp(req)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 60);
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  if (!name) return NextResponse.json({ error: "name" }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "email" }, { status: 400 });
  const problem = await checkNewPassword(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { ...PUBLIC_USER_FIELDS, sessionVersion: true },
    });
    await adoptLegacyData(email, user.id).catch(() => {});
    const { sessionVersion: _v, ...publicUser } = user;
    const res = NextResponse.json({ user: publicUser }, { status: 201 });
    setSessionCookie(res, user);
    return res;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "taken" }, { status: 409 });
    }
    throw e;
  }
}
