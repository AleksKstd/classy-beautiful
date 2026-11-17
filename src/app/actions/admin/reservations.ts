"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { getDaySlots, validateSlot } from "@/lib/booking";
import { notifyCustomer } from "@/lib/notifications";
import { canBookWith, offerVisitMinutes, promotionOffer, type PromotionOffer } from "@/lib/promotions";
import type { DaySlot } from "@/lib/slots";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDaysToKey, toDateKey, zonedToUtc } from "@/lib/time";
import {
  adminReservationSchema,
  dateKeySchema,
  fieldErrors,
  normalizePhone,
  officeSchema,
  timeSchema,
} from "@/lib/validation";

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
    .select("id, start_at")
    .maybeSingle();

  if (error) {
    return { success: false, error: "Грешка при потвърждаване на резервацията." };
  }
  if (!data) {
    return { success: false, error: "Резервацията вече е потвърдена или отменена." };
  }

  // No "we are expecting you" email for a visit that has already passed.
  if (new Date(data.start_at).getTime() > Date.now()) {
    await notifyCustomer(reservationId, { kind: "confirmed" });
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function cancelReservation(reservationId: string, reason?: string): Promise<Result> {
  await requireAdmin();
  if (!idSchema.safeParse(reservationId).success) return { success: false, error: "Невалидна резервация." };
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cleanReason || null,
    })
    .eq("id", reservationId)
    .in("status", ["pending", "confirmed"])
    .select("id, start_at")
    .maybeSingle();

  if (error) {
    return { success: false, error: "Грешка при отмяна на резервацията." };
  }
  if (!data) {
    return { success: false, error: "Резервацията вече е отменена." };
  }

  // Cancelled bookings should not count towards "popular procedures" / statistics.
  await supabase.from("reservation_logs").delete().eq("reservation_id", reservationId);

  // No email about visits that have already taken place.
  if (new Date(data.start_at).getTime() > Date.now()) {
    await notifyCustomer(reservationId, { kind: "cancelled", reason: cleanReason || null });
  }

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
    .select("*")
    .eq("id", reservationId)
    .single();

  if (!current) {
    return { success: false, error: "Резервацията не е намерена." };
  }
  if (current.status === "cancelled") {
    return { success: false, error: "Отменена резервация не може да бъде преместена." };
  }

  // Keep the booked length: a promotion visit can be longer than its first procedure.
  const duration = Math.round((new Date(current.end_at).getTime() - new Date(current.start_at).getTime()) / 60000);

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

  const { data: moved, error } = await supabase
    .from("reservations")
    .update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      original_start_at: current.original_start_at || current.start_at,
      rescheduled_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .in("status", ["pending", "confirmed"])
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23P01") return { success: false, error: "Избраният час вече е зает." };
    return { success: false, error: "Грешка при преместване на резервацията." };
  }
  if (!moved) {
    return { success: false, error: "Отменена резервация не може да бъде преместена." };
  }

  if (newStart.getTime() !== new Date(current.start_at).getTime()) {
    await notifyCustomer(reservationId, { kind: "rescheduled", previousStartAt: current.start_at });
  }

  revalidatePath("/admin/dashboard");
  return { success: true, startAt: newStart.toISOString(), endAt: newEnd.toISOString() };
}

/** How far ahead the admin can add a booking. */
const ADMIN_BOOKING_DAYS = 365;

function withinAdminWindow(dateKey: string): boolean {
  const today = toDateKey(new Date());
  return dateKey >= today && dateKey <= addDaysToKey(today, ADMIN_BOOKING_DAYS);
}

/** Slots of a day for the admin's new-booking form (today is allowed, unlike online). */
export async function getAdminDaySlots(
  officeName: string,
  dateKey: string,
  durationMinutes: number
): Promise<{ slots: DaySlot[]; error?: string }> {
  await requireAdmin();
  const office = officeSchema.safeParse(officeName);
  const duration = z.number().int().min(5).max(600).safeParse(durationMinutes);
  if (!office.success || !dateKeySchema.safeParse(dateKey).success || !duration.success) {
    return { slots: [], error: "Невалидни данни." };
  }
  if (!withinAdminWindow(dateKey)) return { slots: [], error: "Изберете дата от днес нататък." };
  try {
    return { slots: await getDaySlots({ officeName: office.data, dateKey, durationMinutes: duration.data }) };
  } catch (error) {
    console.error("Error loading admin day slots:", error);
    return { slots: [], error: "Свободните часове не могат да бъдат заредени." };
  }
}

/**
 * A booking added by the admin (e.g. taken by phone, or the next visit of a
 * promotion). It is confirmed straight away; the client gets the confirmation
 * email only when an email address is given and the admin chose to send it.
 */
export async function createAdminReservation(
  input: unknown
): Promise<Result & { fieldErrors?: Record<string, string>; startAt?: string }> {
  await requireAdmin();
  const parsed = adminReservationSchema.safeParse(input);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { success: false, error: Object.values(errors)[0], fieldErrors: errors };
  }
  const data = parsed.data;
  if (!withinAdminWindow(data.date)) return { success: false, error: "Изберете дата от днес нататък." };

  try {
    const supabase = createAdminClient();
    const { data: procedure } = await supabase.from("procedures").select("*").eq("id", data.procedureId).maybeSingle();
    // Without a promotion only active procedures (with one, its procedures may have been hidden since)
    if (!procedure || (!data.promotionId && !procedure.is_active)) {
      return { success: false, error: "Процедурата не е намерена." };
    }

    // With a promotion (also an ended one: its later visits are still booked
    // here), the procedure must be part of it.
    let offer: PromotionOffer | null = null;
    if (data.promotionId) {
      const { data: promotion } = await supabase.from("promotions").select("*").eq("id", data.promotionId).maybeSingle();
      if (promotion) {
        const { data: included } = await supabase.from("procedures").select("*").in("id", promotion.procedure_ids);
        offer = promotionOffer({ ...promotion, is_active: true }, included ?? []);
      }
      if (!offer || !canBookWith(offer, procedure.id)) {
        return { success: false, error: "Процедурата не е част от избраната промоция." };
      }
    }
    const durationMinutes = offer ? offerVisitMinutes(offer, procedure) : procedure.duration_minutes;

    const slotError = await validateSlot({
      officeName: data.officeName,
      dateKey: data.date,
      time: data.time,
      durationMinutes,
    });
    if (slotError) return { success: false, error: slotError };

    const startAt = zonedToUtc(data.date, data.time);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);
    const now = new Date().toISOString();

    const { data: reservation, error } = await supabase
      .from("reservations")
      .insert({
        procedure_id: procedure.id,
        office_name: data.officeName,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        customer_first_name: data.firstName,
        customer_last_name: data.lastName || "",
        customer_phone: normalizePhone(data.phone)!,
        customer_email: (data.email || "").toLowerCase(),
        customer_note: data.note || null,
        status: "confirmed",
        confirmed_at: now,
        ...(offer ? { promotion_id: offer.promotion.id } : {}),
      })
      .select("id")
      .single();

    if (error || !reservation) {
      if (error?.code === "23P01") return { success: false, error: "Избраният час вече е зает." };
      console.error("Error creating admin reservation:", error);
      return { success: false, error: "Грешка при създаване на резервацията." };
    }

    const { error: logError } = await supabase.from("reservation_logs").insert({
      procedure_id: procedure.id,
      office_name: data.officeName,
      source: "admin",
      reservation_id: reservation.id,
    });
    if (logError) console.error("Error logging admin reservation:", logError);

    if (data.email && data.sendEmail) {
      await notifyCustomer(reservation.id, { kind: "confirmed" });
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/");
    return { success: true, startAt: startAt.toISOString() };
  } catch (error) {
    console.error("Unexpected error creating admin reservation:", error);
    return { success: false, error: "Грешка при създаване на резервацията." };
  }
}
