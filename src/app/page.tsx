import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroCarouselWrapper } from "@/components/hero-carousel-wrapper";
import { ServicesSection } from "@/components/services-section";
import { PopularProcedures } from "@/components/popular-procedures";
import { DiscountsSection } from "@/components/discounts-section";
import { getPopularProcedures, getDiscountedProcedures } from "@/app/actions/external-api";

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <p className="text-sm tracking-[0.3em] text-gray-600 mb-4 uppercase">
                Елегантен салон за красота
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                CLASSY & BEAUTIFUL
                <br />
                <span className="text-gold">ВСЕКИ ДЕН.</span>
              </h1>
              <p className="text-gray-600 text-lg mb-8 max-w-md">
                CB Classy & Beautiful предлага подбрани процедури за коса, лице и
                тяло. Нашите специалисти ще се погрижат за вашата красота с
                внимание към всеки детайл.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg">
                  <Link href="/rezervacii">ЗАПАЗИ ЧАС</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#uslugi">ВИЖ УСЛУГИ</Link>
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

      {/* Popular Procedures Section */}
      <PopularProcedures procedures={popularProcedures} />

      {/* Discounts Section */}
      <DiscountsSection procedures={discountedProcedures} />

      {/* Services Section */}
      <ServicesSection />
    </>
  );
}
