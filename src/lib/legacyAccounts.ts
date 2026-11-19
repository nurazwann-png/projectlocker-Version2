import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * If this email belonged to a pre-existing (Clerk) account, move that account's
 * locker, share links, comments and views onto the newly registered user.
 */
export async function adoptLegacyData(email: string, newUserId: string) {
  const legacy = await prisma.legacyAccount.findUnique({ where: { email } });
  if (!legacy) return;
  const from = legacy.legacyUserId;
  await prisma.$transaction([
    prisma.profile.updateMany({ where: { userId: from }, data: { userId: newUserId } }),
    prisma.project.updateMany({ where: { userId: from }, data: { userId: newUserId } }),
    prisma.shareLink.updateMany({ where: { userId: from }, data: { userId: newUserId } }),
    prisma.comment.updateMany({ where: { authorId: from }, data: { authorId: newUserId } }),
    prisma.projectView.updateMany({ where: { viewerId: from }, data: { viewerId: newUserId } }),
    prisma.legacyAccount.delete({ where: { email } }),
  ]);
}
