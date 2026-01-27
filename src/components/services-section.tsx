import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Eye, Smile, Zap } from "lucide-react";

const services = [
  {
    icon: Sparkles,
    title: "Нокти",
    description: "Маникюр, педикюр, гел лак и ноктопластика с висококачествени продукти.",
  },
  {
    icon: Eye,
    title: "Мигли и вежди",
    description: "Ламиниране, удължаване на мигли и оформяне на вежди за перфектен поглед.",
  },
  {
    icon: Smile,
    title: "Лице",
    description: "Почистване, хидратация и anti-age терапии за сияйна кожа.",
  },
  {
    icon: Zap,
    title: "Епилация",
    description: "Лазерна епилация и кола маска за гладка кожа с дълготраен ефект.",
  },
];

export function ServicesSection() {
  return (
    <section id="uslugi" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm tracking-[0.3em] text-gray-600 mb-4 uppercase">
            Нашите услуги
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Професионална грижа за вашата красота
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Предлагаме широка гама от козметични процедури, изпълнени от опитни
            специалисти с внимание към всеки детайл.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <div
              key={service.title}
              className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center mb-4">
                <service.icon className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
              <p className="text-gray-600 text-sm">{service.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild size="lg">
            <Link href="/rezervacii">ЗАПАЗИ ЧАС СЕГА</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
