"use client";

import { useState } from "react";
import { adminLogout } from "@/app/actions/admin/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Image, Calendar, Scissors, BarChart3, CalendarCheck, Cog } from "lucide-react";
import { ProceduresManager } from "./procedures-manager";
import { CarouselManager } from "./carousel-manager";
import { ScheduleManager } from "./schedule-manager";
import { StatisticsManager } from "./statistics-manager";
import { BookingsManager, type ReservationWithProcedure } from "./bookings-manager";
import { AdminSettings, type CalendarFeedInfo } from "./admin-settings";
import { saveAdminSettings } from "@/app/actions/admin/settings";
import type { AdminSettingsData } from "@/lib/validation";
import type { CarouselImage, Procedure, ReservationLog, Schedule } from "@/types/database";

interface AdminDashboardProps {
  procedures: Procedure[];
  schedules: Schedule[];
  carouselImages: CarouselImage[];
  reservationLogs: ReservationLog[];
  reservations: ReservationWithProcedure[];
  adminSettings: AdminSettingsData;
  calendarFeed: CalendarFeedInfo | null;
}

type Tab = "bookings" | "procedures" | "carousel" | "schedule" | "statistics" | "settings";

export function AdminDashboard({
  procedures,
  schedules,
  carouselImages,
  reservationLogs,
  reservations,
  adminSettings,
  calendarFeed,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("bookings");

  // Count pending reservations
  const pendingCount = reservations.filter(r => r.status === "pending").length;

  const tabs: { id: Tab; label: string; icon: typeof CalendarCheck; badge?: number }[] = [
    { id: "bookings" as Tab, label: "Резервации", icon: CalendarCheck, badge: pendingCount },
    { id: "procedures" as Tab, label: "Процедури", icon: Scissors },
    { id: "carousel" as Tab, label: "Снимки", icon: Image },
    { id: "schedule" as Tab, label: "График", icon: Calendar },
    { id: "statistics" as Tab, label: "Статистика", icon: BarChart3 },
    { id: "settings" as Tab, label: "Настройки", icon: Cog },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-gold" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Админ панел</h1>
                <p className="text-xs text-gray-500">Classy & Beautiful</p>
              </div>
            </div>

            <form action={adminLogout}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="w-4 h-4 mr-2" />
                Изход
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-2 overflow-x-auto" aria-label="Табове">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "border-gold text-gold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {!!tab.badge && tab.badge > 0 && (
                    <span className="bg-yellow-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "bookings" && (
          <BookingsManager reservations={reservations} />
        )}
        {activeTab === "procedures" && (
          <ProceduresManager procedures={procedures} />
        )}
        {activeTab === "carousel" && (
          <CarouselManager images={carouselImages} procedures={procedures} />
        )}
        {activeTab === "schedule" && (
          <ScheduleManager schedules={schedules} />
        )}
        {activeTab === "statistics" && (
          <StatisticsManager procedures={procedures} reservationLogs={reservationLogs} />
        )}
        {activeTab === "settings" && (
          <AdminSettings 
            adminEmail={adminSettings.adminEmail}
            notificationEnabled={adminSettings.notificationEnabled}
            onSave={saveAdminSettings}
            calendarFeed={calendarFeed}
          />
        )}
      </div>
    </div>
  );
}
