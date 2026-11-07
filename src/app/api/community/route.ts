import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Open to everyone for now — sign-in will be required again later.
export async function GET() {
  const profiles = await prisma.profile.findMany({
    where: { username: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { userId: true, username: true, bio: true, avatarUrl: true },
  });

  const counts = await Promise.all(
    profiles.map((p) => prisma.project.count({ where: { userId: p.userId } }))
  );

  return NextResponse.json(
    profiles.map((p, i) => ({ username: p.username, bio: p.bio, avatarUrl: p.avatarUrl, projectCount: counts[i] }))
  );
}
