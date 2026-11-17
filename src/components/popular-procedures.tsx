import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import { getFinalPrice, hasDiscount } from "@/lib/pricing";
import type { Procedure } from "@/types/database";
import { SectionHeading } from "./section-heading";

interface PopularProceduresProps {
  procedures: Procedure[];
}

export function PopularProcedures({ procedures }: PopularProceduresProps) {
  if (procedures.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-white">
      {/* Soft colour shapes with the brand patterns, as in the hero */}
      <div aria-hidden="true" className="drops-layer drops-layer-mid">
        <div className="absolute -top-24 -left-32 h-[28rem] w-[28rem] rounded-full bg-blush/70 blur-3xl" />
        <div className="absolute -top-10 -right-28 h-[22rem] w-[22rem] rounded-full bg-champagne blur-3xl" />
        <div className="drop-pattern absolute -top-24 -left-32 h-[28rem] w-[28rem]" />
        <div className="drop-dots absolute -top-10 -right-28 h-[22rem] w-[22rem]" />
      </div>
      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Най-търсени" title="Любими процедури" />

        <ol className="overflow-hidden rounded-2xl bg-blush-light">
          {procedures.map((procedure, index) => (
            <li key={procedure.id} className="border-b border-blush last:border-b-0">
              <Link
                href={`/rezervacii?procedureId=${procedure.id}`}
                className="group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3.5rem_1fr_auto_auto] items-baseline gap-x-4 px-5 py-5 sm:px-9 transition-colors hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-dark"
              >
                <span className="font-display text-lg text-rose-dark transition-colors group-hover:text-cocoa">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-medium text-brand-black">{procedure.name}</span>
                  <span className="block text-sm text-taupe-600">
                    {formatDuration(procedure.duration_minutes)} · {procedure.technician}
                  </span>
                </span>
                <span className="text-right">
                  {hasDiscount(procedure) && (
                    <span className="mr-2 text-sm text-taupe-400 line-through">{formatPrice(procedure.price)}</span>
                  )}
                  <span className="font-display text-xl text-cocoa">{formatPrice(getFinalPrice(procedure))}</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-dark transition-colors group-hover:text-cocoa">
                  Запази
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
