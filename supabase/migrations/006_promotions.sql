-- Special promotions created in the admin panel (Admin > Промоции):
--   bundle  - a set number of procedures for a set price, e.g. 5 procedures for 100 €
--             (the client chooses them from the listed procedures, one per visit)
--   package - several procedures in one visit for a set price
--   custom  - any other offer with its own label and, optionally, its own price
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('bundle', 'package', 'custom')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  badge TEXT NOT NULL CHECK (char_length(badge) BETWEEN 1 AND 30),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 600),
  -- Procedures in display order; the visit lasts as long as all of them together
  procedure_ids UUID[] NOT NULL CHECK (cardinality(procedure_ids) BETWEEN 1 AND 10),
  -- bundle: how many procedures the price buys
  procedure_count INT CHECK (procedure_count IS NULL OR procedure_count BETWEEN 2 AND 20),
  -- bundle: price for all of them; package: price of the visit; custom: optional
  price NUMERIC(10, 2) CHECK (price IS NULL OR price >= 0),
  starts_on DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind <> 'bundle' OR (procedure_count IS NOT NULL AND price IS NOT NULL)),
  CHECK (kind <> 'package' OR (price IS NOT NULL AND cardinality(procedure_ids) >= 2)),
  CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on)
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions (is_active, display_order);

-- Visitors may read active promotions; all changes go through the server (service role).
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active promotions" ON promotions;
CREATE POLICY "Public can read active promotions"
  ON promotions FOR SELECT
  USING (is_active = true);

-- Which promotion a booking was made with (cleared if the promotion is deleted)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions (id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_promotion ON reservations (promotion_id);

-- ---------------------------------------------------------------------------
-- Repair: bring a table created by an earlier draft of this file (with
-- buy_count / pay_count instead of procedure_count) up to date. Does nothing
-- on a table created by the current version.
-- ---------------------------------------------------------------------------
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS procedure_count INT;
ALTER TABLE promotions DROP COLUMN IF EXISTS buy_count;  -- also drops its old checks
ALTER TABLE promotions DROP COLUMN IF EXISTS pay_count;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promotions_procedure_count_check') THEN
    ALTER TABLE promotions ADD CONSTRAINT promotions_procedure_count_check
      CHECK (procedure_count IS NULL OR procedure_count BETWEEN 2 AND 20) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'promotions'::regclass
       AND pg_get_constraintdef(oid) LIKE '%procedure_count IS NOT NULL%'
  ) THEN
    ALTER TABLE promotions ADD CONSTRAINT promotions_bundle_check
      CHECK (kind <> 'bundle' OR (procedure_count IS NOT NULL AND price IS NOT NULL)) NOT VALID;
  END IF;
END $$;

-- Let the Supabase API see the new table and columns straight away
NOTIFY pgrst, 'reload schema';
