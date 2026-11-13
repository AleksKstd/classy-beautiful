import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { newReservationAdminEmail, reservationConfirmedEmail, type EmailReservation } from "@/lib/email/templates";
import { getFinalPrice } from "@/lib/pricing";

async function loadReservation(reservationId: string): Promise<EmailReservation | null> {
  const { data } = await createAdminClient()
    .from("reservations")
    .select("*, procedure:procedures(name, duration_minutes, price, discount_percentage)")
    .eq("id", reservationId)
    .single();
  if (!data) return null;

  const procedure = data.procedure as unknown as {
    name: string;
    duration_minutes: number;
    price: number;
    discount_percentage: number | null;
  } | null;

  return {
    ...data,
    procedureName: procedure?.name ?? "Процедура",
    durationMinutes: procedure?.duration_minutes ?? 0,
    price: procedure ? getFinalPrice(procedure) : 0,
  };
}

/** Emails the admin about a new booking, if notifications are enabled. */
export async function notifyAdminNewReservation(reservationId: string): Promise<void> {
  try {
    const { data: settings } = await createAdminClient()
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["admin_email", "notification_enabled"]);
    const map = Object.fromEntries((settings ?? []).map((s) => [s.setting_key, s.setting_value]));
    if (map["notification_enabled"] !== "true" || !map["admin_email"]) return;

    const reservation = await loadReservation(reservationId);
    if (!reservation) return;
    await sendEmail({ to: map["admin_email"], ...newReservationAdminEmail(reservation) });
  } catch (error) {
    console.error("Failed to notify admin:", error);
  }
}

/** Sends the confirmation email once; marks it as sent only on success. */
export async function sendReservationConfirmation(reservationId: string): Promise<void> {
  try {
    const supabase = createAdminClient();
    const reservation = await loadReservation(reservationId);
    if (!reservation || !reservation.customer_email) return;

    const sent = await sendEmail({ to: reservation.customer_email, ...reservationConfirmedEmail(reservation) });
    if (sent) {
      await supabase.from("reservations").update({ confirmation_email_sent: true }).eq("id", reservationId);
    }
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
  }
}
