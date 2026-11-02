"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { CAROUSEL_BUCKET, cleanStoragePath } from "@/lib/data/carousel";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { success: boolean; error?: string };

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const idSchema = z.string().uuid();

/** Detects the image type from the file's first bytes (ignores the client-sent type). */
function detectImageType(bytes: Uint8Array): { ext: string; mime: string } | null {
  const starts = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (starts([0xff, 0xd8, 0xff])) return { ext: "jpg", mime: "image/jpeg" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ext: "png", mime: "image/png" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return { ext: "webp", mime: "image/webp" };
  if (starts([0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 4)) return { ext: "avif", mime: "image/avif" };
  return null;
}

function revalidate() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/");
}

export async function uploadCarouselImage(formData: FormData): Promise<Result> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Няма избран файл" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { success: false, error: "Файлът е твърде голям (максимум 5 MB)" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return { success: false, error: "Позволени са само JPG, PNG, WEBP и AVIF изображения" };
  }

  try {
    const supabase = createAdminClient();
    const filePath = `${Date.now()}-${randomUUID().slice(0, 8)}.${type.ext}`;

    const { error: uploadError } = await supabase.storage
      .from(CAROUSEL_BUCKET)
      .upload(filePath, bytes, { contentType: type.mime, upsert: false });
    if (uploadError) throw uploadError;

    const { data: last } = await supabase
      .from("carousel_images")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);
    const nextOrder = last && last.length > 0 ? last[0].display_order + 1 : 0;

    const { error: dbError } = await supabase
      .from("carousel_images")
      .insert({ storage_path: filePath, display_order: nextOrder, is_active: true });
    if (dbError) {
      await supabase.storage.from(CAROUSEL_BUCKET).remove([filePath]);
      throw dbError;
    }

    revalidate();
    return { success: true };
  } catch (error) {
    console.error("Error uploading carousel image:", error);
    return { success: false, error: "Грешка при качване" };
  }
}

/** Deletes the image record and its file. The path is read from the database, never from the client. */
export async function deleteCarouselImage(id: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна снимка" };

  try {
    const supabase = createAdminClient();
    const { data: image } = await supabase.from("carousel_images").select("storage_path").eq("id", id).single();
    if (!image) return { success: false, error: "Снимката не е намерена" };

    const { error: storageError } = await supabase.storage
      .from(CAROUSEL_BUCKET)
      .remove([cleanStoragePath(image.storage_path)]);
    if (storageError) throw storageError;

    const { error: dbError } = await supabase.from("carousel_images").delete().eq("id", id);
    if (dbError) throw dbError;

    revalidate();
    return { success: true };
  } catch (error) {
    console.error("Error deleting carousel image:", error);
    return { success: false, error: "Грешка при изтриване" };
  }
}

export async function updateCarouselImageOrder(id: string, newOrder: number): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success || !Number.isInteger(newOrder) || newOrder < 0 || newOrder > 10000) {
    return { success: false, error: "Невалидни данни" };
  }

  const { error } = await createAdminClient()
    .from("carousel_images")
    .update({ display_order: newOrder })
    .eq("id", id);
  if (error) {
    console.error("Error updating image order:", error);
    return { success: false, error: "Грешка при промяна" };
  }
  revalidate();
  return { success: true };
}

/** Removes a database record whose storage file no longer exists. */
export async function deleteStaleCarouselEntry(id: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(id).success) return { success: false, error: "Невалидна снимка" };

  const { error } = await createAdminClient().from("carousel_images").delete().eq("id", id);
  if (error) {
    console.error("Error deleting stale carousel entry:", error);
    return { success: false, error: "Грешка при изтриване" };
  }
  revalidate();
  return { success: true };
}
