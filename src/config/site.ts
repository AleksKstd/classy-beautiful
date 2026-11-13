/**
 * Single source of truth for business details used across the site,
 * structured data, emails and booking rules.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://classybeautiful.bg";

export const BUSINESS = {
  name: "Classy & Beautiful",
  alternateName: "CB Classy & Beautiful",
  phone: "+359878378083",
  phoneDisplay: "+359 87 837 8083",
  email: "info@classybeautiful.bg",
  instagram: "https://www.instagram.com/cb.classy.and.beautiful/",
  facebook: "https://www.facebook.com/cb.classy.and.beautiful",
} as const;

/**
 * Legal details shown in the privacy policy (/poveritelnost).
 * TODO before launch: replace the placeholders with the company's real data.
 */
export const LEGAL = {
  /** Registered company name, e.g. "Класи енд Бютифул ЕООД" */
  companyName: "[Име на фирмата]",
  /** ЕИК / Булстат */
  eik: "[ЕИК]",
  /** Registered address */
  address: "[Адрес на управление]",
  /** Date the policy text was last changed */
  privacyPolicyUpdated: "13.11.2026",
} as const;

export const OFFICES = ["София", "Лом"] as const;
export type OfficeName = (typeof OFFICES)[number];

/**
 * Street address of each salon. Shown in the footer, on the booking
 * confirmation and as a Google Maps link. Leave null to hide it.
 * TODO: fill in the real addresses.
 */
export const OFFICE_DETAILS: Record<OfficeName, { address: string | null }> = {
  "София": { address: null },
  "Лом": { address: null },
};

export function mapsUrl(office: OfficeName): string | null {
  const address = OFFICE_DETAILS[office].address;
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Classy & Beautiful, ${address}`)}`
    : null;
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
  0: { open: "09:00", close: "19:00" },
  1: { open: "09:00", close: "19:00" },
  2: { open: "09:00", close: "19:00" },
  3: { open: "09:00", close: "19:00" },
  4: { open: "09:00", close: "19:00" },
  5: { open: "09:00", close: "19:00" },
  6: { open: "09:00", close: "19:00" },
};

const DAY_LABELS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

/** Opening hours as short lines, e.g. ["Пн - Нд: 09:00 - 19:00"]. */
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
/** How many days ahead customers can book. */
export const BOOKING_WINDOW_DAYS = 60;
/** Max upcoming active bookings a single phone number may hold. */
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 3;
