import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { userId } = await auth();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (!project) return NextResponse.json({ ok: false }, { status: 404 });

  // Don't count the owner viewing their own project
  if (userId && userId === project.userId) return NextResponse.json({ ok: true });

  let viewerName = "Guest";
  if (userId) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { username: true },
    });
    viewerName = profile?.username ?? "Member";
  }

  await prisma.projectView.create({
    data: { projectId, viewerId: userId ?? null, viewerName },
  });

  return NextResponse.json({ ok: true });
}
