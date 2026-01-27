"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  verifyAdminCredentials,
  createAdminSession,
  destroyAdminSession,
  isAdminAuthenticated,
} from "@/lib/admin-auth";
import type { Procedure, Schedule } from "@/types/database";

/**
 * Admin login action
 */
export async function adminLogin(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Моля въведете потребителско име и парола" };
  }

  const isValid = await verifyAdminCredentials(username, password);

  if (!isValid) {
    return { success: false, error: "Невалидно потребителско име или парола" };
  }

  await createAdminSession();
  redirect("/admin/dashboard");
}

/**
 * Admin logout action
 */
export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin");
}

/**
 * Check admin authentication
 */
export async function checkAdminAuth() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/admin");
  }
}

// ============================================
// PROCEDURES MANAGEMENT
// ============================================

export async function createProcedure(data: {
  name: string;
  duration_minutes: number;
  price: number;
  type: string;
  technician: string;
  discount_percentage?: number;
}) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("procedures").insert({
      name: data.name,
      duration_minutes: data.duration_minutes,
      price: data.price,
      type: data.type,
      technician: data.technician,
      discount_percentage: data.discount_percentage || null,
      is_active: true,
    });

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error creating procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при създаване",
    };
  }
}

export async function updateProcedure(
  id: string,
  data: Partial<Procedure>
) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("procedures")
      .update(data)
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при обновяване",
    };
  }
}

export async function deleteProcedure(id: string) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("procedures")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при изтриване",
    };
  }
}

export async function toggleProcedureActive(id: string, isActive: boolean) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("procedures")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error toggling procedure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при промяна",
    };
  }
}

// ============================================
// SCHEDULE CLOSURES MANAGEMENT
// ============================================

export async function createScheduleClosure(data: {
  office_name: "София" | "Лом";
  closed_date_start: string;
  closed_date_end: string;
}) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("schedules").insert(data);

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error creating schedule closure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при създаване",
    };
  }
}

export async function deleteScheduleClosure(id: string) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule closure:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при изтриване",
    };
  }
}

export async function getScheduleClosures() {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .order("closed_date_start", { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching schedule closures:", error);
    return { success: false, data: [] };
  }
}

// ============================================
// CAROUSEL IMAGES MANAGEMENT
// ============================================

export async function uploadCarouselImage(formData: FormData) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();
    const file = formData.get("file") as File;

    if (!file) {
      return { success: false, error: "Няма избран файл" };
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = fileName; // Just filename, bucket is already "carousel"

    const { error: uploadError } = await supabase.storage
      .from("carousel")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get the highest display order
    const { data: existingImages } = await supabase
      .from("carousel_images")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = existingImages && existingImages.length > 0
      ? existingImages[0].display_order + 1
      : 0;

    // Add record to database
    const { error: dbError } = await supabase
      .from("carousel_images")
      .insert({
        storage_path: filePath,
        display_order: nextOrder,
        is_active: true,
      });

    if (dbError) throw dbError;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error uploading carousel image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при качване",
    };
  }
}

export async function deleteCarouselImage(id: string, storagePath: string) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    // Handle legacy paths that include "carousel/" prefix
    const cleanPath = storagePath.startsWith("carousel/") 
      ? storagePath.replace("carousel/", "") 
      : storagePath;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("carousel")
      .remove([cleanPath]);

    if (storageError) throw storageError;

    // Delete from database
    const { error: dbError } = await supabase
      .from("carousel_images")
      .delete()
      .eq("id", id);

    if (dbError) throw dbError;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting carousel image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при изтриване",
    };
  }
}

export async function updateCarouselImageOrder(
  id: string,
  newOrder: number
) {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("carousel_images")
      .update({ display_order: newOrder })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error updating image order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Грешка при промяна",
    };
  }
}

export async function getCarouselImages() {
  await checkAdminAuth();

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("carousel_images")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching carousel images:", error);
    return { success: false, data: [] };
  }
}
