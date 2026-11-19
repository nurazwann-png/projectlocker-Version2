import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin(req: Request) {
  const { isAdmin } = await auth();
  const pinToken = req.headers.get("x-admin-pin");
  const adminPin = process.env.ADMIN_PIN ?? "";
  return isAdmin || (!!adminPin && pinToken === adminPin);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;

  // Cascade: views → comments → projects → profile
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  await prisma.projectView.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.comment.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { userId } });
  await prisma.profile.delete({ where: { userId } });

  return NextResponse.json({ ok: true });
}
