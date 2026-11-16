import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminSettingsData } from "@/lib/validation";

export async function getAdminSettings(): Promise<AdminSettingsData> {
  const { data } = await createAdminClient().from("admin_settings").select("setting_key, setting_value");
  const map = Object.fromEntries((data ?? []).map((s) => [s.setting_key, s.setting_value ?? ""]));
  return {
    adminEmail: map["admin_email"] || "",
    notificationEnabled: map["notification_enabled"] === "true",
  };
}

/** Private calendar feed URL (with secret token) and a locally generated QR code. */
export async function getCalendarFeedInfo(): Promise<{ feedUrl: string; googleUrl: string; qrDataUrl: string } | null> {
  const token = process.env.CALENDAR_FEED_TOKEN;
  if (!token || token.length < 32) return null;
  const feedUrl = `${SITE_URL}/api/calendar/feed.ics?token=${encodeURIComponent(token)}`;
  const googleUrl = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`;
  const qrDataUrl = await QRCode.toDataURL(googleUrl, { width: 200, margin: 1 });
  return { feedUrl, googleUrl, qrDataUrl };
}

export async function getDashboardData() {
  const supabase = createAdminClient();
  const [procedures, schedules, carouselImages, reservationLogs, reservations] = await Promise.all([
    supabase.from("procedures").select("*").order("type", { ascending: true }),
    supabase.from("schedules").select("*").order("closed_date_start", { ascending: true }),
    supabase.from("carousel_images").select("*").order("display_order", { ascending: true }),
    supabase.from("reservation_logs").select("*").order("booked_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("*, procedure:procedures(id, name, duration_minutes, price, technician)")
      .order("start_at", { ascending: true }),
  ]);

  return {
    procedures: procedures.data ?? [],
    schedules: schedules.data ?? [],
    carouselImages: carouselImages.data ?? [],
    reservationLogs: reservationLogs.data ?? [],
    reservations: reservations.data ?? [],
  };
}
