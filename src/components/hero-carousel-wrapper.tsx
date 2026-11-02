import { HeroCarousel } from "./hero-carousel";
import { getCarouselImages } from "@/lib/data/carousel";

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
  const images = await getCarouselImages().catch((error) => {
    console.error("Error loading carousel images:", error);
    return [];
  });
  return <HeroCarousel images={images.length > 0 ? images : defaultImages} />;
}
