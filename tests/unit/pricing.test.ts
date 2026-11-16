import { describe, expect, it } from "vitest";
import { getFinalPrice, hasDiscount } from "@/lib/pricing";

describe("pricing", () => {
  it.each([
    [{ price: 30.68, discount_percentage: null }, 30.68],
    [{ price: 30.68, discount_percentage: 0 }, 30.68],
    [{ price: 30.68, discount_percentage: 15 }, 26.08],
    [{ price: 46, discount_percentage: 20 }, 36.8],
    [{ price: 46, discount_percentage: 100 }, 0],
  ])("%j -> %d", (procedure, expected) => {
    expect(getFinalPrice(procedure)).toBe(expected);
  });

  it("detects discounts", () => {
    expect(hasDiscount({ price: 10, discount_percentage: null })).toBe(false);
    expect(hasDiscount({ price: 10, discount_percentage: 5 })).toBe(true);
  });
});
