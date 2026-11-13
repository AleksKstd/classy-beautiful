import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export const CAROUSEL_BUCKET = "carousel";

/** Older rows stored the path with a "carousel/" prefix. */
export function cleanStoragePath(path: string): string {
  return path.startsWith(`${CAROUSEL_BUCKET}/`) ? path.slice(CAROUSEL_BUCKET.length + 1) : path;
}

/** Public URLs of active carousel images whose file still exists in storage. */
export async function getCarouselImages(): Promise<{ src: string; alt: string }[]> {
  const supabase = createPublicClient();

  const { data: images, error } = await supabase
    .from("carousel_images")
    .select("storage_path, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) throw error;
  if (!images?.length) return [];

  // One listing call instead of one per image.
  const { data: files } = await supabase.storage.from(CAROUSEL_BUCKET).list("", { limit: 1000 });
  const existing = new Set((files ?? []).map((f) => f.name));

  return images
    .map((img) => ({ ...img, path: cleanStoragePath(img.storage_path) }))
    .filter((img) => existing.has(img.path))
    .map((img) => ({
      src: supabase.storage.from(CAROUSEL_BUCKET).getPublicUrl(img.path).data.publicUrl,
      alt: `Classy & Beautiful - снимка ${img.display_order + 1}`,
    }));
}
