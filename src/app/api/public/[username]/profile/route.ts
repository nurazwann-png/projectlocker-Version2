import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayNameFor, loadPublicProfile } from "@/lib/portfolio";

// Portfolios are private: visitors need an active share link (/s/<token>).
// This route only serves the owner (previewing) and the admin.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { userId: viewerUserId, isAdmin } = await auth();
  const owner = await prisma.profile.findUnique({ where: { username }, select: { userId: true } });
  if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewerIsAdmin = isAdmin;
  if (viewerUserId !== owner.userId && !viewerIsAdmin) {
    return NextResponse.json({ error: "private" }, { status: 403 });
  }

  const [profile, displayName] = await Promise.all([loadPublicProfile(owner.userId), displayNameFor(owner.userId)]);
  return NextResponse.json({ ...profile, displayName, ownerId: owner.userId, viewerIsAdmin });
}
