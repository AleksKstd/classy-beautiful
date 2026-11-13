import Link from "next/link";
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
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Най-търсени"
          title="Любими процедури"
          description="Най-резервираното от нашите клиенти през последния месец."
        />

        <ol className="border-t border-gray-200">
          {procedures.map((procedure, index) => (
            <li key={procedure.id} className="border-b border-gray-200">
              <Link
                href={`/rezervacii?procedureId=${procedure.id}`}
                className="group grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3.5rem_1fr_auto_auto] items-baseline gap-x-4 py-5 transition-colors hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-dark"
              >
                <span className="font-display text-lg text-gold-dark">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block font-medium text-brand-black">{procedure.name}</span>
                  <span className="block text-sm text-gray-500">
                    {formatDuration(procedure.duration_minutes)} · {procedure.technician}
                  </span>
                </span>
                <span className="text-right">
                  {hasDiscount(procedure) && (
                    <span className="mr-2 text-sm text-gray-400 line-through">{formatPrice(procedure.price)}</span>
                  )}
                  <span className="font-display text-xl text-brand-black">{formatPrice(getFinalPrice(procedure))}</span>
                </span>
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 transition-colors group-hover:text-brand-black">
                  Запази
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
