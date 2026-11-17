import { toDateKey } from "@/lib/time";
import type { Procedure, Promotion, PromotionKind } from "@/types/database";

/*
 * Special promotions ("3 за 2", packages, custom offers). Pure helpers shared
 * by the site, the booking wizard, the server checks and the emails.
 */

export const PROMOTION_KINDS: { kind: PromotionKind; label: string; hint: string }[] = [
  { kind: "bundle", label: "X за Y", hint: "Няколко посещения на една процедура на цената на по-малко, напр. 3 за 2" },
  { kind: "package", label: "Пакет", hint: "Няколко процедури в едно посещение на обща цена" },
  { kind: "custom", label: "Друга оферта", hint: "Свой етикет и описание, по желание със своя цена" },
];

/** Default label shown on the promotion, e.g. "3 за 2". */
export function defaultBadge(kind: PromotionKind, buy?: number | null, pay?: number | null): string {
  if (kind === "bundle" && buy && pay) return `${buy} за ${pay}`;
  if (kind === "package") return "Пакет";
  return "Оферта";
}

/** True when the promotion is switched on and today (salon time) is within its dates. */
export function isPromotionLive(promotion: Promotion, now: Date = new Date()): boolean {
  if (!promotion.is_active) return false;
  const today = toDateKey(now);
  if (promotion.starts_on && today < promotion.starts_on) return false;
  if (promotion.ends_on && today > promotion.ends_on) return false;
  return true;
}

export interface PromotionOffer {
  promotion: Promotion;
  /** The promotion's procedures, in its order (missing or inactive ones left out). */
  procedures: Procedure[];
  /** Length of one visit: all procedures one after another. */
  durationMinutes: number;
  /** Price of one visit (for "3 за 2" the regular price of one visit). */
  visitPrice: number;
  /** What the client pays for the whole offer, and what it would cost without it. */
  totalPrice: number;
  regularPrice: number;
  /** Short line about the price, e.g. "3 посещения на цената на 2". */
  priceNote: string | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Works out what a promotion includes and costs, from the current procedure
 * prices. Returns null when none of its procedures is available any more.
 */
export function promotionOffer(promotion: Promotion, procedures: Procedure[]): PromotionOffer | null {
  const byId = new Map(procedures.filter((p) => p.is_active).map((p) => [p.id, p]));
  const included = promotion.procedure_ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  if (included.length === 0) return null;
  // A package is only valid with all of its procedures.
  if (promotion.kind === "package" && included.length !== promotion.procedure_ids.length) return null;

  const durationMinutes = included.reduce((sum, p) => sum + p.duration_minutes, 0);
  const regularVisit = round2(included.reduce((sum, p) => sum + Number(p.price), 0));

  if (promotion.kind === "bundle" && promotion.buy_count && promotion.pay_count) {
    const unit = Number(included[0].price);
    return {
      promotion,
      procedures: [included[0]],
      durationMinutes: included[0].duration_minutes,
      visitPrice: unit,
      totalPrice: round2(unit * promotion.pay_count),
      regularPrice: round2(unit * promotion.buy_count),
      priceNote: `${promotion.buy_count} посещения на цената на ${promotion.pay_count}`,
    };
  }

  const price = promotion.price !== null ? round2(Number(promotion.price)) : regularVisit;
  return {
    promotion,
    procedures: included,
    durationMinutes,
    visitPrice: price,
    totalPrice: price,
    regularPrice: regularVisit,
    priceNote: included.length > 1 ? `${included.length} процедури в едно посещение` : null,
  };
}

/** Live promotions that can still be booked, in display order. */
export function liveOffers(promotions: Promotion[], procedures: Procedure[], now: Date = new Date()): PromotionOffer[] {
  return promotions
    .filter((promotion) => isPromotionLive(promotion, now))
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at))
    .flatMap((promotion) => promotionOffer(promotion, procedures) ?? []);
}

/** "до 30 ноември" for the end date, or null without one. */
export function validUntilLabel(promotion: Promotion): string | null {
  if (!promotion.ends_on) return null;
  const [y, m, d] = promotion.ends_on.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return `до ${new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", timeZone: "UTC" }).format(date)}`;
}
