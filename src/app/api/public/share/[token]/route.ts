import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { displayNameFor, loadPublicProfile, loadPublicProjects } from "@/lib/portfolio";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (link.status !== "active") return NextResponse.json({ error: "closed" }, { status: 403 });

  const [profile, projects, displayName] = await Promise.all([
    loadPublicProfile(link.userId),
    loadPublicProjects(link.userId),
    displayNameFor(link.userId),
    prisma.shareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } }),
  ]);

  return NextResponse.json({ profile: profile ?? {}, projects, displayName, ownerId: link.userId });
}
