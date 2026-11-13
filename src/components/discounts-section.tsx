import Link from "next/link";
import { formatPrice, formatDuration } from "@/lib/utils";
import { getFinalPrice } from "@/lib/pricing";
import type { Procedure } from "@/types/database";

interface DiscountsSectionProps {
  procedures: Procedure[];
}

export function DiscountsSection({ procedures }: DiscountsSectionProps) {
  if (procedures.length === 0) {
    return null;
  }

  return (
    <section className="py-20 md:py-28 bg-cocoa-light text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">Оферти</p>
          <h2 className="text-4xl sm:text-5xl leading-tight">Текущи отстъпки</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {procedures.map((procedure) => {
            const discountedPrice = getFinalPrice(procedure);

            return (
              <Link
                key={procedure.id}
                href={`/rezervacii?procedureId=${procedure.id}`}
                className="group flex flex-col rounded-3xl border border-white/10 bg-cocoa/50 p-8 transition-colors hover:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
              >
                <span className="self-start rounded bg-gold px-2.5 py-1 text-xs font-semibold tracking-wider text-cocoa">
                  −{procedure.discount_percentage}%
                </span>
                <h3 className="mt-6 font-display text-2xl leading-snug">{procedure.name}</h3>
                <p className="mt-2 text-sm text-white/60">
                  {formatDuration(procedure.duration_minutes)} · {procedure.technician}
                </p>
                <div className="mt-auto pt-8 flex items-baseline justify-between gap-4">
                  <span>
                    <span className="mr-3 text-sm text-white/50 line-through">{formatPrice(procedure.price)}</span>
                    <span className="font-display text-3xl">{formatPrice(discountedPrice)}</span>
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gold group-hover:text-white transition-colors">
                    Запази
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
