import { requireAdmin } from "@/lib/auth/admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { ReservationWithProcedure } from "@/components/admin/bookings-manager";
import { getAdminSettings, getCalendarFeedInfo, getDashboardData } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAdmin();

  const [data, adminSettings, calendarFeed] = await Promise.all([
    getDashboardData(),
    getAdminSettings(),
    getCalendarFeedInfo(),
  ]);

  return (
    <AdminDashboard
      procedures={data.procedures}
      schedules={data.schedules}
      carouselImages={data.carouselImages}
      reservationLogs={data.reservationLogs}
      reservations={data.reservations as unknown as ReservationWithProcedure[]}
      adminSettings={adminSettings}
      calendarFeed={calendarFeed}
    />
  );
}
