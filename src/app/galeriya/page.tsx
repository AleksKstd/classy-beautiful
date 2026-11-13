import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GalleryGrid } from "@/components/gallery-grid";
import { getCarouselImages } from "@/lib/data/carousel";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Галерия",
  description: "Снимки от салона и резултати от процедурите на Classy & Beautiful в София и Лом.",
  alternates: { canonical: "/galeriya" },
};

export default async function GalleryPage() {
  const images = await getCarouselImages().catch((error) => {
    console.error("Error loading gallery:", error);
    return [];
  });

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden pt-16 pb-12 mb-10 bg-gradient-to-b from-blush-light via-ivory to-white">
        <div aria-hidden="true" className="drops-layer">
          <div aria-hidden="true" className="absolute -top-24 -right-20 h-[26rem] w-[26rem] rounded-full bg-blush/70 blur-3xl" />
          <div aria-hidden="true" className="drop-pattern absolute -top-24 -right-20 h-[26rem] w-[26rem]" />
        </div>
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow mb-4">Галерия</p>
            <h1 className="text-5xl sm:text-6xl text-brand-black mb-4">Нашата работа</h1>
            <p className="text-taupe-600 leading-relaxed">
              Снимки от салона и резултати от процедурите. Харесва ви нещо? Запазете същата процедура с едно докосване.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {images.length > 0 ? (
            <GalleryGrid images={images} />
          ) : (
            <div className="rounded-2xl bg-champagne p-10 text-center">
              <p className="font-display text-2xl mb-3">Галерията се подготвя</p>
              <p className="text-taupe-600 mb-6">Скоро ще добавим снимки от салона и от нашата работа.</p>
              <Button asChild>
                <Link href="/rezervacii">Запази час</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
