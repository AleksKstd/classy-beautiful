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

export const OFFICES = ["София", "Лом"] as const;
export type OfficeName = (typeof OFFICES)[number];

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

export const SLOT_INTERVAL_MINUTES = 30;
/** How many days ahead customers can book. */
export const BOOKING_WINDOW_DAYS = 60;
/** Max upcoming active bookings a single phone number may hold. */
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 3;
