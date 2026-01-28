import { createClient } from "@/lib/supabase/server";
import { HeroCarousel } from "./hero-carousel";
import type { CarouselImage } from "@/types/database";

// Fallback images when no images are uploaded or on error
const defaultImages = [
  {
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=800&fit=crop",
    alt: "Козметична процедура за лице",
  },
  {
    src: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&h=800&fit=crop",
    alt: "Маникюр процедура",
  },
  {
    src: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=800&fit=crop",
    alt: "Спа процедура",
  },
];

export async function HeroCarouselWrapper() {
  try {
    const supabase = createClient();

    const { data: images, error } = await supabase
      .from("carousel_images")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching carousel images:", error.message);
      }
      return <HeroCarousel images={defaultImages} />;
    }

    if (!images || images.length === 0) {
      return <HeroCarousel images={defaultImages} />;
    }

    // Validate each image exists in storage before including it
    const validatedImages = await Promise.all(
      (images as CarouselImage[]).map(async (img) => {
        const cleanPath = img.storage_path.startsWith("carousel/")
          ? img.storage_path.replace("carousel/", "")
          : img.storage_path;

        // Check if file exists by listing it
        const { data: fileList } = await supabase.storage
          .from("carousel")
          .list("", { search: cleanPath, limit: 1 });

        const fileExists = fileList && fileList.some(f => f.name === cleanPath);

        if (!fileExists) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`Carousel image not found in storage: ${cleanPath}`);
          }
          return null;
        }

        const { data } = supabase.storage.from("carousel").getPublicUrl(cleanPath);

        return {
          src: data.publicUrl,
          alt: `Снимка ${img.display_order + 1}`,
        };
      })
    );

    // Filter out null entries (images that don't exist)
    const carouselImages = validatedImages.filter((img): img is { src: string; alt: string } => img !== null);

    // Use default images if no valid images found
    if (carouselImages.length === 0) {
      return <HeroCarousel images={defaultImages} />;
    }

    return <HeroCarousel images={carouselImages} />;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("HeroCarouselWrapper error:", error);
    }
    return <HeroCarousel images={defaultImages} />;
  }
}
