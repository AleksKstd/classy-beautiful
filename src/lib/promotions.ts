import { getFinalPrice } from "@/lib/pricing";
import { toDateKey } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import type { Procedure, Promotion, PromotionKind } from "@/types/database";

/*
 * Special promotions (N procedures for a price, packages, custom offers). Pure helpers shared
 * by the site, the booking wizard, the server checks and the emails.
 */

export const PROMOTION_KINDS: { kind: PromotionKind; label: string; hint: string }[] = [
  {
    kind: "bundle",
    label: "Брой процедури за цена",
    hint: "Една процедура няколко пъти на обща цена, напр. 3 × Карбонов пилинг за 100 €. Онлайн се запазва първото посещение",
  },
  { kind: "package", label: "Пакет", hint: "Няколко процедури в едно посещение на обща цена" },
  { kind: "custom", label: "Друга оферта", hint: "Свой етикет и описание, по желание със своя цена" },
];

/**
 * A client books a promotion online once, for the first visit only; the
 * remaining visits are arranged in the salon (the admin adds them).
 */
export const FIRST_VISIT_NOTE = "Онлайн запазвате първото посещение. Останалите уговаряме заедно в салона, на удобни за вас дати.";

/** "100 €" for whole amounts, "99,90 €" otherwise. */
const shortPrice = (value: number) => (Number.isInteger(value) ? `${value} €` : formatPrice(value));

/** Default label shown on the promotion, e.g. "5 за 100 €". */
export function defaultBadge(kind: PromotionKind, count?: number | null, price?: number | null): string {
  if (kind === "bundle" && count && price) return `${count} за ${shortPrice(price)}`;
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
  /**
   * The promotion's procedures, in its order (missing or inactive ones left out).
   * For a bundle these are the ones the client may choose from, one per visit.
   */
  procedures: Procedure[];
  /** True for a bundle with more than one procedure to choose from. */
  choice: boolean;
  /** Length of one visit: a package's procedures one after another; for a bundle the first procedure. */
  durationMinutes: number;
  /** What the client pays for the whole offer, and what it would cost without it. */
  totalPrice: number;
  regularPrice: number;
  /** Short line about the price, e.g. "5 процедури по избор". */
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

  // Regular prices include a procedure's own discount, so a promotion is never worse than booking normally.
  const regular = (p: Procedure) => getFinalPrice(p);

  if (promotion.kind === "bundle" && promotion.procedure_count && promotion.price !== null) {
    const count = promotion.procedure_count;
    const cheapest = Math.min(...included.map(regular));
    return {
      promotion,
      procedures: included,
      choice: included.length > 1,
      durationMinutes: included[0].duration_minutes,
      totalPrice: round2(Number(promotion.price)),
      // With a choice, the lowest the procedures could cost without the promotion
      regularPrice: round2(cheapest * count),
      priceNote: included.length > 1 ? `${count} процедури по избор` : `${count} процедури`,
    };
  }

  const durationMinutes = included.reduce((sum, p) => sum + p.duration_minutes, 0);
  const regularVisit = round2(included.reduce((sum, p) => sum + regular(p), 0));
  const price = promotion.price !== null ? round2(Number(promotion.price)) : regularVisit;
  return {
    promotion,
    procedures: included,
    choice: false,
    durationMinutes,
    totalPrice: price,
    regularPrice: regularVisit,
    priceNote: included.length > 1 ? `${included.length} процедури в едно посещение` : null,
  };
}

/** Whether a booking for this procedure may use the promotion (a bundle: any of its procedures). */
export function canBookWith(offer: PromotionOffer, procedureId: string): boolean {
  return offer.promotion.kind === "bundle"
    ? offer.procedures.some((p) => p.id === procedureId)
    : offer.procedures[0]?.id === procedureId;
}

/** How long the booked visit takes: a bundle visit is the chosen procedure, a package all of them. */
export function offerVisitMinutes(offer: PromotionOffer, procedure: Procedure | null): number {
  if (offer.promotion.kind === "bundle") return procedure?.duration_minutes ?? offer.durationMinutes;
  return offer.durationMinutes;
}

/** The procedures line for cards: "A + B" for a package, "По избор: A, B" for a bundle with a choice. */
export function offerProceduresLabel(offer: PromotionOffer): string {
  const names = offer.procedures.map((p) => p.name);
  if (offer.promotion.kind === "bundle" && !offer.choice) return `${offer.promotion.procedure_count} × ${names[0]}`;
  if (offer.choice) return `По избор: ${names.join(", ")}`;
  return names.join(" + ");
}

/** The name to show for a booking made with the promotion. */
export function offerBookingName(offer: PromotionOffer, procedure: Procedure): string {
  return offer.promotion.kind !== "bundle" && offer.procedures.length > 1 ? offer.promotion.title : procedure.name;
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
