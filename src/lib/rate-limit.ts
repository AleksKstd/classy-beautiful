import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Best-effort client IP behind Vercel / a reverse proxy. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

// Fallback used only if the database limiter is unavailable
// (e.g. migration 002 not applied yet). Per-instance, so weaker.
const memoryHits = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const recent = (memoryHits.get(key) ?? []).filter((t) => t > now - windowSeconds * 1000);
  if (recent.length >= limit) {
    memoryHits.set(key, recent);
    return false;
  }
  recent.push(now);
  memoryHits.set(key, recent);
  return true;
}

/**
 * Records one attempt for `key`. Returns false when more than `limit`
 * attempts happened within `windowSeconds`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error("Rate limiter unavailable, using in-memory fallback:", error);
    return memoryLimit(key, limit, windowSeconds);
  }
}
