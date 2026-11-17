import { describe, expect, it } from "vitest";
import { defaultBadge, isPromotionLive, liveOffers, promotionOffer, validUntilLabel } from "@/lib/promotions";
import { promotionInputSchema } from "@/lib/validation";
import type { Procedure, Promotion } from "@/types/database";

const proc = (id: string, price: number, duration: number, active = true): Procedure =>
  ({ id, name: `Процедура ${id}`, price, duration_minutes: duration, is_active: active, type: "Лице", technician: "Цвети",
     description: null, discount_percentage: null, created_at: "" }) as Procedure;

const procedures = [proc("a", 10.23, 15), proc("b", 51.13, 60), proc("c", 25.56, 60), proc("off", 20, 30, false)];

const promo = (over: Partial<Promotion>): Promotion => ({
  id: "p1", kind: "custom", title: "Оферта", badge: "Оферта", description: null, procedure_ids: ["a"],
  buy_count: null, pay_count: null, price: null, starts_on: null, ends_on: null, is_active: true,
  display_order: 0, created_at: "2026-11-01T00:00:00Z", ...over,
});

describe("promotionOffer", () => {
  it('prices "3 за 2" as two visits and keeps one visit long', () => {
    const offer = promotionOffer(promo({ kind: "bundle", buy_count: 3, pay_count: 2, procedure_ids: ["a"] }), procedures)!;
    expect(offer.totalPrice).toBeCloseTo(20.46);
    expect(offer.regularPrice).toBeCloseTo(30.69);
    expect(offer.durationMinutes).toBe(15);
    expect(offer.priceNote).toBe("3 посещения на цената на 2");
  });

  it("prices a package for one visit with all procedures in a row", () => {
    const offer = promotionOffer(promo({ kind: "package", price: 60, procedure_ids: ["b", "c"] }), procedures)!;
    expect(offer.procedures.map((p) => p.id)).toEqual(["b", "c"]);
    expect(offer.durationMinutes).toBe(120);
    expect(offer.totalPrice).toBe(60);
    expect(offer.regularPrice).toBeCloseTo(76.69);
  });

  it("drops a package when one of its procedures is not offered any more", () => {
    expect(promotionOffer(promo({ kind: "package", price: 30, procedure_ids: ["b", "off"] }), procedures)).toBeNull();
    expect(promotionOffer(promo({ procedure_ids: ["missing"] }), procedures)).toBeNull();
  });

  it("uses the regular price for a custom offer without its own price", () => {
    const offer = promotionOffer(promo({ procedure_ids: ["c"] }), procedures)!;
    expect(offer.totalPrice).toBeCloseTo(25.56);
    expect(offer.regularPrice).toBeCloseTo(25.56);
  });
});

describe("live promotions", () => {
  const now = new Date("2026-11-20T10:00:00Z");

  it("respects the switch and the dates in salon time", () => {
    expect(isPromotionLive(promo({}), now)).toBe(true);
    expect(isPromotionLive(promo({ is_active: false }), now)).toBe(false);
    expect(isPromotionLive(promo({ starts_on: "2026-11-21" }), now)).toBe(false);
    expect(isPromotionLive(promo({ ends_on: "2026-11-20" }), now)).toBe(true);
    expect(isPromotionLive(promo({ ends_on: "2026-11-19" }), now)).toBe(false);
  });

  it("lists live offers in display order", () => {
    const list = liveOffers(
      [promo({ id: "late", display_order: 2 }), promo({ id: "first", display_order: 1 }), promo({ id: "gone", ends_on: "2026-01-01" })],
      procedures,
      now
    );
    expect(list.map((o) => o.promotion.id)).toEqual(["first", "late"]);
  });

  it("labels the end date and the default badge", () => {
    expect(validUntilLabel(promo({ ends_on: "2026-11-30" }))).toBe("до 30 ноември");
    expect(defaultBadge("bundle", 3, 2)).toBe("3 за 2");
  });
});

describe("promotionInputSchema", () => {
  const base = { title: "Т", badge: "3 за 2", is_active: true };
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("accepts a valid bundle and package", () => {
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1)], buy_count: 3, pay_count: 2 }).success).toBe(true);
    expect(promotionInputSchema.safeParse({ ...base, kind: "package", procedure_ids: [uuid(1), uuid(2)], price: 50 }).success).toBe(true);
  });

  it("rejects bundles that do not save anything and packages without a price", () => {
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1)], buy_count: 2, pay_count: 2 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1), uuid(2)], buy_count: 3, pay_count: 2 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "package", procedure_ids: [uuid(1), uuid(2)] }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "package", procedure_ids: [uuid(1)], price: 5 }).success).toBe(false);
  });

  it("checks the dates", () => {
    const ok = { ...base, kind: "custom", procedure_ids: [uuid(1)] };
    expect(promotionInputSchema.safeParse({ ...ok, starts_on: "2026-12-01", ends_on: "2026-11-01" }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...ok, starts_on: "", ends_on: "" }).success).toBe(true);
  });
});
