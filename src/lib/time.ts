import { TIME_ZONE } from "@/config/site";

/**
 * Time-zone helpers. Booking times are wall-clock times in the salon's
 * time zone, independent of the server's (UTC on Vercel) or the browser's
 * time zone. Uses Intl only, so it works on the server, in the browser and
 * in the edge runtime.
 */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedParts(date: Date) {
  const parts: Record<string, string> = {};
  for (const p of partsFormatter.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of the salon time zone from UTC at the given instant, in minutes. */
function offsetMinutes(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const instant = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - instant) / 60000);
}

export function isDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isTimeOfDay(value: string): boolean {
  return TIME_RE.test(value);
}

/** Converts a salon wall-clock date ("yyyy-MM-dd") and time ("HH:mm") to a UTC instant. */
export function zonedToUtc(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = offsetMinutes(new Date(guess));
  let result = guess - first * 60000;
  const second = offsetMinutes(new Date(result));
  if (second !== first) result = guess - second * 60000;
  return new Date(result);
}

/** The salon-local calendar day ("yyyy-MM-dd") of an instant. */
export function toDateKey(date: Date): string {
  const p = zonedParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The salon-local time of day ("HH:mm") of an instant. */
export function toTimeOfDay(date: Date): string {
  const p = zonedParts(date);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOfKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Start (inclusive) and end (exclusive) UTC instants of a salon-local day. */
export function dayRangeUtc(dateKey: string): { start: Date; end: Date } {
  return { start: zonedToUtc(dateKey, "00:00"), end: zonedToUtc(addDaysToKey(dateKey, 1), "00:00") };
}

/** Formats an instant in the salon time zone with Bulgarian locale. */
export function formatInSalonTz(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("bg-BG", { timeZone: TIME_ZONE, ...options }).format(date);
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [hh, mm] = time.split(":").map(Number);
  const total = hh * 60 + mm + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
