"use server";

import { createServerClient } from "@/lib/supabase/server";
import { generateTimeSlots, TimeSlot } from "@/lib/availability";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import type { Procedure, Schedule, Reservation } from "@/types/database";

export async function getProcedures(): Promise<Procedure[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("procedures")
    .select("*")
    .eq("is_active", true)
    .order("type")
    .order("name");

  if (error) {
    console.error("Error fetching procedures:", error);
    return [];
  }

  return data || [];
}

export async function getProceduresByType(type: string): Promise<Procedure[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("procedures")
    .select("*")
    .eq("is_active", true)
    .like("type", `${type}%`)
    .order("name");

  if (error) {
    console.error("Error fetching procedures:", error);
    return [];
  }

  return data || [];
}

export async function getAvailableSlots(
  officeName: string,
  dateString: string,
  procedureId: string
): Promise<TimeSlot[]> {
  const supabase = createServerClient();

  const { data: procedure, error: procError } = await supabase
    .from("procedures")
    .select("duration_minutes")
    .eq("id", procedureId)
    .single();

  if (procError || !procedure) {
    console.error("Error fetching procedure:", procError);
    return [];
  }

  const date = parseISO(dateString);
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const { data: schedules, error: schedError } = await supabase
    .from("schedules")
    .select("*")
    .eq("office_name", officeName)
    .lte("closed_date_start", dayEnd.toISOString())
    .gte("closed_date_end", dayStart.toISOString());

  if (schedError) {
    console.error("Error fetching schedules:", schedError);
    return [];
  }

  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("*")
    .eq("office_name", officeName)
    .gte("start_at", dayStart.toISOString())
    .lt("start_at", dayEnd.toISOString());

  if (resError) {
    console.error("Error fetching reservations:", resError);
    return [];
  }

  const slots = generateTimeSlots(
    date,
    procedure.duration_minutes,
    (schedules as Schedule[]) || [],
    (reservations as Reservation[]) || []
  );

  return slots;
}

export async function getScheduleClosures(
  officeName: string
): Promise<Schedule[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("office_name", officeName)
    .gte("closed_date_end", new Date().toISOString());

  if (error) {
    console.error("Error fetching schedule closures:", error);
    return [];
  }

  return data || [];
}
