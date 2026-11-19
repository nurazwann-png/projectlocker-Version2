import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(_req: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const { commentId } = await params;
  const { userId, isAdmin } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, projectId: true, acknowledged: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await prisma.project.findUnique({
    where: { id: comment.projectId },
    select: { userId: true },
  });
  const isOwner = project?.userId === userId;
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const newAcknowledged = !comment.acknowledged;
  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      acknowledged: newAcknowledged,
      acknowledgedAt: newAcknowledged ? new Date() : null,
    },
    select: { id: true, acknowledged: true, acknowledgedAt: true },
  });
  return NextResponse.json(updated);
}
