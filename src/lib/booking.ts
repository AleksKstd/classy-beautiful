import "server-only";
import type { OfficeName } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDaySlots, type TimeRange } from "@/lib/slots";
import { dayRangeUtc } from "@/lib/time";

/** Active bookings overlapping a salon-local day (times only). */
export async function fetchBookedRanges(officeName: OfficeName, dateKey: string, excludeId?: string): Promise<TimeRange[]> {
  const { start, end } = dayRangeUtc(dateKey);
  let query = createAdminClient()
    .from("reservations")
    .select("start_at, end_at")
    .eq("office_name", officeName)
    .in("status", ["pending", "confirmed"])
    .lt("start_at", end.toISOString())
    .gt("end_at", start.toISOString());
  if (excludeId) query = query.neq("id", excludeId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => ({ start: r.start_at, end: r.end_at }));
}

/**
 * Server-side check that a start time is bookable: inside opening hours,
 * not in the past, not in a closure and not overlapping another booking.
 * Shared with the admin reschedule action.
 */
export async function validateSlot(params: {
  officeName: OfficeName;
  dateKey: string;
  time: string;
  durationMinutes: number;
  excludeReservationId?: string;
}): Promise<string | null> {
  const { start, end } = dayRangeUtc(params.dateKey);
  const { data: closures, error } = await createAdminClient()
    .from("schedules")
    .select("closed_date_start, closed_date_end")
    .eq("office_name", params.officeName)
    .lt("closed_date_start", end.toISOString())
    .gt("closed_date_end", start.toISOString());
  if (error) throw error;

  const booked = await fetchBookedRanges(params.officeName, params.dateKey, params.excludeReservationId);
  const slot = buildDaySlots({
    dateKey: params.dateKey,
    durationMinutes: params.durationMinutes,
    closures: (closures ?? []).map((c) => ({ start: c.closed_date_start, end: c.closed_date_end })),
    booked,
  }).find((s) => s.time === params.time);

  if (!slot) return "Избраният час е извън работното време.";
  if (slot.booked) return "Избраният час вече е зает. Моля, изберете друг час.";
  if (!slot.available) return "Избраният час не е наличен. Моля, изберете друг час.";
  return null;
}
