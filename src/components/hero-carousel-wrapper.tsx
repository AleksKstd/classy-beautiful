import { createClient } from "@/lib/supabase/server";
import { HeroCarousel } from "./hero-carousel";

export async function HeroCarouselWrapper() {
  const supabase = await createClient();

  const { data: images } = await supabase
    .from("carousel_images")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const carouselImages = (images || []).map((img) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Handle legacy paths that already include "carousel/" prefix
    const cleanPath = img.storage_path.startsWith("carousel/") 
      ? img.storage_path.replace("carousel/", "") 
      : img.storage_path;
    return {
      src: `${supabaseUrl}/storage/v1/object/public/carousel/${cleanPath}`,
      alt: `Снимка ${img.display_order + 1}`,
    };
  });

  // Fallback to placeholder images if no images uploaded yet
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

  return <HeroCarousel images={carouselImages.length > 0 ? carouselImages : defaultImages} />;
}
