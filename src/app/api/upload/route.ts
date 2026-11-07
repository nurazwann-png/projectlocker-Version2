import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const KINDS = new Set(["avatar", "cover", "project"]);
const MAX_BYTES = 5 * 1024 * 1024;

/** Stores an image in Vercel Blob and returns its URL. */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("type") ?? "");

  if (!(file instanceof File) || !KINDS.has(kind)) {
    return NextResponse.json({ error: "Missing file or type" }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });

  // Random key per upload so URLs can't be guessed and caches never serve a stale image.
  const blob = await put(`${userId}/${kind}/${randomUUID()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
    cacheControlMaxAge: 31536000,
  });

  return NextResponse.json({ url: blob.url });
}
