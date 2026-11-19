import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, isAdmin } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id }, select: { userId: true } });
  if (!project || (project.userId !== userId && !isAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const views = await prisma.projectView.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, viewerName: true, viewerId: true, createdAt: true },
  });

  // Group by viewer (by viewerId if logged in, else by name)
  const map = new Map<string, { viewerName: string; viewerId: string | null; count: number; lastSeen: string }>();
  for (const v of views) {
    const key = v.viewerId ?? `guest:${v.viewerName}`;
    if (map.has(key)) {
      map.get(key)!.count++;
    } else {
      map.set(key, { viewerName: v.viewerName, viewerId: v.viewerId, count: 1, lastSeen: v.createdAt.toISOString() });
    }
  }

  return NextResponse.json({
    totalViews: views.length,
    uniqueViewers: map.size,
    viewers: Array.from(map.values()).sort((a, b) => b.count - a.count),
  });
}
