"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface AdminSettingsData {
  adminEmail: string;
  notificationEnabled: boolean;
}

export async function getAdminSettings(): Promise<AdminSettingsData> {
  const supabase = createServerClient();

  const { data: settings } = await supabase
    .from("admin_settings")
    .select("setting_key, setting_value");

  const settingsMap = (settings || []).reduce((acc, s) => {
    acc[s.setting_key] = s.setting_value || "";
    return acc;
  }, {} as Record<string, string>);

  return {
    adminEmail: settingsMap["admin_email"] || "",
    notificationEnabled: settingsMap["notification_enabled"] === "true",
  };
}

export async function saveAdminSettings(data: AdminSettingsData): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  // Update admin email
  const { error: emailError } = await supabase
    .from("admin_settings")
    .upsert({
      setting_key: "admin_email",
      setting_value: data.adminEmail,
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

  if (emailError) {
    console.error("Error saving admin email:", emailError);
    return { success: false, error: "Грешка при запазване на имейла" };
  }

  // Update notification setting
  const { error: notifError } = await supabase
    .from("admin_settings")
    .upsert({
      setting_key: "notification_enabled",
      setting_value: data.notificationEnabled ? "true" : "false",
      updated_at: new Date().toISOString(),
    }, { onConflict: "setting_key" });

  if (notifError) {
    console.error("Error saving notification setting:", notifError);
    return { success: false, error: "Грешка при запазване на настройките" };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}
