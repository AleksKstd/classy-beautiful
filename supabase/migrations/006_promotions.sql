-- Special promotions created in the admin panel (Admin > Промоции):
--   bundle  - "3 за 2": several visits of one procedure for the price of fewer
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
  -- bundle: buy_count visits for the price of pay_count
  buy_count INT CHECK (buy_count IS NULL OR buy_count BETWEEN 2 AND 20),
  pay_count INT CHECK (pay_count IS NULL OR pay_count BETWEEN 1 AND 19),
  -- package / custom: price of the whole visit (custom: optional)
  price NUMERIC(10, 2) CHECK (price IS NULL OR price >= 0),
  starts_on DATE,
  ends_on DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind <> 'bundle' OR (buy_count IS NOT NULL AND pay_count IS NOT NULL AND pay_count < buy_count)),
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
