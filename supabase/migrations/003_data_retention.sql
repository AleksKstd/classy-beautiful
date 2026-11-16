-- ============================================================================
-- 003 - Data retention (matches the privacy policy on /poveritelnost)
--
-- Run AFTER 002. Safe to re-run.
--   * Reservations whose visit was more than 24 months ago are anonymised
--     (customer name, phone, email and note removed; dates/procedure kept
--     for statistics).
--   * Rate-limit records (which contain IP addresses) older than 24 hours
--     are deleted.
-- Runs every night at 03:15 (UTC) with pg_cron.
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_data_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE reservations
     SET customer_first_name = 'Изтрит',
         customer_last_name  = 'клиент',
         customer_phone      = '',
         customer_email      = '',
         customer_note       = NULL,
         cancellation_reason = NULL
   WHERE end_at < NOW() - INTERVAL '24 months'
     AND customer_email <> '';

  DELETE FROM rate_limit_hits WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION apply_data_retention() FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_data_retention() FROM anon, authenticated;

-- Schedule it (pg_cron is available on every Supabase project).
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('data-retention')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'data-retention');
  PERFORM cron.schedule('data-retention', '15 3 * * *', 'SELECT apply_data_retention()');
END $$;
