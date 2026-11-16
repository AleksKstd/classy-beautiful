import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import {
  newReservationAdminEmail,
  reservationCancelledEmail,
  reservationConfirmedEmail,
  reservationReceivedEmail,
  reservationRescheduledEmail,
  type EmailReservation,
} from "@/lib/email/templates";
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

export type CustomerNotice =
  | { kind: "received" }
  | { kind: "confirmed" }
  | { kind: "cancelled"; reason: string | null }
  | { kind: "rescheduled"; previousStartAt: string };

/**
 * Emails the customer about the state of their booking. Never throws: a
 * failed email must not undo the booking change that triggered it.
 */
export async function notifyCustomer(reservationId: string, notice: CustomerNotice): Promise<void> {
  try {
    const reservation = await loadReservation(reservationId);
    if (!reservation || !reservation.customer_email) return;

    const content =
      notice.kind === "received"
        ? reservationReceivedEmail(reservation)
        : notice.kind === "confirmed"
          ? reservationConfirmedEmail(reservation)
          : notice.kind === "cancelled"
            ? reservationCancelledEmail(reservation, notice.reason)
            : reservationRescheduledEmail(reservation, notice.previousStartAt);

    const sent = await sendEmail({ to: reservation.customer_email, ...content });
    if (sent && notice.kind === "confirmed") {
      await createAdminClient().from("reservations").update({ confirmation_email_sent: true }).eq("id", reservationId);
    }
  } catch (error) {
    console.error(`Failed to send "${notice.kind}" email:`, error);
  }
}
