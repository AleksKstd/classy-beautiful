import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Procedure } from "@/types/database";

/** All active procedures, ordered by category and name. Throws on failure. */
export async function getActiveProcedures(): Promise<Procedure[]> {
  const { data, error } = await createPublicClient()
    .from("procedures")
    .select("*")
    .eq("is_active", true)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load procedures: ${error.message}`);
  return data ?? [];
}

/** Active procedures with a discount, biggest discount first. */
export async function getDiscountedProcedures(): Promise<Procedure[]> {
  try {
    const { data, error } = await createPublicClient()
      .from("procedures")
      .select("*")
      .eq("is_active", true)
      .gt("discount_percentage", 0)
      .order("discount_percentage", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("Error fetching discounted procedures:", error);
    return [];
  }
}

/** Most booked active procedures in the last 30 days. */
export async function getPopularProcedures(limit = 6): Promise<Procedure[]> {
  try {
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: logs, error: logsError } = await supabase
      .from("reservation_logs")
      .select("procedure_id")
      .gte("booked_at", since);
    if (logsError) throw logsError;

    const counts: Record<string, number> = {};
    for (const log of logs ?? []) counts[log.procedure_id] = (counts[log.procedure_id] ?? 0) + 1;

    const topIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);
    if (topIds.length === 0) return [];

    const { data: procedures, error } = await supabase
      .from("procedures")
      .select("*")
      .in("id", topIds)
      .eq("is_active", true);
    if (error) throw error;

    return (procedures ?? []).sort((a, b) => counts[b.id] - counts[a.id]);
  } catch (error) {
    console.error("Error fetching popular procedures:", error);
    return [];
  }
}
