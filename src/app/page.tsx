import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroCarouselWrapper } from "@/components/hero-carousel-wrapper";
import { ServicesSection } from "@/components/services-section";
import { PopularProcedures } from "@/components/popular-procedures";
import { DiscountsSection } from "@/components/discounts-section";
import { getPopularProcedures, getDiscountedProcedures } from "@/lib/data/procedures";

// Refresh popular procedures / discounts at least every 10 minutes.
export const revalidate = 600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [popularProcedures, discountedProcedures] = await Promise.all([
    getPopularProcedures(6),
    getDiscountedProcedures()
  ]);

  return (
    <>
      {/* Hero Section */}
      <section className="py-12 md:py-20 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <p className="eyebrow mb-6">Салон за красота · София и Лом</p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl leading-[1.05] mb-8">
                Classy &amp; Beautiful
                <span className="block italic text-gold-dark">всеки ден.</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-10 max-w-md">
                Грижа за лице, тяло и нокти от специалисти, които обръщат внимание
                на всеки детайл. Запазете час онлайн за минута.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <Link href="/rezervacii">Запази час</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/proceduri">Процедури и цени</Link>
                </Button>
              </div>
            </div>

            {/* Carousel */}
            <div className="order-1 lg:order-2">
              <HeroCarouselWrapper />
            </div>
          </div>
        </div>
      </section>

      <ServicesSection />
      <PopularProcedures procedures={popularProcedures} />
      <DiscountsSection procedures={discountedProcedures} />
    </>
  );
}
