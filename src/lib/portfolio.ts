import { randomBytes } from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/** Profile fields that are safe to show visitors (never the notes PIN). */
const PUBLIC_PROFILE_FIELDS = {
  username: true, bio: true, coverUrl: true, coverPosition: true,
  avatarUrl: true, links: true, skills: true, preferredView: true,
} as const;

export function newShareToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function displayNameFor(userId: string): Promise<string | null> {
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    return user.fullName || user.username || null;
  } catch {
    return null;
  }
}

export async function loadPublicProfile(userId: string) {
  return prisma.profile.findUnique({ where: { userId }, select: PUBLIC_PROFILE_FIELDS });
}

/** Projects as visitors see them: no repo links, locked notes stripped. */
export async function loadPublicProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, title: true, description: true, status: true,
      liveUrl: true, techStack: true, tags: true,
      deploymentDate: true, coverImage: true, pinned: true,
      notesLocked: true, notes: true,
      createdAt: true, updatedAt: true,
    },
  });
  return projects.map(({ notes, notesLocked, ...rest }) => ({ ...rest, notesLocked, notes: notesLocked ? null : notes }));
}
