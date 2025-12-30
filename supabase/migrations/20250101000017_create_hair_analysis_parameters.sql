-- =====================================================
-- Create Hair Analysis Parameters and Products Tables
-- =====================================================

-- Create hair_analysis_parameters table
CREATE TABLE IF NOT EXISTS hair_analysis_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_name TEXT NOT NULL,
  parameter_description TEXT,
  category TEXT DEFAULT 'concern',
  ai_detection_instructions TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  severity_levels JSONB DEFAULT '["High", "Medium", "Low"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create hair_parameter_products table
CREATE TABLE IF NOT EXISTS hair_parameter_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_id UUID NOT NULL REFERENCES hair_analysis_parameters(id) ON DELETE CASCADE,
  severity_level TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_link TEXT,
  product_image TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hair_parameters_display_order ON hair_analysis_parameters(display_order);
CREATE INDEX IF NOT EXISTS idx_hair_parameters_active ON hair_analysis_parameters(is_active);
CREATE INDEX IF NOT EXISTS idx_hair_products_parameter ON hair_parameter_products(parameter_id);
CREATE INDEX IF NOT EXISTS idx_hair_products_severity ON hair_parameter_products(severity_level);
CREATE INDEX IF NOT EXISTS idx_hair_products_display_order ON hair_parameter_products(display_order);
CREATE INDEX IF NOT EXISTS idx_hair_products_active ON hair_parameter_products(is_active);

-- Enable RLS
ALTER TABLE hair_analysis_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE hair_parameter_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hair_analysis_parameters
CREATE POLICY "Allow public read access to hair_analysis_parameters"
  ON hair_analysis_parameters FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to hair_analysis_parameters"
  ON hair_analysis_parameters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for hair_parameter_products
CREATE POLICY "Allow public read access to hair_parameter_products"
  ON hair_parameter_products FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access to hair_parameter_products"
  ON hair_parameter_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default hair parameters
INSERT INTO hair_analysis_parameters (parameter_name, parameter_description, category, ai_detection_instructions, display_order, is_active, severity_levels)
VALUES
  ('Dandruff', 'Presence of white or yellowish flakes on the scalp and hair', 'concern', 'Look for visible white or yellowish flakes on the scalp surface and hair strands. Check for scalp redness or irritation that may accompany dandruff.', 1, true, '["High", "Medium", "Low"]'::jsonb),
  ('Frizzy Hair', 'Hair that appears unruly, lacks smoothness, and has flyaway strands', 'texture', 'Observe hair texture for lack of smoothness, visible flyaway strands, and overall unruly appearance. Check for lack of shine and definition in hair strands.', 2, true, '["High", "Medium", "Low"]'::jsonb),
  ('Dry and Damaged Scalp', 'Scalp showing signs of dryness, flakiness, tightness, or damage', 'concern', 'Examine scalp for visible dryness, excessive flaking, tightness, or signs of damage. Look for lack of moisture and potential irritation.', 3, true, '["High", "Medium", "Low"]'::jsonb),
  ('Oily Scalp', 'Excessive oil production on the scalp making hair appear greasy', 'concern', 'Check for visible oiliness on the scalp, greasy appearance of hair roots, and potential shine that indicates excess sebum production.', 4, true, '["High", "Medium", "Low"]'::jsonb),
  ('Itchy Scalp', 'Scalp discomfort characterized by itching sensation', 'concern', 'Note any visible signs of scratching, redness, or irritation on the scalp that may indicate itching. While itching itself cannot be seen, look for associated symptoms.', 5, true, '["High", "Medium", "Low"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Add hair_rating_config to app_config if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'app_config' 
    AND column_name = 'hair_rating_config'
  ) THEN
    ALTER TABLE app_config 
    ADD COLUMN hair_rating_config JSONB DEFAULT '{
      "low_min": 1,
      "low_max": 3,
      "medium_min": 4,
      "medium_max": 7,
      "high_min": 8,
      "high_max": 10
    }'::jsonb;
    
    RAISE NOTICE 'Column hair_rating_config added successfully';
  ELSE
    RAISE NOTICE 'Column hair_rating_config already exists';
  END IF;
END $$;

-- Set default values for existing rows that might be NULL
UPDATE app_config 
SET hair_rating_config = '{
  "low_min": 1,
  "low_max": 3,
  "medium_min": 4,
  "medium_max": 7,
  "high_min": 8,
  "high_max": 10
}'::jsonb
WHERE hair_rating_config IS NULL;

