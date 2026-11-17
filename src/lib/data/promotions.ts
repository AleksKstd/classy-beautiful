import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { Promotion } from "@/types/database";

/** Active promotions (dates are checked by the caller with isPromotionLive). Never throws. */
export async function getActivePromotions(): Promise<Promotion[]> {
  try {
    const { data, error } = await createPublicClient()
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    // e.g. migration 006 not applied yet: the site keeps working without promotions
    console.error("Error fetching promotions:", error);
    return [];
  }
}
