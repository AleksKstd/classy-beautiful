import { TrendingUp } from "lucide-react";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { Procedure } from "@/types/database";

interface PopularProceduresProps {
  procedures: Procedure[];
}

export function PopularProcedures({ procedures }: PopularProceduresProps) {
  if (procedures.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-gold mb-3">
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Най-търсени
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Популярни процедури
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Най-резервираните процедури от нашите клиенти през последния месец
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {procedures.map((procedure, index) => (
            <div
              key={procedure.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold font-bold text-sm">
                    {index + 1}
                  </span>
                </div>
                {procedure.discount_percentage && procedure.discount_percentage > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-1 rounded">
                    -{procedure.discount_percentage}%
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mb-2">{procedure.name}</h3>
              
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <span>{formatDuration(procedure.duration_minutes)}</span>
                <span>•</span>
                <span>{procedure.technician}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gold">
                  {formatPrice(procedure.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
