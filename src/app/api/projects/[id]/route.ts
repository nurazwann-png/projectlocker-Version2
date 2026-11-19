import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = await prisma.project.update({ where: { id }, data: body });
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
