# Architecture

## Folder structure

```
src/
  app/                      Next.js routes
    page.tsx                Home (popular procedures, discounts, carousel)
    proceduri/              Price list
    rezervacii/             Booking wizard
    admin/                  Login page + dashboard (protected)
    api/calendar/feed.ics/  Private iCalendar feed (needs ?token=)
    actions/
      booking.ts            PUBLIC server actions used by the booking wizard
      admin/*.ts            ADMIN server actions - each starts with requireAdmin()
    error.tsx, sitemap.ts, robots.ts
  components/               UI (admin/ for the dashboard, ui/ for primitives)
  config/site.ts            Business details, opening hours, booking rules
  lib/
    auth/                   Admin session tokens, password hashing, requireAdmin()
    data/                   Server-only data loading for pages
    email/                  Email sending (Resend) + HTML-escaped templates
    supabase/public.ts      Anon client (RLS: public data only)
    supabase/admin.ts       Service-role client (server-only)
    slots.ts, time.ts       Booking slot rules in Europe/Sofia time (shared client/server)
    booking.ts              Server-side slot validation
    validation.ts           Zod schemas
    pricing.ts, ics.ts, html.ts, rate-limit.ts, notifications.ts
  proxy.ts                  Redirects unauthenticated requests away from /admin/dashboard
supabase/
  migrations/               Run in order: 000, 001, 002
  seed.sql                  Procedure catalogue for a fresh database
tests/
  unit/                     Vitest
  e2e/                      Playwright
```

## Security model

- **Database access.** Row Level Security lets the public `anon` key read only
  active procedures, schedule closures and active carousel images.
  Reservations, logs and settings are only reachable through the server with
  the `service_role` key (`lib/supabase/admin.ts`, marked `server-only`).
- **Server actions are public endpoints.** Every function exported from a
  `"use server"` file can be called by anyone. Public ones live in
  `app/actions/booking.ts` and return no personal data. Admin ones live in
  `app/actions/admin/` and call `requireAdmin()` first.
- **Admin login.** Credentials come from environment variables; the password
  is stored as an scrypt hash. The session cookie holds an HMAC-signed,
  expiring token (`lib/auth/session.ts`), checked by `proxy.ts` and again by
  every admin page and action. Login is rate-limited.
- **Bookings.** The server re-checks every booking against opening hours,
  closures, existing bookings and the booking window (`lib/booking.ts`), and a
  database exclusion constraint makes double bookings impossible even under
  concurrency. Booking attempts are rate-limited per IP and per phone number.
- **Output.** Emails escape all customer data; the calendar feed escapes
  iCalendar text and requires a secret token. Security headers (CSP,
  frame-ancestors, HSTS, ...) are set in `next.config.mjs`.

## Booking flow

1. The wizard loads procedures and the office's closures (`getBookingProcedures`, `getOfficeClosures`).
2. For the chosen day it loads booked time ranges (`getBookedSlots`, times only)
   and builds the slot grid with `buildDaySlots` from `lib/slots.ts`.
3. `createReservation` validates the input, applies rate limits, re-runs the
   same slot rules on the server, inserts the reservation and an analytics log,
   and emails the admin (if enabled).
4. The admin confirms, cancels or reschedules from the dashboard; confirming
   emails the customer.

All times are salon (Europe/Sofia) wall-clock times regardless of the
server's or visitor's time zone.

## Configuration

Business details, opening hours, slot length, booking window and the
per-phone booking limit are in `src/config/site.ts`.
