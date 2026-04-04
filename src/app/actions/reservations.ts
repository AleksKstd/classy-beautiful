"use server";

import { createServerClient } from "@/lib/supabase/server";
import { reservationRequestSchema, normalizePhone } from "@/lib/validation";
import { addMinutes, parseISO, startOfDay, endOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import type { ReservationStatus } from "@/types/database";

export interface CreateReservationResult {
  success: boolean;
  error?: string;
  reservation?: {
    id: string;
    officeName: string;
    procedureName: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    price: number;
    technician: string;
    firstName: string;
    lastName: string;
  };
}

export async function createReservation(
  formData: unknown
): Promise<CreateReservationResult> {
  const supabase = createServerClient();

  const parsed = reservationRequestSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  const data = parsed.data;

  const { data: procedure, error: procedureError } = await supabase
    .from("procedures")
    .select("*")
    .eq("id", data.procedureId)
    .eq("is_active", true)
    .single();

  if (procedureError || !procedure) {
    return {
      success: false,
      error: "Избраната процедура не е налична.",
    };
  }

  const startAt = parseISO(data.startAt);
  const endAt = addMinutes(startAt, procedure.duration_minutes);

  // Check for overlapping reservations (only pending or confirmed)
  const { data: existingReservations } = await supabase
    .from("reservations")
    .select("id, start_at, end_at")
    .eq("office_name", data.officeName)
    .in("status", ["pending", "confirmed"])
    .gte("start_at", startOfDay(startAt).toISOString())
    .lte("start_at", endOfDay(startAt).toISOString());

  if (existingReservations) {
    const hasOverlap = existingReservations.some((res) => {
      const resStart = new Date(res.start_at);
      const resEnd = new Date(res.end_at);
      return (startAt < resEnd && endAt > resStart);
    });

    if (hasOverlap) {
      return {
        success: false,
        error: "Избраният час вече е зает. Моля, изберете друг час.",
      };
    }
  }

  // Normalize phone
  const normalizedPhone = normalizePhone(data.phone);

  // Create the actual reservation in the database
  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .insert({
      procedure_id: data.procedureId,
      office_name: data.officeName,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      customer_first_name: data.firstName,
      customer_last_name: data.lastName,
      customer_phone: normalizedPhone,
      customer_email: data.email || "",
      customer_note: data.note || null,
      status: "pending" as ReservationStatus,
    })
    .select()
    .single();

  if (reservationError || !reservation) {
    console.error("Error creating reservation:", reservationError);
    return {
      success: false,
      error: "Възникна грешка при създаване на резервацията. Моля, опитайте отново.",
    };
  }

  // Log reservation for analytics
  const { error: logError } = await supabase
    .from("reservation_logs")
    .insert({
      procedure_id: data.procedureId,
      office_name: data.officeName,
      source: "website",
    });

  if (logError) {
    console.error("Error logging reservation:", logError);
  }

  // Notify admin about new reservation
  await notifyAdminNewReservation(reservation.id);

  revalidatePath("/rezervacii");
  revalidatePath("/admin/dashboard");

  return {
    success: true,
    reservation: {
      id: reservation.id,
      officeName: data.officeName,
      procedureName: procedure.name,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      durationMinutes: procedure.duration_minutes,
      price: procedure.price,
      technician: procedure.technician,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  };
}

// Get booked time slots for a specific date and office
export async function getBookedSlots(
  officeName: string,
  date: Date
): Promise<{ start: string; end: string }[]> {
  const supabase = createServerClient();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("start_at, end_at")
    .eq("office_name", officeName)
    .in("status", ["pending", "confirmed"])
    .gte("start_at", startOfDay(date).toISOString())
    .lte("start_at", endOfDay(date).toISOString());

  if (!reservations) return [];

  return reservations.map((res) => ({
    start: res.start_at,
    end: res.end_at,
  }));
}

// Notify admin about new reservation (sends email if configured)
async function notifyAdminNewReservation(reservationId: string): Promise<void> {
  try {
    // Call the API route to send notification
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    
    await fetch(`${baseUrl}/api/notifications/new-reservation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    });
  } catch (error) {
    console.error("Failed to notify admin:", error);
  }
}

// Confirm a reservation
export async function confirmReservation(
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({
      status: "confirmed" as ReservationStatus,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .select(`
      *,
      procedure:procedures(*)
    `)
    .single();

  if (error || !reservation) {
    return { success: false, error: "Грешка при потвърждаване на резервацията." };
  }

  // Send confirmation email to customer
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    
    await fetch(`${baseUrl}/api/email/confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    });

    // Mark email as sent
    await supabase
      .from("reservations")
      .update({ confirmation_email_sent: true })
      .eq("id", reservationId);
  } catch (emailError) {
    console.error("Failed to send confirmation email:", emailError);
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Cancel a reservation
export async function cancelReservation(
  reservationId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("reservations")
    .update({
      status: "cancelled" as ReservationStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || null,
    })
    .eq("id", reservationId);

  if (error) {
    return { success: false, error: "Грешка при отмяна на резервацията." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Reschedule a reservation
export async function rescheduleReservation(
  reservationId: string,
  newStartAt: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  // Get the current reservation to calculate new end time
  const { data: currentRes } = await supabase
    .from("reservations")
    .select(`
      *,
      procedure:procedures(duration_minutes)
    `)
    .eq("id", reservationId)
    .single();

  if (!currentRes) {
    return { success: false, error: "Резервацията не е намерена." };
  }

  const newStart = parseISO(newStartAt);
  const duration = (currentRes.procedure as any)?.duration_minutes || 60;
  const newEnd = addMinutes(newStart, duration);

  // Check for overlapping reservations
  const { data: existingReservations } = await supabase
    .from("reservations")
    .select("id, start_at, end_at")
    .eq("office_name", currentRes.office_name)
    .in("status", ["pending", "confirmed"])
    .neq("id", reservationId)
    .gte("start_at", startOfDay(newStart).toISOString())
    .lte("start_at", endOfDay(newStart).toISOString());

  if (existingReservations) {
    const hasOverlap = existingReservations.some((res) => {
      const resStart = new Date(res.start_at);
      const resEnd = new Date(res.end_at);
      return (newStart < resEnd && newEnd > resStart);
    });

    if (hasOverlap) {
      return { success: false, error: "Избраният час вече е зает." };
    }
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      start_at: newStart.toISOString(),
      end_at: newEnd.toISOString(),
      original_start_at: currentRes.original_start_at || currentRes.start_at,
      rescheduled_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (error) {
    return { success: false, error: "Грешка при преместване на резервацията." };
  }

  revalidatePath("/admin/dashboard");
  return { success: true };
}

// Get all reservations for admin panel
export async function getReservations(filters?: {
  officeName?: string;
  status?: ReservationStatus;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = createServerClient();

  let query = supabase
    .from("reservations")
    .select(`
      *,
      procedure:procedures(id, name, duration_minutes, price, technician)
    `)
    .order("start_at", { ascending: true });

  if (filters?.officeName) {
    query = query.eq("office_name", filters.officeName);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte("start_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("start_at", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching reservations:", error);
    return [];
  }

  return data || [];
}
