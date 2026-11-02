# Setup

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) (region: Frankfurt is closest to Bulgaria).
2. In **SQL Editor**, run these files **in order**, each as a new query:
   1. `supabase/migrations/000_initial_schema.sql`
   2. `supabase/migrations/001_reservations.sql`
   3. `supabase/migrations/002_security_hardening.sql`
3. For a **new, empty** project only: run `supabase/seed.sql` to load the procedure catalogue.
   Never run it on a database that already has reservations.

### Existing project (upgrading)

Only run `002_security_hardening.sql`. It is safe to re-run. If it stops with an
error about the `reservations_no_overlap` constraint, two existing active
bookings overlap: the file contains a query that lists them. Cancel one of each
pair and run the file again.

## 2. Storage bucket

1. **Storage > New bucket**, name **`carousel`**, tick **Public bucket**.
2. No extra policies are needed. Uploads go through the server with the service-role key;
   migration 002 removes any public write access.

## 3. Environment variables

Set these in `.env.local` for local development **and** in your hosting
provider (Vercel: Project > Settings > Environment Variables). See
`.env.local.example` for the full list with comments.

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API > `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API > `service_role` key (**secret**) |
| `NEXT_PUBLIC_SITE_URL` | Your public domain, e.g. `https://classybeautiful.bg` |
| `ADMIN_USERNAME` | Choose one |
| `ADMIN_PASSWORD_HASH` | `npm run hash-password -- "your new password"` |
| `ADMIN_SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CALENDAR_FEED_TOKEN` | Same command, a different value |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional, from [resend.com](https://resend.com) (verify your domain there) |

Without the admin variables the admin login is disabled; without
`CALENDAR_FEED_TOKEN` the calendar feed is disabled.

## 4. Admin panel

Go to `/admin` and log in with `ADMIN_USERNAME` and the password you hashed.

- **Settings tab:** set the email that receives new-booking notifications.
- **Google Calendar:** scan the QR code or use the link in the Settings tab.
  The link contains the secret `CALENDAR_FEED_TOKEN`; treat it like a password.
  To revoke it, change `CALENDAR_FEED_TOKEN` and subscribe again.
- **Log everyone out:** change `ADMIN_SESSION_SECRET`.

## 5. Opening hours and booking rules

Edit `src/config/site.ts`: opening hours per weekday, slot length, how far
ahead customers can book, and the maximum number of upcoming bookings per phone
number. The same values drive the booking wizard, the server checks and the
opening hours shown to search engines.

## 6. Verify

```sql
SELECT COUNT(*) FROM procedures;                 -- 80+ after the seed
SELECT * FROM admin_settings;                    -- admin_email, notification_enabled
SELECT conname FROM pg_constraint
 WHERE conname IN ('reservations_no_overlap', 'reservations_procedure_id_fkey');
SELECT proname FROM pg_proc WHERE proname = 'hit_rate_limit';
```

Then make a test booking on `/rezervacii` and confirm it in the admin panel.

## Troubleshooting

- **Carousel images not showing:** the bucket must be called `carousel` and be public.
- **Admin login says "not configured":** `ADMIN_SESSION_SECRET` is missing or shorter than 32 characters.
- **Admin login always fails:** check `ADMIN_USERNAME` and regenerate `ADMIN_PASSWORD_HASH`.
  In `.env.local` wrap the hash in single quotes, because it contains `$` characters.
- **No emails:** set `RESEND_API_KEY`, verify the sender domain in Resend, and check the admin email in Settings.
