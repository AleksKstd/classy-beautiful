import { 
  Footprints,
  Eye, 
  Sparkles,
  Droplet, 
  Zap, 
  Scan,
  User,
  Users,
  Heart,
  Activity,
  Layers,
  HandMetal
} from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { Procedure } from "@/types/database";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProceduresGridProps {
  procedures: Procedure[];
}

// Map procedure types to icons (lineart style from Lucide)
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  // Nails
  "Нокти": Footprints,
  // Face categories
  "Вежди": Eye,
  "Мигли": Sparkles,
  "Терапии за лице": Droplet,
  "Естетични процедури - лице": Scan,
  // Epilation - Women (under Епилация -> Епилация жени)
  "Лазерна епилация - жени": Zap,
  "Кола маска - жени": User,
  // Epilation - Men (under Епилация -> Епилация мъже)
  "Лазерна епилация - мъже": Zap,
  "Кола маска - мъже": Users,
  // Body categories
  "Естетични процедури - тяло": Activity,
  "Пилинг на тяло": Layers,
  "Пресотерапия и лимфендренаж": HandMetal,
};

// Get icon for category, with fallback
function getCategoryIcon(type: string) {
  const Icon = categoryIcons[type] || Heart;
  return Icon;
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

  // Group by sections with hierarchy
  let currentMainSection = "";
  let currentSubSection = "";
  const categoriesWithSections = sortedCategories.map(category => {
    const sectionInfo = getSectionInfo(category);
    const showMainSection = sectionInfo.main !== currentMainSection;
    const showSubSection = sectionInfo.sub ? sectionInfo.sub !== currentSubSection : false;
    
    if (showMainSection) currentMainSection = sectionInfo.main;
    if (sectionInfo.sub && showSubSection) currentSubSection = sectionInfo.sub;
    
    return { 
      category, 
      mainSection: sectionInfo.main, 
      subSection: sectionInfo.sub,
      showMainSection, 
      showSubSection 
    };
  });

  return (
    <div className="space-y-8">
      {categoriesWithSections.map(({ category, mainSection, subSection, showMainSection, showSubSection }) => {
        const procs = groupedProcedures[category];
        const Icon = getCategoryIcon(category);
        
        return (
          <div key={category} className="animate-fade-in-up">
            {/* Main Section Header */}
            {showMainSection && (
              <div className="mb-6 mt-8 first:mt-0">
                <h2 className="text-2xl font-bold text-gold tracking-wide">{mainSection}</h2>
                <div className="h-0.5 w-16 bg-gold/50 mt-2" />
              </div>
            )}
            
            {/* Sub Section Header (for Епилация жени/мъже) */}
            {showSubSection && subSection && (
              <div className="mb-4 mt-6 ml-4 pl-4 border-l-2 border-gold/30">
                <h3 className="text-lg font-semibold text-gray-700">{subSection}</h3>
              </div>
            )}
            
            {/* Category Header */}
            <div 
              className="flex items-center gap-3 mb-4 ml-4 group cursor-pointer" 
              id={category.toLowerCase().replace(/\s+/g, "-")}
            >
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-gold/20 group-hover:scale-110">
                <Icon className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-base font-medium text-gray-800">{category}</h4>
                <p className="text-xs text-gray-400">{procs.length} процедури</p>
              </div>
            </div>

            {/* Procedures Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
              {procs.map((procedure) => {
                const hasDiscount = procedure.discount_percentage && procedure.discount_percentage > 0;
                const discountedPrice = hasDiscount
                  ? procedure.price - (procedure.price * procedure.discount_percentage!) / 100
                  : procedure.price;

                return (
                  <div
                    key={procedure.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-gold/30 group"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg flex-1 pr-2">
                          {procedure.name}
                        </h3>
                        {hasDiscount && (
                          <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded flex-shrink-0">
                            -{procedure.discount_percentage}%
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {procedure.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {procedure.description}
                        </p>
                      )}

                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Продължителност:</span>
                          <span className="font-medium">
                            {formatDuration(procedure.duration_minutes)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Специалист:</span>
                          <span className="font-medium">{procedure.technician}</span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="pt-4 border-t border-gray-100">
                        {hasDiscount ? (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 line-through text-sm">
                              {formatPrice(procedure.price)}
                            </span>
                            <span className="text-2xl font-bold text-gold">
                              {formatPrice(discountedPrice)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-2xl font-bold text-gold">
                              {formatPrice(procedure.price)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <Button asChild className="w-full" size="sm">
                        <Link href="/rezervacii">
                          ЗАПАЗИ ЧАС
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-gold/10 to-transparent rounded-xl p-8 text-center border-2 border-gold/20">
        <h3 className="text-2xl font-bold mb-3">
          Не намирате това, което търсите?
        </h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Свържете се с нас директно и ще се радваме да отговорим на всички ваши въпроси
          и да ви помогнем да изберете подходящата процедура.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <a href="tel:+359123456789">ОБАДЕТЕ СЕ</a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/rezervacii">ЗАПАЗИ ЧАС</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
