"use server";

import { revalidatePath } from "next/cache";
import { BUSINESS, MAX_ACTIVE_BOOKINGS_PER_PHONE, type OfficeName } from "@/config/site";
import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdminNewReservation, notifyCustomer } from "@/lib/notifications";
import { getFinalPrice } from "@/lib/pricing";
import { getActivePromotions } from "@/lib/data/promotions";
import { canBookWith, isPromotionLive, offerBookingName, offerVisitMinutes, promotionOffer, type PromotionOffer } from "@/lib/promotions";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { fetchBookedRanges, fetchBookedRangesBetween, validateSlot } from "@/lib/booking";
import { getBookingWindow, isWithinBookingWindow, type TimeRange } from "@/lib/slots";
import { dayRangeUtc, zonedToUtc } from "@/lib/time";
import {
  dateKeySchema,
  fieldErrors,
  normalizePhone,
  officeSchema,
  reservationRequestSchema,
} from "@/lib/validation";
import type { Procedure, Promotion } from "@/types/database";

/*
 * Public server actions used by the booking wizard. Everything exported from
 * this file is reachable by anyone, so each action validates its input and
 * returns only non-sensitive data.
 */

const TOO_MANY_ATTEMPTS = "Твърде много опити за резервация. Моля, опитайте по-късно или се обадете.";

export interface CreateReservationResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  reservation?: {
    id: string;
    officeName: string;
    procedureName: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    price: number;
    technician: string;
    email: string;
    /** Set when booked through a special promotion. */
    promotion: {
      badge: string;
      title: string;
      procedures: string[];
      priceNote: string | null;
      /** True for "N процедури за X €": only the first visit is booked online. */
      firstVisitOnly: boolean;
    } | null;
    firstName: string;
    lastName: string;
  };
}

export async function getBookingProcedures(): Promise<Procedure[]> {
  const { data, error } = await createPublicClient()
    .from("procedures")
    .select("*")
    .eq("is_active", true)
    .order("type")
    .order("name");
  if (error) {
    console.error("Error fetching procedures:", error);
    throw new Error("Процедурите не могат да бъдат заредени.");
  }
  return data ?? [];
}

/** Promotions that are on now (the wizard works out prices from the procedures it has). */
export async function getBookingPromotions(): Promise<Promotion[]> {
  const promotions = await getActivePromotions();
  return promotions.filter((promotion) => isPromotionLive(promotion));
}

/** Upcoming closures of an office (start/end only). */
export async function getOfficeClosures(officeName: OfficeName): Promise<TimeRange[]> {
  const office = officeSchema.parse(officeName);
  const { data, error } = await createPublicClient()
    .from("schedules")
    .select("closed_date_start, closed_date_end")
    .eq("office_name", office)
    .gte("closed_date_end", new Date().toISOString());
  if (error) {
    console.error("Error fetching schedule closures:", error);
    throw new Error("Графикът не може да бъде зареден.");
  }
  return (data ?? []).map((c) => ({ start: c.closed_date_start, end: c.closed_date_end }));
}

/** Booked time ranges for an office on a salon-local day ("yyyy-MM-dd"). No personal data. */
export async function getBookedSlots(officeName: OfficeName, dateKey: string): Promise<TimeRange[]> {
  const office = officeSchema.parse(officeName);
  const day = dateKeySchema.parse(dateKey);
  try {
    return await fetchBookedRanges(office, day);
  } catch (error) {
    console.error("Error fetching booked slots:", error);
    throw new Error("Заетите часове не могат да бъдат заредени.");
  }
}

/**
 * Booked time ranges for an office across the whole booking window
 * (times only, no personal data). Used to show how busy each day is.
 */
export async function getBookedRangesForWindow(officeName: OfficeName): Promise<TimeRange[]> {
  const office = officeSchema.parse(officeName);
  const { first, last } = getBookingWindow();
  try {
    return await fetchBookedRangesBetween(office, dayRangeUtc(first).start, dayRangeUtc(last).end);
  } catch (error) {
    console.error("Error fetching booked ranges:", error);
    throw new Error("Заетостта не може да бъде заредена.");
  }
}

export async function createReservation(input: unknown): Promise<CreateReservationResult> {
  const parsed = reservationRequestSchema.safeParse(input);
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return { success: false, error: Object.values(errors)[0], fieldErrors: errors };
  }
  const data = parsed.data;
  const phone = normalizePhone(data.phone)!;
  // Stored in lower case so the once-per-promotion check is not fooled by capitals
  const email = data.email.toLowerCase();

  if (!isWithinBookingWindow(data.date)) {
    return { success: false, error: "Избраната дата не е в периода за резервации." };
  }

  try {
    const ip = await getClientIp();
    const allowedIp = await rateLimit(`reserve:ip:${ip}`, 10, 60 * 60);
    if (!allowedIp) return { success: false, error: TOO_MANY_ATTEMPTS };

    const supabase = createAdminClient();

    const { data: procedure, error: procedureError } = await supabase
      .from("procedures")
      .select("*")
      .eq("id", data.procedureId)
      .eq("is_active", true)
      .single();
    if (procedureError || !procedure) {
      return { success: false, error: "Избраната процедура не е налична." };
    }

    // A booking through a promotion: the promotion must be live and include this
    // procedure; the visit then lasts and costs what the promotion says.
    let offer: PromotionOffer | null = null;
    if (data.promotionId) {
      const { data: promotion } = await supabase.from("promotions").select("*").eq("id", data.promotionId).maybeSingle();
      if (promotion && isPromotionLive(promotion)) {
        const { data: included } = await supabase.from("procedures").select("*").in("id", promotion.procedure_ids);
        offer = promotionOffer(promotion, included ?? []);
      }
      if (!offer || !canBookWith(offer, procedure.id)) {
        return { success: false, error: "Промоцията вече не е активна. Моля, изберете процедура отново." };
      }
    }
    const durationMinutes = offer ? offerVisitMinutes(offer, procedure) : procedure.duration_minutes;
    // For "N процедури за X €" this is the price of the whole offer (all visits), as advertised
    const visitPrice = offer ? offer.totalPrice : getFinalPrice(procedure);

    const { count: activeCount } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", phone)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", new Date().toISOString());
    if ((activeCount ?? 0) >= MAX_ACTIVE_BOOKINGS_PER_PHONE) {
      return {
        success: false,
        error: "Имате няколко предстоящи резервации. За нова резервация, моля, свържете се с нас по телефона.",
      };
    }

    // A promotion is booked online once per client: the first visit. The
    // remaining visits are arranged in the salon and added by the admin.
    if (offer) {
      const usedBy = (column: "customer_phone" | "customer_email", value: string) =>
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("promotion_id", offer.promotion.id)
          .eq(column, value)
          .neq("status", "cancelled");
      const [byPhone, byEmail] = await Promise.all([usedBy("customer_phone", phone), usedBy("customer_email", email)]);
      if (byPhone.error || byEmail.error) {
        console.error("Error checking promotion use:", byPhone.error ?? byEmail.error);
        return { success: false, error: "Възникна грешка при създаване на резервацията. Моля, опитайте отново." };
      }
      if ((byPhone.count ?? 0) > 0 || (byEmail.count ?? 0) > 0) {
        return {
          success: false,
          error: `Вече имате резервация по тази промоция. Следващите посещения уговаряме заедно в салона или на ${BUSINESS.phoneDisplay}.`,
        };
      }
    }

    const slotError = await validateSlot({
      officeName: data.officeName,
      dateKey: data.date,
      time: data.time,
      durationMinutes,
    });
    if (slotError) return { success: false, error: slotError };

    // Counted only for requests that are otherwise valid, so a failed attempt
    // (e.g. the time was just taken) does not use up the customer's allowance.
    // The email address is limited because every request sends it an email.
    const allowedPhone = await rateLimit(`reserve:phone:${phone}`, 5, 24 * 60 * 60);
    const allowedEmail = await rateLimit(`reserve:email:${email}`, 5, 24 * 60 * 60);
    if (!allowedPhone || !allowedEmail) return { success: false, error: TOO_MANY_ATTEMPTS };

    const startAt = zonedToUtc(data.date, data.time);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60000);

    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        procedure_id: procedure.id,
        office_name: data.officeName,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        customer_first_name: data.firstName,
        customer_last_name: data.lastName,
        customer_phone: phone,
        customer_email: email,
        customer_note: data.note || null,
        status: "pending",
        // Only sent with a promotion, so bookings keep working before migration 006
        ...(offer ? { promotion_id: offer.promotion.id } : {}),
      })
      .select("id")
      .single();

    if (insertError || !reservation) {
      // 23P01 = exclusion constraint: someone booked the same time a moment earlier
      if (insertError?.code === "23P01") {
        return { success: false, error: "Избраният час вече е зает. Моля, изберете друг час." };
      }
      console.error("Error creating reservation:", insertError);
      return { success: false, error: "Възникна грешка при създаване на резервацията. Моля, опитайте отново." };
    }

    const { error: logError } = await supabase.from("reservation_logs").insert({
      procedure_id: procedure.id,
      office_name: data.officeName,
      source: "website",
      reservation_id: reservation.id,
    });
    if (logError) console.error("Error logging reservation:", logError);

    await Promise.all([
      notifyAdminNewReservation(reservation.id),
      notifyCustomer(reservation.id, { kind: "received" }),
    ]);

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return {
      success: true,
      reservation: {
        id: reservation.id,
        officeName: data.officeName,
        procedureName: offer ? offerBookingName(offer, procedure) : procedure.name,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        durationMinutes,
        price: visitPrice,
        promotion: offer
          ? {
              badge: offer.promotion.badge,
              title: offer.promotion.title,
              procedures: offer.promotion.kind === "bundle" ? [procedure.name] : offer.procedures.map((p) => p.name),
              priceNote: offer.priceNote,
              firstVisitOnly: offer.promotion.kind === "bundle",
            }
          : null,
        technician: procedure.technician,
        email,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    };
  } catch (error) {
    console.error("Unexpected error creating reservation:", error);
    return { success: false, error: "Възникна грешка при създаване на резервацията. Моля, опитайте отново." };
  }
}
