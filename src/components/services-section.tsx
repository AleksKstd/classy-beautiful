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
    <section id="uslugi" className="py-20 md:py-28 bg-champagne scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Услуги" title="Какво правим" />

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service, index) => (
            <li key={service.title}>
              <Link
                href="/proceduri"
                className="group flex h-full flex-col rounded-3xl bg-white p-7 lg:p-8 shadow-[0_20px_40px_-28px_rgba(51,36,31,0.35)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blush-light font-display text-base text-rose-dark">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-display text-2xl">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{service.description}</p>
                <span className="mt-auto pt-8 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-dark">
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
