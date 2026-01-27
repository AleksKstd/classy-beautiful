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

  const { data: conflicts, error: conflictError } = await supabase
    .from("reservations")
    .select("id")
    .eq("office_name", data.officeName)
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString());

  if (conflictError) {
    return {
      success: false,
      error: "Грешка при проверка на наличността. Моля, опитайте отново.",
    };
  }

  if (conflicts && conflicts.length > 0) {
    return {
      success: false,
      error: "Избраният час вече е зает. Моля, изберете друг час.",
    };
  }

  const normalizedPhone = normalizePhone(data.phone);

  const { data: reservation, error: insertError } = await supabase
    .from("reservations")
    .insert({
      office_name: data.officeName,
      procedure_id: data.procedureId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      first_name: data.firstName,
      last_name: data.lastName,
      phone: normalizedPhone,
      email: data.email || null,
      note: data.note || null,
    })
    .select()
    .single();

  if (insertError || !reservation) {
    console.error("Insert error:", insertError);
    return {
      success: false,
      error: "Грешка при създаване на резервацията. Моля, опитайте отново.",
    };
  }

  revalidatePath("/rezervacii");

  return {
    success: true,
    reservation: {
      id: reservation.id,
      officeName: data.officeName,
      procedureName: procedure.name,
      startAt: reservation.start_at,
      endAt: reservation.end_at,
      durationMinutes: procedure.duration_minutes,
      price: procedure.price,
      technician: procedure.technician,
      firstName: reservation.first_name,
      lastName: reservation.last_name,
    },
  };
}
