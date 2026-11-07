import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function ownedLink(id: string, userId: string) {
  const link = await prisma.shareLink.findUnique({ where: { id } });
  return link && link.userId === userId ? link : null;
}

/** Allow or close access, or rename the link. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownedLink(id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: { status?: string; label?: string | null } = {};
  if (body.status === "active" || body.status === "closed") data.status = body.status;
  if (typeof body.label === "string") data.label = body.label.trim().slice(0, 60) || null;

  const link = await prisma.shareLink.update({ where: { id }, data });
  return NextResponse.json(link);
}

/** Deleting a link permanently disables its QR code. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownedLink(id, userId))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.shareLink.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
