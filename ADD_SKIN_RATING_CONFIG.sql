-- Add skin_rating_config column to app_config table
-- This column stores the rating range configuration for skin analysis parameters

-- Check if column exists, if not add it
DO $$ 
BEGIN
  -- Check if the column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'app_config' 
    AND column_name = 'skin_rating_config'
  ) THEN
    -- Add the column as JSONB type
    ALTER TABLE app_config 
    ADD COLUMN skin_rating_config JSONB DEFAULT '{
      "low_min": 1,
      "low_max": 3,
      "medium_min": 4,
      "medium_max": 7,
      "high_min": 8,
      "high_max": 10
    }'::jsonb;
    
    RAISE NOTICE 'Column skin_rating_config added successfully';
  ELSE
    RAISE NOTICE 'Column skin_rating_config already exists';
  END IF;
END $$;

-- Optional: Set default values for existing rows that might be NULL
UPDATE app_config 
SET skin_rating_config = '{
  "low_min": 1,
  "low_max": 3,
  "medium_min": 4,
  "medium_max": 7,
  "high_min": 8,
  "high_max": 10
}'::jsonb
WHERE skin_rating_config IS NULL;



