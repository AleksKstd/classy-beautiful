import { describe, expect, it } from "vitest";
import { fieldErrors, nameSchema, normalizePhone, reservationFormSchema, reservationRequestSchema } from "@/lib/validation";

describe("normalizePhone", () => {
  it.each([
    ["0888123456", "+359888123456"],
    ["0888 12 34 56", "+359888123456"],
    ["+359 888 123 456", "+359888123456"],
    ["00359888123456", "+359888123456"],
    ["359888123456", "+359888123456"],
    ["0971 23456", "+35997123456"],
    ["02 123 4567", "+35921234567"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "123", "0888", "+44 7700 900123", "08881234567890", "abc"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("nameSchema", () => {
  it.each(["Мария", "Анна-Мария", "José", "O'Brien", "Ян"])("accepts %s", (name) => {
    expect(nameSchema.safeParse(name).success).toBe(true);
  });

  it.each(["  ", "--", " - ", "А", "Иван2", "<b>x</b>"])("rejects %j", (name) => {
    expect(nameSchema.safeParse(name).success).toBe(false);
  });

  it("trims whitespace", () => {
    expect(nameSchema.parse("  Мария  ")).toBe("Мария");
  });
});

describe("reservation schemas", () => {
  const valid = {
    firstName: "Мария",
    lastName: "Иванова",
    phone: "0888123456",
    email: "maria@example.bg",
    note: "",
  };

  it("accepts a valid form", () => {
    expect(reservationFormSchema.safeParse(valid).success).toBe(true);
  });

  it("reports the note length error", () => {
    const result = reservationFormSchema.safeParse({ ...valid, note: "x".repeat(501) });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).note).toBe("Максимум 500 символа");
  });

  it("keeps the first error per field (required before format)", () => {
    const result = reservationFormSchema.safeParse({ ...valid, firstName: "" });
    expect(fieldErrors(result.error!).firstName).toBe("Минимум 2 символа");
  });

  it("validates the request date, time and office", () => {
    const request = { ...valid, officeName: "София", procedureId: "6f1c2a7e-3b7d-4c2f-9a51-1f2b3c4d5e6f", date: "2026-11-05", time: "10:00" };
    expect(reservationRequestSchema.safeParse(request).success).toBe(true);
    expect(reservationRequestSchema.safeParse({ ...request, officeName: "Варна" }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...request, date: "2026-13-01" }).success).toBe(false);
    expect(reservationRequestSchema.safeParse({ ...request, time: "25:00" }).success).toBe(false);
  });
});
