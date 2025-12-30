-- =====================================================
-- Create app_images table for managing app icons and images
-- =====================================================

CREATE TABLE IF NOT EXISTS app_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_name TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  alt_text TEXT,
  description TEXT,
  recommended_width INTEGER,
  recommended_height INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_images_category ON app_images(category);
CREATE INDEX IF NOT EXISTS idx_app_images_is_active ON app_images(is_active);
CREATE INDEX IF NOT EXISTS idx_app_images_display_order ON app_images(display_order);

-- Enable RLS
ALTER TABLE app_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated requests (using custom auth)
CREATE POLICY "Allow authenticated app_images read" ON app_images
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated app_images insert" ON app_images
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated app_images update" ON app_images
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated app_images delete" ON app_images
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add comments for documentation
COMMENT ON TABLE app_images IS 'Stores app icons and images used throughout the application';
COMMENT ON COLUMN app_images.image_name IS 'Unique identifier name for the image (e.g., app-icon, know-your-skin-icon)';
COMMENT ON COLUMN app_images.category IS 'Category of the image (app_icon, home_banner, feature_image, product_image, other)';
COMMENT ON COLUMN app_images.recommended_width IS 'Recommended width for this image type';
COMMENT ON COLUMN app_images.recommended_height IS 'Recommended height for this image type';

