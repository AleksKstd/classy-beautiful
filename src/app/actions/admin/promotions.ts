"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, promotionInputSchema, type PromotionInput } from "@/lib/validation";

type Result = { success: boolean; error?: string };

const idSchema = z.string().uuid();

function revalidatePublicPages() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
  revalidatePath("/rezervacii");
}

/** Validates the input and keeps only the fields that apply to its kind. */
function toRow(input: PromotionInput) {
  const parsed = promotionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: Object.values(fieldErrors(parsed.error))[0] ?? "Невалидни данни" } as const;
  }
  const p = parsed.data;
  return {
    row: {
      kind: p.kind,
      title: p.title,
      badge: p.badge,
      description: p.description || null,
      procedure_ids: p.procedure_ids,
      procedure_count: p.kind === "bundle" ? p.procedure_count ?? null : null,
      price: p.price ?? null,
      starts_on: p.starts_on ?? null,
      ends_on: p.ends_on ?? null,
      is_active: p.is_active,
    },
  } as const;
}

/** Every listed procedure must exist (inactive ones are allowed; they are just not offered). */
async function proceduresExist(ids: string[]): Promise<boolean> {
  const { count } = await createAdminClient()
    .from("procedures")
    .select("id", { count: "exact", head: true })
    .in("id", ids);
  return count === ids.length;
}

export async function createPromotion(input: PromotionInput): Promise<Result> {
  await requireAdmin();
  const result = toRow(input);
  if ("error" in result) return { success: false, error: result.error };
  if (!(await proceduresExist(result.row.procedure_ids))) return { success: false, error: "Някоя от процедурите не съществува" };

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("promotions")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const display_order = last && last.length > 0 ? last[0].display_order + 1 : 0;

  const { error } = await supabase.from("promotions").insert({ ...result.row, display_order });
  if (error) {
    console.error("Error creating promotion:", error);
    return { success: false, error: "Грешка при създаване на промоцията" };
  }
  revalidatePublicPages();
  return { success: true };
}

export async function updatePromotion(id: string, input: PromotionInput): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна промоция" };
  const result = toRow(input);
  if ("error" in result) return { success: false, error: result.error };
  if (!(await proceduresExist(result.row.procedure_ids))) return { success: false, error: "Някоя от процедурите не съществува" };

  const { error } = await createAdminClient().from("promotions").update(result.row).eq("id", id);
  if (error) {
    console.error("Error updating promotion:", error);
    return { success: false, error: "Грешка при запазване на промоцията" };
  }
  revalidatePublicPages();
  return { success: true };
}

export async function setPromotionActive(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна промоция" };
  const { error } = await createAdminClient().from("promotions").update({ is_active: Boolean(isActive) }).eq("id", id);
  if (error) {
    console.error("Error toggling promotion:", error);
    return { success: false, error: "Грешка при промяна" };
  }
  revalidatePublicPages();
  return { success: true };
}

export async function deletePromotion(id: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна промоция" };
  const { error } = await createAdminClient().from("promotions").delete().eq("id", id);
  if (error) {
    console.error("Error deleting promotion:", error);
    return { success: false, error: "Грешка при изтриване" };
  }
  revalidatePublicPages();
  return { success: true };
}
