"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ReservationLog {
  id: string;
  procedure_id: string;
  office_name: string;
  booked_at: string;
}

interface Procedure {
  id: string;
  name: string;
  type: string;
  price: number;
}

interface StatisticsManagerProps {
  procedures: Procedure[];
  reservationLogs: ReservationLog[];
}

type PopularityLevel = 
  | "Най-популярна"
  | "Много популярна"
  | "Популярна"
  | "Средна"
  | "Не много популярна"
  | "Непопулярна"
  | "Най-непопулярна";

const popularityConfig: Record<PopularityLevel, { color: string; bgColor: string; icon: "up" | "down" | "neutral" }> = {
  "Най-популярна": { color: "text-emerald-700", bgColor: "bg-emerald-100", icon: "up" },
  "Много популярна": { color: "text-green-700", bgColor: "bg-green-100", icon: "up" },
  "Популярна": { color: "text-lime-700", bgColor: "bg-lime-100", icon: "up" },
  "Средна": { color: "text-amber-700", bgColor: "bg-amber-100", icon: "neutral" },
  "Не много популярна": { color: "text-orange-700", bgColor: "bg-orange-100", icon: "down" },
  "Непопулярна": { color: "text-red-600", bgColor: "bg-red-100", icon: "down" },
  "Най-непопулярна": { color: "text-red-800", bgColor: "bg-red-200", icon: "down" },
};

export function StatisticsManager({ procedures, reservationLogs }: StatisticsManagerProps) {
  const procedureStats = useMemo(() => {
    // Count reservations per procedure
    const counts: Record<string, number> = {};
    procedures.forEach(p => {
      counts[p.id] = 0;
    });
    
    reservationLogs.forEach(log => {
      if (counts[log.procedure_id] !== undefined) {
        counts[log.procedure_id]++;
      }
    });

    // Calculate statistics
    const totalReservations = reservationLogs.length;
    const countValues = Object.values(counts);
    const maxCount = Math.max(...countValues, 1);
    const minCount = Math.min(...countValues);

    // Map procedures with their stats
    const stats = procedures.map(proc => {
      const count = counts[proc.id] || 0;
      const percentage = totalReservations > 0 ? (count / totalReservations) * 100 : 0;
      
      // Determine popularity level based on relative position
      let popularity: PopularityLevel;
      if (totalReservations === 0) {
        popularity = "Средна";
      } else if (count === maxCount && count > 0) {
        popularity = "Най-популярна";
      } else if (count === minCount && procedures.length > 1) {
        popularity = "Най-непопулярна";
      } else {
        // Calculate percentile
        const percentile = maxCount > 0 ? (count / maxCount) * 100 : 0;
        if (percentile >= 80) popularity = "Много популярна";
        else if (percentile >= 60) popularity = "Популярна";
        else if (percentile >= 40) popularity = "Средна";
        else if (percentile >= 20) popularity = "Не много популярна";
        else popularity = "Непопулярна";
      }

      return {
        procedure: proc,
        count,
        percentage,
        popularity,
      };
    });

    // Sort by count descending
    return stats.sort((a, b) => b.count - a.count);
  }, [procedures, reservationLogs]);

  const totalReservations = reservationLogs.length;

  const PopularityIcon = ({ type }: { type: "up" | "down" | "neutral" }) => {
    if (type === "up") return <TrendingUp className="w-4 h-4" />;
    if (type === "down") return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold">Статистика на процедурите</h2>
        <div className="text-sm text-gray-500">
          Общо резервации: <span className="font-semibold text-brand-black">{totalReservations}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Легенда за популярност:</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(popularityConfig).map(([label, config]) => (
            <span
              key={label}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
            >
              <PopularityIcon type={config.icon} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Procedures list */}
      {procedures.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <p className="text-gray-500">Няма процедури</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Процедура</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Категория</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Резервации</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">%</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-700">Популярност</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {procedureStats.map((stat, index) => {
                const config = popularityConfig[stat.popularity];
                return (
                  <tr key={stat.procedure.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-6">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{stat.procedure.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{stat.procedure.type}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-900">{stat.count}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {stat.percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
                      >
                        <PopularityIcon type={config.icon} />
                        {stat.popularity}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalReservations === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Забележка:</strong> Все още няма данни за резервации. Популярността ще се изчислява 
            автоматично след като започнат да се правят резервации през сайта.
          </p>
        </div>
      )}
    </div>
  );
}
