import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BUSINESS } from "@/config/site";
import { buildCatalog, isSingle, lowestPrice, type CatalogGroup } from "@/lib/catalog";
import { getFinalPrice, hasDiscount as procedureHasDiscount } from "@/lib/pricing";
import { cn, formatDuration, formatPrice } from "@/lib/utils";
import type { Procedure } from "@/types/database";

interface ProceduresGridProps {
  procedures: Procedure[];
}

type Heading = "h3" | "h4" | "h5";
const nextHeading: Record<Heading, Heading> = { h3: "h4", h4: "h5", h5: "h5" };

/** One bookable row: name, duration, price, and "Запази" on hover. */
function ProcedureRow({ procedure, title }: { procedure: Procedure; title?: string }) {
  const hasDiscount = procedureHasDiscount(procedure);
  // A stand-alone row (single-procedure group) shows the group name, with the full name below if it differs.
  const subtitle = title && title !== procedure.name ? procedure.name : null;

  return (
    <li>
      <Link
        href={`/rezervacii?procedureId=${procedure.id}`}
        className="group grid min-h-12 grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-dark sm:grid-cols-[1fr_7rem_8rem_6rem] sm:px-7"
      >
        <span>
          <span className={cn("text-brand-black", title && "font-display text-lg")}>{title ?? procedure.name}</span>
          {hasDiscount && (
            <span className="ml-2 rounded bg-rose-dark px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">
              −{procedure.discount_percentage}%
            </span>
          )}
          {subtitle && <span className="mt-0.5 block text-sm text-taupe-600">{subtitle}</span>}
          {procedure.description && (
            <span className="mt-1 block text-sm text-taupe-600 line-clamp-2">{procedure.description}</span>
          )}
          <span className="mt-1 block text-sm text-taupe-600 sm:hidden">
            {formatDuration(procedure.duration_minutes)} · {procedure.technician}
          </span>
        </span>
        <span className="hidden text-sm text-taupe-600 sm:block">{formatDuration(procedure.duration_minutes)}</span>
        <span className="whitespace-nowrap text-right">
          {hasDiscount && (
            <span className="mr-2 text-sm text-taupe-400 line-through">{formatPrice(procedure.price)}</span>
          )}
          <span className="font-display text-xl tabular-nums text-cocoa">{formatPrice(getFinalPrice(procedure))}</span>
        </span>
        <span className="hidden items-center justify-end gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-dark opacity-0 transition-[opacity,color] group-hover:text-cocoa group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex">
          Запази
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

function RowList({ children }: { children: React.ReactNode }) {
  return <ul className="overflow-hidden rounded-2xl bg-blush-light divide-y divide-blush">{children}</ul>;
}

/** A group heading with its rows; sub-groups (e.g. "на капиляри") get a smaller heading. */
function Group({ group, as: Tag, nested = false }: { group: CatalogGroup; as: Heading; nested?: boolean }) {
  const from = lowestPrice(group);
  return (
    <div className={nested ? "mt-5" : "mt-10 first:mt-0"}>
      <Tag
        className={cn(
          "mb-3 flex items-baseline justify-between gap-4",
          // pr lines "от X €" up with the row prices (row padding + the "Запази" column)
          nested ? "eyebrow" : "border-b border-cocoa/10 pb-2 pr-5 sm:pr-[9.25rem]"
        )}
      >
        <span className={nested ? undefined : "font-display text-2xl text-cocoa"}>{group.name}</span>
        {!nested && from !== null && (
          <span className="shrink-0 text-sm text-taupe-500">от {formatPrice(from)}</span>
        )}
      </Tag>
      {group.procedures.length > 0 && (
        <RowList>
          {group.procedures.map((procedure) => (
            <ProcedureRow key={procedure.id} procedure={procedure} />
          ))}
        </RowList>
      )}
      {group.children.map((child) => (
        <Group key={child.name} group={child} as={nextHeading[Tag]} nested />
      ))}
    </div>
  );
}

/** Splits groups into runs: consecutive single-procedure groups are bundled together. */
function runs(groups: CatalogGroup[]): (CatalogGroup | CatalogGroup[])[] {
  const out: (CatalogGroup | CatalogGroup[])[] = [];
  for (const group of groups) {
    const last = out[out.length - 1];
    if (isSingle(group) && Array.isArray(last)) last.push(group);
    else out.push(isSingle(group) ? [group] : group);
  }
  return out;
}

/**
 * Price list grouped as section → (Жени / Мъже) → treatment → variants.
 * Treatments with a single procedure are shown as one row without a heading.
 * Everything stays expanded so prices can be scanned and compared.
 */
export function ProceduresGrid({ procedures }: ProceduresGridProps) {
  const sections = buildCatalog(procedures);

  return (
    <div>
      {/* Jump links */}
      {sections.length > 1 && (
        <nav
          aria-label="Категории"
          className="sticky top-20 z-30 -mx-4 mb-10 overflow-x-auto bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0"
        >
          <ul className="flex gap-2 whitespace-nowrap">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex h-11 items-center rounded-md bg-blush-light px-4 text-xs font-semibold uppercase tracking-[0.16em] text-cocoa transition-colors hover:bg-blush"
                >
                  {section.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-20">
        {sections.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2 id={section.id} className="mb-8 scroll-mt-40 border-b border-gold/40 pb-4 text-4xl text-cocoa sm:text-5xl">
              {section.name}
            </h2>

            <div className="space-y-14">
              {section.parts.map((part) => {
                const groupHeading: Heading = part.label ? "h4" : "h3";
                return (
                  <div key={part.label ?? "all"} className="[&>h3+div]:mt-0">
                    {part.label && (
                      <h3 className="eyebrow mb-6">
                        {part.label}
                      </h3>
                    )}
                    {runs(part.groups).map((run, i) =>
                      Array.isArray(run) ? (
                        // Consecutive single-procedure treatments share one box
                        <div key={`singles-${i}`} className="mt-10 first:mt-0">
                          <RowList>
                            {run.map((group) => (
                              <ProcedureRow key={group.name} procedure={group.procedures[0]} title={group.name} />
                            ))}
                          </RowList>
                        </div>
                      ) : (
                        <Group key={`${i}-${run.name}`} group={run} as={groupHeading} />
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Contact */}
      <div className="mt-20 rounded-2xl bg-champagne p-8 sm:p-12 sm:flex sm:items-center sm:justify-between gap-8">
        <div className="max-w-xl">
          <h3 className="font-display text-3xl mb-3">Не сте сигурни коя процедура е за вас?</h3>
          <p className="text-taupe-600">
            Обадете ни се и ще ви помогнем да изберете според вашата кожа и желания резултат.
          </p>
        </div>
        <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-3 shrink-0">
          <Button asChild size="lg">
            <a href={`tel:${BUSINESS.phone}`}>Обадете се</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/rezervacii">Запази час</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
