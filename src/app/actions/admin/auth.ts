"use server";

import { redirect } from "next/navigation";
import { checkAdminCredentials, endAdminSession, startAdminSession } from "@/lib/auth/admin";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function adminLogin(formData: FormData): Promise<{ success: false; error: string }> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { success: false, error: "Моля въведете потребителско име и парола" };
  }

  // 5 attempts per 15 minutes per IP
  if (!(await rateLimit(`admin-login:${await getClientIp()}`, 5, 15 * 60))) {
    return { success: false, error: "Твърде много опити. Опитайте отново след 15 минути." };
  }

  if (!(await checkAdminCredentials(username, password))) {
    return { success: false, error: "Невалидно потребителско име или парола" };
  }

  if (!(await startAdminSession())) {
    return { success: false, error: "Админ входът не е конфигуриран на сървъра." };
  }
  redirect("/admin/dashboard");
}

export async function adminLogout() {
  await endAdminSession();
  redirect("/admin");
}
