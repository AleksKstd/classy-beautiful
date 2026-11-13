import { formatPrice, formatDuration } from "@/lib/utils";
import { getFinalPrice, hasDiscount as procedureHasDiscount } from "@/lib/pricing";
import { BUSINESS } from "@/config/site";
import type { Procedure } from "@/types/database";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProceduresGridProps {
  procedures: Procedure[];
}

// Define category order for better organization
const categoryOrder = [
  "Нокти",
  "Вежди",
  "Мигли",
  "Терапии за лице",
  "Естетични процедури - лице",
  "Лазерна епилация - жени",
  "Кола маска - жени",
  "Лазерна епилация - мъже",
  "Кола маска - мъже",
  "Естетични процедури - тяло",
  "Пилинг на тяло",
  "Пресотерапия и лимфендренаж",
];

// Section groupings - hierarchical structure
// Епилация has sub-groups: Епилация жени and Епилация мъже
const sectionGroups: Record<string, { main: string; sub?: string }> = {
  "Нокти": { main: "Нокти" },
  "Вежди": { main: "Лице" },
  "Мигли": { main: "Лице" },
  "Терапии за лице": { main: "Лице" },
  "Естетични процедури - лице": { main: "Лице" },
  "Лазерна епилация - жени": { main: "Епилация", sub: "Епилация жени" },
  "Кола маска - жени": { main: "Епилация", sub: "Епилация жени" },
  "Лазерна епилация - мъже": { main: "Епилация", sub: "Епилация мъже" },
  "Кола маска - мъже": { main: "Епилация", sub: "Епилация мъже" },
  "Естетични процедури - тяло": { main: "Тяло" },
  "Пилинг на тяло": { main: "Тяло" },
  "Пресотерапия и лимфендренаж": { main: "Тяло" },
};

// Helper to get section info for any type (handles custom types)
function getSectionInfo(type: string): { main: string; sub?: string } {
  return sectionGroups[type] || { main: "Други" };
}

// Anchor ids for the main sections (used by the jump links)
const sectionIds: Record<string, string> = {
  "Нокти": "nokti",
  "Лице": "lice",
  "Епилация": "epilaciya",
  "Тяло": "tyalo",
  "Други": "drugi",
};

export function ProceduresGrid({ procedures }: ProceduresGridProps) {
  // Group procedures by type
  const groupedProcedures = procedures.reduce((acc, proc) => {
    if (!acc[proc.type]) {
      acc[proc.type] = [];
    }
    acc[proc.type].push(proc);
    return acc;
  }, {} as Record<string, Procedure[]>);

  // Sort categories by defined order
  const sortedCategories = Object.keys(groupedProcedures).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Group by sections with hierarchy: show a section header only when it changes
  const categoriesWithSections = sortedCategories.map((category, index) => {
    const sectionInfo = getSectionInfo(category);
    const previous = sortedCategories.slice(0, index).map(getSectionInfo);
    const lastMain = previous.length ? previous[previous.length - 1].main : "";
    const lastSub = [...previous].reverse().find((info) => info.sub)?.sub ?? "";
    const showMainSection = sectionInfo.main !== lastMain;
    const showSubSection = sectionInfo.sub ? sectionInfo.sub !== lastSub : false;

    return { 
      category, 
      mainSection: sectionInfo.main, 
      subSection: sectionInfo.sub,
      showMainSection, 
      showSubSection 
    };
  });

  const mainSections = categoriesWithSections.filter((c) => c.showMainSection).map((c) => c.mainSection);

  return (
    <div>
      {/* Jump links */}
      {mainSections.length > 1 && (
        <nav
          aria-label="Категории"
          className="sticky top-20 z-30 -mx-4 mb-10 overflow-x-auto bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0"
        >
          <ul className="flex gap-2 whitespace-nowrap">
            {mainSections.map((section) => (
              <li key={section}>
                <a
                  href={`#${sectionIds[section] ?? "drugi"}`}
                  className="inline-block rounded-md bg-blush-light px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cocoa transition-colors hover:bg-blush"
                >
                  {section}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="space-y-6">
        {categoriesWithSections.map(({ category, mainSection, subSection, showMainSection, showSubSection }) => {
          const procs = groupedProcedures[category];

          return (
            <div key={category}>
              {/* Main section header */}
              {showMainSection && (
                <h2
                  id={sectionIds[mainSection] ?? "drugi"}
                  className="scroll-mt-40 pt-10 first:pt-0 mb-6 text-4xl sm:text-5xl text-cocoa border-b border-gold/40 pb-4"
                >
                  {mainSection}
                </h2>
              )}

              {/* Sub section header (Епилация жени / мъже) */}
              {showSubSection && subSection && (
                <p className="eyebrow mt-8 mb-2">{subSection}</p>
              )}

              {/* Category */}
              <div className="mt-6">
                <h3 className="flex items-baseline justify-between gap-4 mb-1">
                  <span className="font-display text-2xl">{category}</span>
                  <span className="text-xs text-gray-500">{procs.length} процедури</span>
                </h3>

                <ul className="mt-3 overflow-hidden rounded-3xl bg-blush-light/60 px-2 sm:px-4 divide-y divide-blush">
                  {procs.map((procedure) => {
                    const hasDiscount = procedureHasDiscount(procedure);
                    const discountedPrice = getFinalPrice(procedure);

                    return (
                      <li key={procedure.id}>
                        <Link
                          href={`/rezervacii?procedureId=${procedure.id}`}
                          className="group grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_7rem_8rem_6rem] items-baseline gap-x-6 gap-y-1 px-3 py-4 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-dark"
                        >
                          <span>
                            <span className="text-brand-black">{procedure.name}</span>
                            {hasDiscount && (
                              <span className="ml-2 rounded bg-rose-dark px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">
                                −{procedure.discount_percentage}%
                              </span>
                            )}
                            {procedure.description && (
                              <span className="mt-1 block text-sm text-gray-600 line-clamp-2">{procedure.description}</span>
                            )}
                            <span className="mt-1 block text-sm text-gray-600 sm:hidden">
                              {formatDuration(procedure.duration_minutes)} · {procedure.technician}
                            </span>
                          </span>
                          <span className="hidden sm:block text-sm text-gray-600">
                            {formatDuration(procedure.duration_minutes)}
                          </span>
                          <span className="text-right whitespace-nowrap">
                            {hasDiscount && (
                              <span className="mr-2 text-sm text-gray-400 line-through">{formatPrice(procedure.price)}</span>
                            )}
                            <span className="font-display text-xl text-cocoa">{formatPrice(discountedPrice)}</span>
                          </span>
                          <span className="hidden sm:inline-flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-dark transition-colors group-hover:text-cocoa">
                            Запази
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact */}
      <div className="mt-20 rounded-[2rem] bg-champagne p-8 sm:p-12 sm:flex sm:items-center sm:justify-between gap-8">
        <div className="max-w-xl">
          <h3 className="font-display text-3xl mb-3">Не сте сигурни коя процедура е за вас?</h3>
          <p className="text-gray-600">
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
