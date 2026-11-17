/**
 * Single source of truth for business details used across the site,
 * structured data, emails and booking rules.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cbclassyandbeautiful.com";

export const BUSINESS = {
  name: "Classy & Beautiful",
  alternateName: "CB Classy & Beautiful",
  phone: "+359892454583",
  phoneDisplay: "+359 89 245 4583",
  instagram: "https://www.instagram.com/cb.classy.and.beautiful/",
  facebook: "https://www.facebook.com/cb.classy.and.beautiful",
} as const;

/** Legal details shown in the privacy policy (/poveritelnost). */
export const LEGAL = {
  /** Registered company name */
  companyName: "„Бютифул груп“ ЕООД",
  /** ЕИК / Булстат */
  eik: "208335910",
  /** Registered address */
  address: "гр. Лом, ул. „Кръстю Пишурката“ 10",
  /** Date the policy text was last changed */
  privacyPolicyUpdated: "16.11.2026",
} as const;

export const OFFICES = ["София", "Лом"] as const;
export type OfficeName = (typeof OFFICES)[number];

/**
 * Street address of each salon. Shown in the footer, on the booking
 * confirmation and as a Google Maps link. Leave `address` null to hide it.
 * `mapsLink` is the salon's own Google Maps link ("Share" in Google Maps);
 * without it the map link searches for the address instead.
 */
export const OFFICE_DETAILS: Record<OfficeName, { address: string | null; mapsLink?: string }> = {
  "София": {
    address: "кв. Борово, ул. „Борово“ 52, 1680 София",
    mapsLink: "https://maps.app.goo.gl/VgF5ajsS6gDJw28i7",
  },
  "Лом": { address: "Център, ул. „Дунавска“ 29, 3600 Лом" },
};

export function mapsUrl(office: OfficeName): string | null {
  const { address, mapsLink } = OFFICE_DETAILS[office];
  if (mapsLink) return mapsLink;
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Classy & Beautiful, ${address}`)}`
    : null;
}

/** "Classy & Beautiful, София, кв. Борово, ..." for calendar events and maps. */
export function salonLocation(office: string): string {
  const details = (OFFICE_DETAILS as Record<string, { address: string | null } | undefined>)[office];
  return details?.address ? `Classy & Beautiful, ${details.address}` : `Classy & Beautiful, ${office}`;
}

/** All booking times are interpreted in the salon's time zone. */
export const TIME_ZONE = "Europe/Sofia";

/**
 * Opening hours per weekday (0 = Sunday ... 6 = Saturday), "HH:mm".
 * `null` means closed. A procedure must END by the closing time.
 * These drive the booking wizard, server-side validation and the
 * opening hours published to search engines.
 */
export const OPENING_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: "10:00", close: "19:00" },
  1: { open: "10:00", close: "19:00" },
  2: { open: "10:00", close: "19:00" },
  3: { open: "10:00", close: "19:00" },
  4: { open: "10:00", close: "19:00" },
  5: { open: "10:00", close: "19:00" },
  6: { open: "10:00", close: "19:00" },
};

const DAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/** Opening hours as short lines, e.g. ["Пн - Нд: 10:00 - 19:00"]. */
export function openingHoursLines(): string[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: { from: number; to: number; text: string }[] = [];
  for (const day of order) {
    const hours = OPENING_HOURS[day];
    const text = hours ? `${hours.open} - ${hours.close}` : "почивен ден";
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = day;
    else groups.push({ from: day, to: day, text });
  }
  return groups.map((g) =>
    `${DAY_LABELS[g.from]}${g.from !== g.to ? ` - ${DAY_LABELS[g.to]}` : ""}: ${g.text}`
  );
}

export const SLOT_INTERVAL_MINUTES = 30;
/**
 * How many days in advance an online booking must be made. 1 = the earliest
 * bookable day is tomorrow, so nobody can book for today. Staff can still
 * move a booking to today from the admin panel.
 */
export const MIN_BOOKING_NOTICE_DAYS = 1;
/** How many days ahead customers can book. */
export const BOOKING_WINDOW_DAYS = 60;
/** Max upcoming active bookings a single phone number may hold. */
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 3;
