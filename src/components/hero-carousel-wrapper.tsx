import { HeroCarousel, type HeroImage } from "./hero-carousel";
import { getCarouselImages } from "@/lib/data/carousel";

// Backup photos stored with the site, shown when no images are uploaded
// in Admin > Снимки or the image storage is unavailable.
const backupImages: HeroImage[] = [
  { src: "/images/hero/hero-1.jpg", alt: "Козметична процедура за лице" },
  { src: "/images/hero/hero-2.jpg", alt: "Маникюр в салона" },
  { src: "/images/hero/hero-3.jpg", alt: "Спа процедура" },
];

export async function HeroCarouselWrapper() {
  const images = await getCarouselImages().catch((error) => {
    console.error("Error loading carousel images:", error);
    return [];
  });
  return <HeroCarousel images={images.length > 0 ? images : backupImages} />;
}
