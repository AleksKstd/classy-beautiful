"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSettingsSchema, type AdminSettingsData } from "@/lib/validation";

export async function saveAdminSettings(input: AdminSettingsData): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const parsed = adminSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Невалиден имейл адрес" };

  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("admin_settings")
    .upsert(
      [
        { setting_key: "admin_email", setting_value: parsed.data.adminEmail, updated_at: now },
        {
          setting_key: "notification_enabled",
          setting_value: parsed.data.notificationEnabled ? "true" : "false",
          updated_at: now,
        },
      ],
      { onConflict: "setting_key" }
    );

  if (error) {
    console.error("Error saving admin settings:", error);
    return { success: false, error: "Грешка при запазване на настройките" };
  }
  revalidatePath("/admin/dashboard");
  return { success: true };
}
