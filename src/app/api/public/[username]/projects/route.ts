import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadPublicProjects } from "@/lib/portfolio";

// Owner and admin only — visitors use share links instead.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { userId: viewerUserId, isAdmin } = await auth();
  const owner = await prisma.profile.findUnique({ where: { username }, select: { userId: true } });
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (viewerUserId !== owner.userId && !isAdmin) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  return NextResponse.json(await loadPublicProjects(owner.userId));
}
