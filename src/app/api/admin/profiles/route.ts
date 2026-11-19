import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin(req: Request) {
  const { isAdmin } = await auth();
  const pinToken = req.headers.get("x-admin-pin");
  const adminPin = process.env.ADMIN_PIN ?? "";
  return isAdmin || (!!adminPin && pinToken === adminPin);
}

export async function GET(req: Request) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profiles = await prisma.profile.findMany({
    orderBy: { createdAt: "asc" },
    select: { userId: true, username: true, bio: true, avatarUrl: true, createdAt: true },
  });

  const projectCounts = await prisma.project.groupBy({
    by: ["userId"],
    _count: { id: true },
    where: { userId: { in: profiles.map((p) => p.userId) } },
  });
  const countMap = new Map(projectCounts.map((c) => [c.userId, c._count.id]));

  return NextResponse.json(profiles.map((p) => ({
    ...p,
    projectCount: countMap.get(p.userId) ?? 0,
  })));
}
