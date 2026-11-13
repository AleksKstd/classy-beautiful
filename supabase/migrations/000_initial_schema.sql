-- Classy & Beautiful - Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Procedures table
CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  discount_percentage NUMERIC(5, 2) CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  type TEXT NOT NULL,
  technician TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Schedules table (for closed dates/times)
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_name TEXT NOT NULL CHECK (office_name IN ('София', 'Лом')),
  closed_date_start TIMESTAMPTZ NOT NULL,
  closed_date_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_date_range CHECK (closed_date_end > closed_date_start)
);

-- Reservation logs table (for analytics - tracking popular procedures)
-- Actual reservations are handled by external API
CREATE TABLE IF NOT EXISTS reservation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  office_name TEXT NOT NULL CHECK (office_name IN ('София', 'Лом')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'website' -- Track where booking came from
);

-- Carousel images table (for hero section image carousel)
CREATE TABLE IF NOT EXISTS carousel_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_procedures_type ON procedures(type);
CREATE INDEX IF NOT EXISTS idx_procedures_is_active ON procedures(is_active);
CREATE INDEX IF NOT EXISTS idx_procedures_discount ON procedures(discount_percentage) WHERE discount_percentage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_office_dates ON schedules(office_name, closed_date_start, closed_date_end);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_procedure ON reservation_logs(procedure_id, booked_at);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_office ON reservation_logs(office_name, booked_at);
CREATE INDEX IF NOT EXISTS idx_carousel_images_order ON carousel_images(display_order) WHERE is_active = true;

-- Enable Row Level Security (optional, for public access)
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carousel_images ENABLE ROW LEVEL SECURITY;

-- Policies for public read access to procedures and schedules
CREATE POLICY "Allow public read access to procedures"
  ON procedures FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access to schedules"
  ON schedules FOR SELECT
  USING (true);

-- Policy for public insert on reservation_logs (for analytics tracking)
CREATE POLICY "Allow public to create reservation logs"
  ON reservation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to read reservation logs"
  ON reservation_logs FOR SELECT
  USING (true);

-- Policy for public read access to carousel images
CREATE POLICY "Allow public to read carousel images"
  ON carousel_images FOR SELECT
  USING (true);

-- Policies for carousel_images management (INSERT, UPDATE, DELETE)
CREATE POLICY "Allow public to insert carousel images"
  ON carousel_images FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public to update carousel images"
  ON carousel_images FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete carousel images"
  ON carousel_images FOR DELETE
  USING (true);

-- ============================================
-- STORAGE BUCKET POLICIES
-- Run these in Supabase SQL Editor to allow uploads to carousel bucket
-- ============================================
-- First create the bucket (run this once):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('carousel', 'carousel', true);

-- Storage policies for carousel bucket:
CREATE POLICY "Allow public to read carousel files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'carousel');

CREATE POLICY "Allow public to upload carousel files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'carousel');

CREATE POLICY "Allow public to update carousel files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'carousel')
  WITH CHECK (bucket_id = 'carousel');

CREATE POLICY "Allow public to delete carousel files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'carousel');
