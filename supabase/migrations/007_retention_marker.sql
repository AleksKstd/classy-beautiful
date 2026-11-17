-- ============================================================================
-- 007 - Data retention for bookings without an email
--
-- Run AFTER 006. Safe to re-run.
-- Bookings added in the admin panel may have no email, so "already
-- anonymised" is now recognised by the empty phone (every booking has one)
-- instead of the empty email. Otherwise the same as 003.
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
     AND customer_phone <> '';

  DELETE FROM rate_limit_hits WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

REVOKE ALL ON FUNCTION apply_data_retention() FROM PUBLIC;
REVOKE ALL ON FUNCTION apply_data_retention() FROM anon, authenticated;
