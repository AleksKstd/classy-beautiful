import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const isAuth = await isAdminAuthenticated();
  
  if (!isAuth) {
    redirect("/admin");
  }

  const supabase = await createClient();

  // Fetch all data needed for dashboard
  const [proceduresResult, schedulesResult, carouselResult, reservationLogsResult] = await Promise.all([
    supabase.from("procedures").select("*").order("type", { ascending: true }),
    supabase.from("schedules").select("*").order("closed_date_start", { ascending: true }),
    supabase.from("carousel_images").select("*").order("display_order", { ascending: true }),
    supabase.from("reservation_logs").select("*").order("booked_at", { ascending: false }),
  ]);

  return (
    <AdminDashboard
      procedures={proceduresResult.data || []}
      schedules={schedulesResult.data || []}
      carouselImages={carouselResult.data || []}
      reservationLogs={reservationLogsResult.data || []}
    />
  );
}
