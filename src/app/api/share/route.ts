import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newShareToken } from "@/lib/portfolio";

const MAX_LINKS = 50;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.shareLink.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(links);
}

/** Every share creates a fresh link (and so a fresh QR code). */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 60) || null : null;

  const count = await prisma.shareLink.count({ where: { userId } });
  if (count >= MAX_LINKS) return NextResponse.json({ error: "limit" }, { status: 409 });

  const link = await prisma.shareLink.create({ data: { userId, token: newShareToken(), label } });
  return NextResponse.json(link, { status: 201 });
}
