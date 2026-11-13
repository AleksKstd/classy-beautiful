"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, procedureInputSchema, type ProcedureInput } from "@/lib/validation";
import type { Procedure } from "@/types/database";

type Result = { success: boolean; error?: string };

const idSchema = z.string().uuid();

function revalidatePublicPages() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
  revalidatePath("/proceduri");
  revalidatePath("/rezervacii");
}

function invalid(error: z.ZodError): Result {
  return { success: false, error: Object.values(fieldErrors(error))[0] ?? "Невалидни данни" };
}

export async function getProcedureForEdit(id: string): Promise<Procedure | null> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return null;
  const { data } = await createAdminClient().from("procedures").select("*").eq("id", id).single();
  return data ?? null;
}

export async function createProcedure(input: ProcedureInput): Promise<Result> {
  await requireAdmin();
  const parsed = procedureInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { error } = await createAdminClient()
    .from("procedures")
    .insert({ ...parsed.data, discount_percentage: parsed.data.discount_percentage || null, is_active: true });
  if (error) {
    console.error("Error creating procedure:", error);
    return { success: false, error: "Грешка при създаване" };
  }
  revalidatePublicPages();
  return { success: true };
}

export async function updateProcedure(id: string, input: ProcedureInput): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна процедура" };
  const parsed = procedureInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { error } = await createAdminClient()
    .from("procedures")
    .update({ ...parsed.data, discount_percentage: parsed.data.discount_percentage || null })
    .eq("id", id);
  if (error) {
    console.error("Error updating procedure:", error);
    return { success: false, error: "Грешка при обновяване" };
  }
  revalidatePublicPages();
  return { success: true };
}

export async function deleteProcedure(id: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна процедура" };

  const { error } = await createAdminClient().from("procedures").delete().eq("id", id);
  if (error) {
    // 23503 = still referenced by reservations
    if (error.code === "23503") {
      return {
        success: false,
        error: "Процедурата има резервации и не може да бъде изтрита. Деактивирайте я вместо това.",
      };
    }
    console.error("Error deleting procedure:", error);
    return { success: false, error: "Грешка при изтриване" };
  }
  revalidatePublicPages();
  return { success: true };
}

export async function toggleProcedureActive(id: string, isActive: boolean): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна процедура" };

  const { error } = await createAdminClient()
    .from("procedures")
    .update({ is_active: Boolean(isActive) })
    .eq("id", id);
  if (error) {
    console.error("Error toggling procedure:", error);
    return { success: false, error: "Грешка при промяна" };
  }
  revalidatePublicPages();
  return { success: true };
}
