import { describe, expect, it } from "vitest";
import { canBookWith, defaultBadge, isPromotionLive, liveOffers, offerProceduresLabel, offerVisitMinutes, promotionOffer, validUntilLabel } from "@/lib/promotions";
import { promotionInputSchema } from "@/lib/validation";
import type { Procedure, Promotion } from "@/types/database";

const proc = (id: string, price: number, duration: number, active = true): Procedure =>
  ({ id, name: `Процедура ${id}`, price, duration_minutes: duration, is_active: active, type: "Лице", technician: "Цвети",
     description: null, discount_percentage: null, created_at: "" }) as Procedure;

const procedures = [proc("a", 10.23, 15), proc("b", 51.13, 60), proc("c", 25.56, 60), proc("off", 20, 30, false)];

const promo = (over: Partial<Promotion>): Promotion => ({
  id: "p1", kind: "custom", title: "Оферта", badge: "Оферта", description: null, procedure_ids: ["a"],
  procedure_count: null, price: null, starts_on: null, ends_on: null, is_active: true,
  display_order: 0, created_at: "2026-11-01T00:00:00Z", ...over,
});

describe("promotionOffer", () => {
  it("prices a set number of one procedure for a set price", () => {
    const offer = promotionOffer(promo({ kind: "bundle", procedure_count: 5, price: 40, procedure_ids: ["a"] }), procedures)!;
    expect(offer.totalPrice).toBe(40);
    expect(offer.regularPrice).toBeCloseTo(51.15);
    expect(offer.choice).toBe(false);
    expect(offer.priceNote).toBe("5 процедури");
    expect(offerVisitMinutes(offer, procedures[0])).toBe(15);
  });

  it("lets the client choose among several procedures, one per visit", () => {
    const offer = promotionOffer(promo({ kind: "bundle", procedure_count: 3, price: 100, procedure_ids: ["b", "c", "off"] }), procedures)!;
    expect(offer.choice).toBe(true);
    expect(offer.procedures.map((p) => p.id)).toEqual(["b", "c"]);
    // the lowest the three could cost without the promotion
    expect(offer.regularPrice).toBeCloseTo(76.68);
    expect(canBookWith(offer, "c")).toBe(true);
    expect(canBookWith(offer, "a")).toBe(false);
    expect(offerVisitMinutes(offer, procedures[2])).toBe(60);
    expect(offerProceduresLabel(offer)).toBe("По избор: Процедура b, Процедура c");
  });

  it("prices a package for one visit with all procedures in a row", () => {
    const offer = promotionOffer(promo({ kind: "package", price: 60, procedure_ids: ["b", "c"] }), procedures)!;
    expect(offer.procedures.map((p) => p.id)).toEqual(["b", "c"]);
    expect(offer.durationMinutes).toBe(120);
    expect(offerVisitMinutes(offer, procedures[1])).toBe(120);
    expect(canBookWith(offer, "b")).toBe(true);
    expect(canBookWith(offer, "c")).toBe(false);
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
    expect(defaultBadge("bundle", 5, 100)).toBe("5 за 100 €");
  });
});

describe("promotionInputSchema", () => {
  const base = { title: "Т", badge: "3 за 2", is_active: true };
  const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("accepts a valid bundle and package", () => {
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1)], procedure_count: 3, price: 100 }).success).toBe(true);
    expect(promotionInputSchema.safeParse({ ...base, kind: "package", procedure_ids: [uuid(1), uuid(2)], price: 50 }).success).toBe(true);
  });

  it("allows only one procedure in a bundle", () => {
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1), uuid(2)], procedure_count: 3, price: 100 }).success).toBe(false);
  });

  it("rejects bundles without a count or price and packages without a price", () => {
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1)], price: 100 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1)], procedure_count: 1, price: 100 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "bundle", procedure_ids: [uuid(1)], procedure_count: 5 }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "package", procedure_ids: [uuid(1), uuid(2)] }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...base, kind: "package", procedure_ids: [uuid(1)], price: 5 }).success).toBe(false);
  });

  it("checks the dates", () => {
    const ok = { ...base, kind: "custom", procedure_ids: [uuid(1)] };
    expect(promotionInputSchema.safeParse({ ...ok, starts_on: "2026-12-01", ends_on: "2026-11-01" }).success).toBe(false);
    expect(promotionInputSchema.safeParse({ ...ok, starts_on: "", ends_on: "" }).success).toBe(true);
  });
});
