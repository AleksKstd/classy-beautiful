-- ============================================================================
-- 002 - Security hardening
--
-- Run AFTER 000_initial_schema.sql and 001_reservations.sql.
-- Safe to re-run: every statement is idempotent.
--
-- What it does:
--   1. Replaces the "anyone can do anything" Row Level Security policies with
--      read-only public access to non-sensitive tables. Everything else
--      (reservations, logs, settings, uploads) is only reachable through the
--      server using the service-role key.
--   2. Makes double bookings impossible at the database level.
--   3. Stops procedure deletion from silently deleting customer reservations.
--   4. Adds a small rate-limit table + function used by the server.
--   5. Links analytics logs to reservations so cancelled bookings can be
--      removed from the statistics.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Row Level Security
-- ---------------------------------------------------------------------------

-- procedures: public may read active procedures only
DROP POLICY IF EXISTS "Allow public read access to procedures" ON procedures;
DROP POLICY IF EXISTS "Public can read active procedures" ON procedures;
CREATE POLICY "Public can read active procedures"
  ON procedures FOR SELECT
  USING (is_active = true);

-- schedules (closures): public read is fine, they contain no personal data
DROP POLICY IF EXISTS "Allow public read access to schedules" ON schedules;
DROP POLICY IF EXISTS "Public can read schedules" ON schedules;
CREATE POLICY "Public can read schedules"
  ON schedules FOR SELECT
  USING (true);

-- reservation_logs: no public access at all
DROP POLICY IF EXISTS "Allow public to create reservation logs" ON reservation_logs;
DROP POLICY IF EXISTS "Allow public to read reservation logs" ON reservation_logs;

-- carousel_images: public may read active images only, no writes
DROP POLICY IF EXISTS "Allow public to read carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Allow public to insert carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Allow public to update carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Allow public to delete carousel images" ON carousel_images;
DROP POLICY IF EXISTS "Public can read active carousel images" ON carousel_images;
CREATE POLICY "Public can read active carousel images"
  ON carousel_images FOR SELECT
  USING (is_active = true);

-- reservations: no public access at all (customer personal data)
DROP POLICY IF EXISTS "Allow public to create reservations" ON reservations;
DROP POLICY IF EXISTS "Allow public to read reservations" ON reservations;
DROP POLICY IF EXISTS "Allow public to update reservations" ON reservations;

-- admin_settings: no public access at all
DROP POLICY IF EXISTS "Allow public to read admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow public to insert admin settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow public to update admin settings" ON admin_settings;

-- Storage: carousel bucket is publicly readable, writes only via service role
DROP POLICY IF EXISTS "Allow public to upload carousel files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to update carousel files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to delete carousel files" ON storage.objects;
-- ("Allow public to read carousel files" is kept: the bucket is public.)

-- ---------------------------------------------------------------------------
-- 2. No overlapping active bookings per office (prevents race conditions)
-- ---------------------------------------------------------------------------
-- If this statement fails, two existing active bookings already overlap.
-- Find them with:
--   SELECT a.id, b.id FROM reservations a JOIN reservations b
--     ON a.id < b.id AND a.office_name = b.office_name
--    AND a.status IN ('pending','confirmed') AND b.status IN ('pending','confirmed')
--    AND tstzrange(a.start_at, a.end_at) && tstzrange(b.start_at, b.end_at);
-- cancel one of each pair, then re-run this file.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservations_no_overlap'
  ) THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservations_no_overlap
      EXCLUDE USING gist (
        office_name WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
      )
      WHERE (status IN ('pending', 'confirmed'));
  END IF;
END $$;

-- Basic size limits on customer input (NOT VALID = existing rows are not re-checked)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_input_lengths') THEN
    ALTER TABLE reservations
      ADD CONSTRAINT reservations_input_lengths CHECK (
        char_length(customer_first_name) <= 50
        AND char_length(customer_last_name) <= 50
        AND char_length(customer_phone) <= 20
        AND char_length(customer_email) <= 254
        AND (customer_note IS NULL OR char_length(customer_note) <= 500)
        AND (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500)
      ) NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Deleting a procedure must not delete customer reservations
-- ---------------------------------------------------------------------------
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_procedure_id_fkey;
ALTER TABLE reservations
  ADD CONSTRAINT reservations_procedure_id_fkey
  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 4. Rate limiting (used by the server for login and booking attempts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_key_time ON rate_limit_hits (key, created_at);
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY; -- no policies: service role only

-- Returns true when the action is allowed (and records it), false when the
-- limit for this key has been reached inside the window.
CREATE OR REPLACE FUNCTION hit_rate_limit(p_key TEXT, p_limit INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hits INT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_key));

  DELETE FROM rate_limit_hits
   WHERE key = p_key
     AND created_at < NOW() - make_interval(secs => p_window_seconds);

  SELECT COUNT(*) INTO hits FROM rate_limit_hits WHERE key = p_key;
  IF hits >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limit_hits (key) VALUES (p_key);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION hit_rate_limit(TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION hit_rate_limit(TEXT, INT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION hit_rate_limit(TEXT, INT, INT) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Link analytics logs to reservations
-- ---------------------------------------------------------------------------
ALTER TABLE reservation_logs
  ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_reservation_logs_reservation ON reservation_logs(reservation_id);
