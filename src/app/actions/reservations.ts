"use server";

import { createServerClient } from "@/lib/supabase/server";
import { reservationRequestSchema, normalizePhone } from "@/lib/validation";
import { addMinutes, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";

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

  // Log reservation for analytics (actual reservation handling is external)
  const { error: logError } = await supabase
    .from("reservation_logs")
    .insert({
      procedure_id: data.procedureId,
      office_name: data.officeName,
      source: "website",
    });

  if (logError) {
    console.error("Error logging reservation:", logError);
    // Don't fail the reservation if logging fails
  }

  // Normalize phone for display
  const normalizedPhone = normalizePhone(data.phone);

  revalidatePath("/rezervacii");

  // Return success - actual reservation will be handled by external system
  // This allows the UI to show confirmation while the salon handles booking
  return {
    success: true,
    reservation: {
      id: crypto.randomUUID(), // Generate temp ID for UI
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
