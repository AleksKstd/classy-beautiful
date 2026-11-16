"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, scheduleClosureSchema } from "@/lib/validation";

type Result = { success: boolean; error?: string };

export async function createScheduleClosure(input: z.input<typeof scheduleClosureSchema>): Promise<Result> {
  await requireAdmin();
  const parsed = scheduleClosureSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: Object.values(fieldErrors(parsed.error))[0] ?? "Невалидни данни" };
  }

  const { error } = await createAdminClient().from("schedules").insert(parsed.data);
  if (error) {
    console.error("Error creating schedule closure:", error);
    return { success: false, error: "Грешка при създаване" };
  }
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteScheduleClosure(id: string): Promise<Result> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { success: false, error: "Невалиден запис" };

  const { error } = await createAdminClient().from("schedules").delete().eq("id", id);
  if (error) {
    console.error("Error deleting schedule closure:", error);
    return { success: false, error: "Грешка при изтриване" };
  }
  revalidatePath("/admin/dashboard");
  return { success: true };
}
