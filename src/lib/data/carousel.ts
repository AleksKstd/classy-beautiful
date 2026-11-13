import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export const CAROUSEL_BUCKET = "carousel";

export interface GalleryImage {
  src: string;
  alt: string;
  caption: string | null;
  /** The procedure shown in the photo, if one is linked and still active */
  procedure: { id: string; name: string; type: string } | null;
}

/** Older rows stored the path with a "carousel/" prefix. */
export function cleanStoragePath(path: string): string {
  return path.startsWith(`${CAROUSEL_BUCKET}/`) ? path.slice(CAROUSEL_BUCKET.length + 1) : path;
}

/**
 * Active photos (hero carousel and gallery) whose file still exists in
 * storage, with the procedure each one is linked to.
 */
export async function getCarouselImages(): Promise<GalleryImage[]> {
  const supabase = createPublicClient();

  const { data: images, error } = await supabase
    .from("carousel_images")
    .select("storage_path, display_order, caption, procedure:procedures(id, name, type)")
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
    .map((img) => {
      const procedure = (img.procedure as unknown as GalleryImage["procedure"]) ?? null;
      return {
        src: supabase.storage.from(CAROUSEL_BUCKET).getPublicUrl(img.path).data.publicUrl,
        alt: img.caption || procedure?.name || `Classy & Beautiful - снимка ${img.display_order + 1}`,
        caption: img.caption,
        procedure,
      };
    });
}
