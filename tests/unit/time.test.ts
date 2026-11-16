import { describe, expect, it } from "vitest";
import {
  addDaysToKey,
  dayRangeUtc,
  isDateKey,
  isTimeOfDay,
  toDateKey,
  toTimeOfDay,
  weekdayOfKey,
  zonedToUtc,
} from "@/lib/time";

describe("time helpers (Europe/Sofia)", () => {
  it("converts winter wall-clock time (UTC+2)", () => {
    expect(zonedToUtc("2026-01-15", "10:00").toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("converts summer wall-clock time (UTC+3)", () => {
    expect(zonedToUtc("2026-07-15", "10:00").toISOString()).toBe("2026-07-15T07:00:00.000Z");
  });

  it("handles the DST switch day", () => {
    // 29 March 2026: clocks go from 03:00 to 04:00
    expect(zonedToUtc("2026-03-29", "09:00").toISOString()).toBe("2026-03-29T06:00:00.000Z");
  });

  it("round-trips date and time", () => {
    const instant = zonedToUtc("2026-11-05", "18:30");
    expect(toDateKey(instant)).toBe("2026-11-05");
    expect(toTimeOfDay(instant)).toBe("18:30");
  });

  it("returns the salon day even when UTC is still the previous day", () => {
    expect(toDateKey(new Date("2026-11-04T22:30:00Z"))).toBe("2026-11-05");
  });

  it("computes day ranges in salon time", () => {
    const { start, end } = dayRangeUtc("2026-11-05");
    expect(start.toISOString()).toBe("2026-11-04T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-05T22:00:00.000Z");
  });

  it("validates keys and times", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-2-3")).toBe(false);
    expect(isTimeOfDay("09:30")).toBe(true);
    expect(isTimeOfDay("24:00")).toBe(false);
    expect(isTimeOfDay("9:30")).toBe(false);
  });

  it("adds days across month ends and finds weekdays", () => {
    expect(addDaysToKey("2026-01-31", 1)).toBe("2026-02-01");
    expect(weekdayOfKey("2026-11-08")).toBe(0); // Sunday
  });
});
