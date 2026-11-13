"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { validateSlot } from "@/lib/booking";
import { sendReservationConfirmation } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { zonedToUtc } from "@/lib/time";
import { dateKeySchema, officeSchema, timeSchema } from "@/lib/validation";

type Result = { success: boolean; error?: string };

const idSchema = z.string().uuid();

export async function confirmReservation(reservationId: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(reservationId).success) return { success: false, error: "Невалидна резервация." };

  const { data, error } = await createAdminClient()
    .from("reservations")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", reservationId)
    .eq("status", "pending")
    .select("id, confirmation_email_sent")
    .single();

  if (error || !data) {
    return { success: false, error: "Грешка при потвърждаване на резервацията." };
  }

  if (!data.confirmation_email_sent) {
    await sendReservationConfirmation(reservationId);
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function cancelReservation(reservationId: string, reason?: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(reservationId).success) return { success: false, error: "Невалидна резервация." };
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cleanReason || null,
    })
    .eq("id", reservationId);

  if (error) {
    return { success: false, error: "Грешка при отмяна на резервацията." };
  }

  // Cancelled bookings should not count towards "popular procedures" / statistics.
  await supabase.from("reservation_logs").delete().eq("reservation_id", reservationId);

  revalidatePath("/admin/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function rescheduleReservation(
  reservationId: string,
  dateKey: string,
  time: string
): Promise<Result & { startAt?: string; endAt?: string }> {
  await requireAdmin();
  if (
    !idSchema.safeParse(reservationId).success ||
    !dateKeySchema.safeParse(dateKey).success ||
    !timeSchema.safeParse(time).success
  ) {
    return { success: false, error: "Невалидни данни." };
  }

  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from("reservations")
    .select("*, procedure:procedures(duration_minutes)")
    .eq("id", reservationId)
    .single();

  if (!current) {
    return { success: false, error: "Резервацията не е намерена." };
  }

  const duration =
    (current.procedure as unknown as { duration_minutes: number } | null)?.duration_minutes ??
    Math.round((new Date(current.end_at).getTime() - new Date(current.start_at).getTime()) / 60000);

  const slotError = await validateSlot({
    officeName: officeSchema.parse(current.office_name),
    dateKey,
    time,
    durationMinutes: duration,
    excludeReservationId: reservationId,
  });
  if (slotError) return { success: false, error: slotError };

  const newStart = zonedToUtc(dateKey, time);
  const newEnd = new Date(newStart.getTime() + duration * 60000);

  const { error } = await supabase
    .from("reservations")
    .update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      original_start_at: current.original_start_at || current.start_at,
      rescheduled_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (error) {
    if (error.code === "23P01") return { success: false, error: "Избраният час вече е зает." };
    return { success: false, error: "Грешка при преместване на резервацията." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true, startAt: newStart.toISOString(), endAt: newEnd.toISOString() };
}
