import "server-only";
import { headers } from "next/headers";

// In-memory fixed-window limiter. Fine for a single VPS process.
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    }
    return true;
  }
  entry.count++;
  return entry.count <= limit;
}

/**
 * Behind one reverse proxy (Caddy), the last X-Forwarded-For entry is the address the
 * proxy saw. Earlier entries are client-supplied and must not be trusted.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded?.at(-1) || h.get("x-real-ip") || "local";
}
