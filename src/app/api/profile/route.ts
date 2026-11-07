import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const EDITABLE = ["username", "bio", "coverUrl", "coverPosition", "avatarUrl", "links", "skills", "notesPin", "preferredView"] as const;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.profile.findUnique({ where: { userId } });
  return NextResponse.json(profile ?? {});
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of EDITABLE) if (body[key] !== undefined) data[key] = body[key];

  if (data.username !== undefined && data.username !== null && !/^[a-z0-9-]{3,30}$/.test(String(data.username))) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return NextResponse.json(profile);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Username is taken" }, { status: 409 });
    }
    throw e;
  }
}
