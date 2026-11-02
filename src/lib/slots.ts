import {
  BOOKING_WINDOW_DAYS,
  OPENING_HOURS,
  SLOT_INTERVAL_MINUTES,
} from "@/config/site";
import {
  addDaysToKey,
  addMinutesToTime,
  toDateKey,
  weekdayOfKey,
  zonedToUtc,
} from "@/lib/time";

/**
 * Shared booking-slot rules. The wizard uses them to render the time grid
 * and the server re-runs exactly the same rules before accepting a booking.
 */

export interface TimeRange {
  start: string | Date;
  end: string | Date;
}

export interface DaySlot {
  time: string;
  available: boolean;
  booked: boolean;
}

export interface BuildSlotsInput {
  dateKey: string;
  durationMinutes: number;
  closures: TimeRange[];
  booked: TimeRange[];
  now?: Date;
}

const ms = (value: string | Date) => new Date(value).getTime();

/** Half-open interval overlap: [aStart, aEnd) and [bStart, bEnd). */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function getOpeningHours(dateKey: string) {
  return OPENING_HOURS[weekdayOfKey(dateKey)] ?? null;
}

/** Every slot start time of the day, available or not ("HH:mm"). */
export function getSlotTimes(dateKey: string): string[] {
  const hours = getOpeningHours(dateKey);
  if (!hours) return [];
  const times: string[] = [];
  for (let t = hours.open; t <= hours.close; t = addMinutesToTime(t, SLOT_INTERVAL_MINUTES)) {
    times.push(t);
  }
  return times;
}

export function buildDaySlots({
  dateKey,
  durationMinutes,
  closures,
  booked,
  now = new Date(),
}: BuildSlotsInput): DaySlot[] {
  const hours = getOpeningHours(dateKey);
  if (!hours) return [];
  const closeAt = zonedToUtc(dateKey, hours.close).getTime();

  return getSlotTimes(dateKey).map((time) => {
    const start = zonedToUtc(dateKey, time).getTime();
    const end = start + durationMinutes * 60000;

    const isBooked = booked.some((b) => overlaps(start, end, ms(b.start), ms(b.end)));
    const isClosed = closures.some((c) => overlaps(start, end, ms(c.start), ms(c.end)));
    const fitsInDay = end <= closeAt;
    const inFuture = start > now.getTime();

    return {
      time,
      booked: isBooked,
      available: !isBooked && !isClosed && fitsInDay && inFuture,
    };
  });
}

/** First and last bookable calendar days ("yyyy-MM-dd"), salon time. */
export function getBookingWindow(now: Date = new Date()) {
  const first = toDateKey(now);
  return { first, last: addDaysToKey(first, BOOKING_WINDOW_DAYS) };
}

export function isWithinBookingWindow(dateKey: string, now: Date = new Date()): boolean {
  const { first, last } = getBookingWindow(now);
  return dateKey >= first && dateKey <= last;
}

/** True when the salon is closed for the whole day (weekly hours or closures). */
export function isDayClosed(dateKey: string, closures: TimeRange[]): boolean {
  const hours = getOpeningHours(dateKey);
  if (!hours) return true;
  const open = zonedToUtc(dateKey, hours.open).getTime();
  const close = zonedToUtc(dateKey, hours.close).getTime();
  return closures.some((c) => ms(c.start) <= open && ms(c.end) >= close);
}
