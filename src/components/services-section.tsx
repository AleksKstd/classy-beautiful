import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "./section-heading";

const services = [
  {
    title: "Нокти",
    description: "Медицински педикюр и грижа за ноктите с професионални продукти.",
  },
  {
    title: "Мигли и вежди",
    description: "Ламиниране, оформяне и боядисване за подреден, естествен поглед.",
  },
  {
    title: "Лице",
    description: "Почистване, хидратация и anti-age терапии според типа кожа.",
  },
  {
    title: "Епилация",
    description: "Лазерна епилация и кола маска за жени и мъже.",
  },
];

export function ServicesSection() {
  return (
    <section id="uslugi" className="py-20 md:py-28 bg-ivory scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Услуги" title="Какво правим" />

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-gray-300">
          {services.map((service, index) => (
            <li key={service.title} className="border-b border-gray-300 lg:border-b-0 lg:border-r last:border-r-0">
              <Link
                href="/proceduri"
                className="group flex h-full flex-col p-6 lg:p-8 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-dark"
              >
                <span className="font-display text-sm text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-2xl font-medium">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{service.description}</p>
                <span className="mt-auto pt-8 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-black">
                  Цени
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
