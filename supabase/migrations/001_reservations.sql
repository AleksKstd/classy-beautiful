-- Reservations table for storing customer bookings
-- Status: pending (new booking), confirmed (admin approved), cancelled (admin or customer cancelled)

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  office_name TEXT NOT NULL CHECK (office_name IN ('София', 'Лом')),
  
  -- Booking time
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  
  -- Customer info
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_note TEXT,
  
  -- Status management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  -- Rescheduling support
  original_start_at TIMESTAMPTZ, -- Original time if rescheduled
  rescheduled_at TIMESTAMPTZ,    -- When it was rescheduled
  
  -- Cancellation info
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Confirmation info
  confirmed_at TIMESTAMPTZ,
  confirmation_email_sent BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_booking_range CHECK (end_at > start_at)
);

-- Admin settings table for notification preferences
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reservations_office_date ON reservations(office_name, start_at);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_procedure ON reservations(procedure_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_email ON reservations(customer_email);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Policies for reservations
-- Public can create reservations (customer booking)
CREATE POLICY "Allow public to create reservations"
  ON reservations FOR INSERT
  WITH CHECK (true);

-- Public can read their own reservations by email (for future features)
CREATE POLICY "Allow public to read reservations"
  ON reservations FOR SELECT
  USING (true);

-- Public can update reservations (for admin operations via anon key)
CREATE POLICY "Allow public to update reservations"
  ON reservations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policies for admin_settings
CREATE POLICY "Allow public to read admin settings"
  ON admin_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow public to insert admin settings"
  ON admin_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update admin settings"
  ON admin_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
  ('admin_email', ''),
  ('notification_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
