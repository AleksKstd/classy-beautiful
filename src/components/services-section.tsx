import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "./section-heading";

const services = [
  {
    title: "Нокти",
    description: "Медицински педикюр, третиране на проблемни нокти и внимателна грижа за стъпалата.",
    href: "/proceduri#nokti",
  },
  {
    title: "Лице",
    description: "Мигли и вежди, почистване, хидратация и anti-age терапии според типа кожа.",
    href: "/proceduri#lice",
  },
  {
    title: "Епилация",
    description: "Лазерна епилация и кола маска за жени и мъже - от малки зони до цяло тяло.",
    href: "/proceduri#epilaciya",
  },
  {
    title: "Тяло",
    description: "Пилинг, пресотерапия, лимфодренаж и процедури за оформяне.",
    href: "/proceduri#tyalo",
  },
];

export function ServicesSection() {
  return (
    <section id="uslugi" className="py-20 md:py-28 bg-champagne scroll-mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Услуги" title="Какво правим" />

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-cocoa/15">
          {services.map((service, index) => (
            <li
              key={service.title}
              className="border-b border-cocoa/15 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
            >
              <Link
                href={service.href}
                className="group flex h-full flex-col px-1 py-8 sm:px-8 lg:py-10 transition-colors hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-dark"
              >
                <span className="font-display text-6xl italic leading-none text-gold/70" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 font-display text-2xl text-cocoa">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-taupe-600">{service.description}</p>
                <span className="mt-auto pt-8 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.16em] text-rose-dark transition-colors group-hover:text-cocoa">
                  Виж цените
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
