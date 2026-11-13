-- ============================================================================
-- 004 - Link carousel / gallery photos to procedures
--
-- Run AFTER 003. Safe to re-run.
-- Each photo can point to the procedure it shows (used for the "Book this"
-- link in the hero carousel and on the /galeriya gallery page) and can have
-- a short caption.
-- ============================================================================

ALTER TABLE carousel_images
  ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES procedures(id) ON DELETE SET NULL;

ALTER TABLE carousel_images
  ADD COLUMN IF NOT EXISTS caption TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carousel_images_caption_length') THEN
    ALTER TABLE carousel_images
      ADD CONSTRAINT carousel_images_caption_length CHECK (caption IS NULL OR char_length(caption) <= 120);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_carousel_images_procedure ON carousel_images(procedure_id);
