import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth, setSessionCookie } from "@/lib/auth";

/** Sign out every other device: old session cookies stop working, this one is reissued. */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, user);
  return res;
}
