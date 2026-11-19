import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ commentId: string }> };

// PATCH — edit comment body (author only)
export async function PATCH(req: Request, { params }: Params) {
  const { commentId } = await params;
  const { userId, isAdmin } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (comment.authorId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 });

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body: body.trim() },
    select: { id: true, body: true },
  });
  return NextResponse.json(updated);
}

// DELETE — author, project owner, or admin
export async function DELETE(_req: Request, { params }: Params) {
  const { commentId } = await params;
  const { userId, isAdmin } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, projectId: true },
  });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await prisma.project.findUnique({
    where: { id: comment.projectId },
    select: { userId: true },
  });

  const isAuthor = comment.authorId === userId;
  const isOwner = project?.userId === userId;
  if (!isAuthor && !isOwner && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Delete replies first, then the comment itself
  await prisma.comment.deleteMany({ where: { parentId: commentId } });
  await prisma.comment.delete({ where: { id: commentId } });

  return NextResponse.json({ ok: true });
}
