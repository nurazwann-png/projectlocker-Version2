// Best-effort brake on password guessing. Memory is per server instance, so this
// slows an attacker down rather than stopping a distributed one.
const hits = new Map<string, { count: number; resetAt: number }>();

export function tooManyAttempts(key: string, limit = 10, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
