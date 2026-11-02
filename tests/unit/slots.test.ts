import { describe, expect, it } from "vitest";
import { buildDaySlots, getSlotTimes, isDayClosed, isWithinBookingWindow, overlaps } from "@/lib/slots";
import { zonedToUtc } from "@/lib/time";

const DAY = "2026-11-05";
const BEFORE_DAY = new Date("2026-11-01T00:00:00Z");
const at = (time: string) => zonedToUtc(DAY, time).toISOString();
const slot = (slots: ReturnType<typeof buildDaySlots>, time: string) => slots.find((s) => s.time === time)!;

describe("buildDaySlots", () => {
  it("offers 30-minute slots from opening to closing", () => {
    const times = getSlotTimes(DAY);
    expect(times[0]).toBe("09:00");
    expect(times[times.length - 1]).toBe("19:00");
    expect(times).toHaveLength(21);
  });

  it("requires the procedure to end by closing time", () => {
    const slots = buildDaySlots({ dateKey: DAY, durationMinutes: 60, closures: [], booked: [], now: BEFORE_DAY });
    expect(slot(slots, "18:00").available).toBe(true);
    expect(slot(slots, "18:30").available).toBe(false);
    expect(slot(slots, "19:00").available).toBe(false);
  });

  it("marks overlapping bookings as booked, but not adjacent ones", () => {
    const booked = [{ start: at("10:00"), end: at("11:00") }];
    const slots = buildDaySlots({ dateKey: DAY, durationMinutes: 60, closures: [], booked, now: BEFORE_DAY });
    expect(slot(slots, "09:00").available).toBe(true); // ends exactly at 10:00
    expect(slot(slots, "09:30").booked).toBe(true); // runs into the booking
    expect(slot(slots, "10:30").booked).toBe(true);
    expect(slot(slots, "11:00").available).toBe(true); // starts exactly at 11:00
  });

  it("blocks slots that run into a closure, not only ones starting inside it", () => {
    const closures = [{ start: at("12:00"), end: at("14:00") }];
    const slots = buildDaySlots({ dateKey: DAY, durationMinutes: 60, closures, booked: [], now: BEFORE_DAY });
    expect(slot(slots, "11:00").available).toBe(true);
    expect(slot(slots, "11:30").available).toBe(false);
    expect(slot(slots, "13:30").available).toBe(false);
    expect(slot(slots, "14:00").available).toBe(true);
  });

  it("hides past times today but keeps later ones", () => {
    const now = new Date(at("12:10"));
    const slots = buildDaySlots({ dateKey: DAY, durationMinutes: 30, closures: [], booked: [], now });
    expect(slot(slots, "12:00").available).toBe(false);
    expect(slot(slots, "12:30").available).toBe(true);
  });
});

describe("day rules", () => {
  it("detects a whole-day closure", () => {
    expect(isDayClosed(DAY, [{ start: at("00:00"), end: at("23:59") }])).toBe(true);
    expect(isDayClosed(DAY, [{ start: at("12:00"), end: at("14:00") }])).toBe(false);
  });

  it("limits the booking window", () => {
    const now = new Date(at("12:00"));
    expect(isWithinBookingWindow(DAY, now)).toBe(true);
    expect(isWithinBookingWindow("2026-11-04", now)).toBe(false);
    expect(isWithinBookingWindow("2027-02-01", now)).toBe(false);
  });

  it("uses half-open intervals", () => {
    expect(overlaps(0, 10, 10, 20)).toBe(false);
    expect(overlaps(0, 11, 10, 20)).toBe(true);
  });
});
