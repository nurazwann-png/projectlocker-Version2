import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, PUBLIC_USER_FIELDS } from "@/lib/auth";

/** The signed-in account, or { user: null }. */
export async function GET() {
  const { userId, isAdmin } = await auth();
  if (!userId) return NextResponse.json({ user: null }, { headers: { "Cache-Control": "no-store" } });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_FIELDS });
  return NextResponse.json({ user: user && { ...user, isAdmin } }, { headers: { "Cache-Control": "no-store" } });
}

/** Update the display name and/or saved appearance. */
export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const data: Prisma.UserUpdateInput = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 60);
  if (body.appearance && typeof body.appearance === "object" && JSON.stringify(body.appearance).length < 2000) {
    data.appearance = body.appearance as Prisma.InputJsonValue;
  }
  const user = await prisma.user.update({ where: { id: userId }, data, select: PUBLIC_USER_FIELDS });
  return NextResponse.json({ user });
}
