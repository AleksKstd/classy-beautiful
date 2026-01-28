import Link from "next/link";
import { Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { Procedure } from "@/types/database";

interface DiscountsSectionProps {
  procedures: Procedure[];
}

export function DiscountsSection({ procedures }: DiscountsSectionProps) {
  if (procedures.length === 0) {
    return null;
  }

  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100;
  };

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-gold mb-3">
            <Tag className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Специални оферти
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Текущи отстъпки
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Възползвайте се от нашите специални промоции
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {procedures.map((procedure) => {
            const discountedPrice = calculateDiscountedPrice(
              procedure.price,
              procedure.discount_percentage || 0
            );

            return (
              <div
                key={procedure.id}
                className="bg-gradient-to-br from-gold/5 to-transparent rounded-xl p-6 border-2 border-gold/20 hover:border-gold/40 transition-colors relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <div className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
                    -{procedure.discount_percentage}%
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2 pr-16">
                  {procedure.name}
                </h3>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <span>{formatDuration(procedure.duration_minutes)}</span>
                  <span>•</span>
                  <span>{procedure.technician}</span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-gray-400 line-through text-lg">
                    {formatPrice(procedure.price)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gold" aria-hidden="true" />
                  <span className="text-2xl font-bold text-gold">
                    {formatPrice(discountedPrice)}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Спестявате {formatPrice(procedure.price - discountedPrice)}
                </p>

                <Button asChild size="sm" className="w-full">
                  <Link href={`/rezervacii?procedureId=${procedure.id}`}>
                    ЗАПАЗИ ЧАС
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button asChild size="lg">
            <Link href="/rezervacii">
              ЗАПАЗИ ЧАС С ОТСТЪПКА
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
