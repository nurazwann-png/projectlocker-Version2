/** Resize to fit within maxW×maxH and re-encode as JPEG. */
async function compress(file: File, maxW: number, maxH: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.85));
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses an image and stores it in Neon Object Storage, returning its URL.
 * Falls back to an inline data URL if the upload isn't possible (e.g. offline).
 */
export async function uploadImage(file: File, kind: "avatar" | "cover", size = kind === "avatar" ? 512 : 1280): Promise<string> {
  const blob = await compress(file, size, kind === "avatar" ? size : Math.round(size * 0.5625)).catch(() => file);
  try {
    const form = new FormData();
    form.append("file", new File([blob], kind === "avatar" ? "avatar.jpg" : "cover.jpg", { type: blob.type || "image/jpeg" }));
    form.append("type", kind);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) return (await res.json()).url as string;
  } catch {
    // fall through to inline storage
  }
  return toDataUrl(blob);
}
