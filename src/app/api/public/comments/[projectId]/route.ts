import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { userId, isAdmin } = await auth();

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project) return NextResponse.json([], { status: 200 });

  const isOwner = !!userId && userId === project.userId;

  if (isOwner || isAdmin) {
    const comments = await prisma.comment.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: { id: true, parentId: true, authorId: true, authorName: true, body: true, createdAt: true, acknowledged: true, acknowledgedAt: true },
    });
    return NextResponse.json(comments);
  }

  if (userId) {
    // Authenticated commenter — return their root comments + replies to their root comments + their replies
    const myRootComments = await prisma.comment.findMany({
      where: { projectId, parentId: null, authorId: userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, parentId: true, authorId: true, authorName: true, body: true, createdAt: true, acknowledged: true, acknowledgedAt: true },
    });
    const myRootIds = myRootComments.map((c) => c.id);
    const replies = myRootIds.length > 0
      ? await prisma.comment.findMany({
          where: { projectId, parentId: { in: myRootIds } },
          orderBy: { createdAt: "asc" },
          select: { id: true, parentId: true, authorId: true, authorName: true, body: true, createdAt: true, acknowledged: true, acknowledgedAt: true },
        })
      : [];
    // Also include threads they replied to (in other root comments)
    const myReplies = await prisma.comment.findMany({
      where: {
        projectId,
        authorId: userId,
        parentId: { not: null },
        NOT: myRootIds.length > 0 ? { parentId: { in: myRootIds } } : undefined,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, parentId: true, authorId: true, authorName: true, body: true, createdAt: true, acknowledged: true, acknowledgedAt: true },
    }).catch(() => []);
    const extraParentIds = [...new Set(myReplies.map((r) => r.parentId).filter(Boolean) as string[])];
    const extraParents = extraParentIds.length > 0
      ? await prisma.comment.findMany({
          where: { id: { in: extraParentIds } },
          select: { id: true, parentId: true, authorId: true, authorName: true, body: true, createdAt: true, acknowledged: true, acknowledgedAt: true },
        })
      : [];
    const all = [...myRootComments, ...replies, ...myReplies, ...extraParents];
    const deduped = Array.from(new Map(all.map((c) => [c.id, c])).values())
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return NextResponse.json(deduped);
  }

  // Unauthenticated guests see nothing
  return NextResponse.json([]);
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { userId, isAdmin } = await auth();
  const { authorName, body, parentId } = await req.json();
  if (!authorName?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Name and body required" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { id: true, parentId: true } });
    if (!parent || parent.parentId) {
      return NextResponse.json({ error: "Invalid parent" }, { status: 400 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      projectId,
      parentId: parentId ?? null,
      authorId: userId ?? null,
      authorName: authorName.trim().slice(0, 60),
      body: body.trim().slice(0, 500),
    },
    select: { id: true, parentId: true, authorId: true, authorName: true, body: true, createdAt: true, acknowledged: true, acknowledgedAt: true },
  });
  return NextResponse.json(comment, { status: 201 });
}
