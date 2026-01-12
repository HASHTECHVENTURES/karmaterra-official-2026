-- =====================================================
-- Update Skin Analysis Parameters
-- 1. Remove "Wrinkles" parameter
-- 2. Replace "Oiliness" with "Sebum"
-- 3. Add "Crow's Feet" parameter
-- =====================================================

-- Step 1: Deactivate/Remove "Wrinkles" parameter (and any variations)
UPDATE skin_analysis_parameters
SET is_active = false
WHERE parameter_name ILIKE '%wrinkle%'
   OR parameter_name ILIKE '%lines%wrinkle%'
   OR parameter_name = 'Lines & Wrinkles';

-- Step 2: Update "Oiliness" to "Sebum"
UPDATE skin_analysis_parameters
SET 
  parameter_name = 'Sebum',
  parameter_description = COALESCE(
    REPLACE(parameter_description, 'oiliness', 'sebum'),
    REPLACE(parameter_description, 'Oiliness', 'Sebum'),
    'Excessive sebum production on the skin making it appear greasy or shiny'
  ),
  ai_detection_instructions = COALESCE(
    REPLACE(ai_detection_instructions, 'oiliness', 'sebum'),
    REPLACE(ai_detection_instructions, 'Oiliness', 'Sebum'),
    'Check for visible shine or greasy appearance on the skin, particularly in the T-zone (forehead, nose, chin). Look for excess sebum production that makes the skin appear oily or shiny.'
  )
WHERE parameter_name ILIKE '%oil%'
   OR parameter_name = 'Oiliness';

-- Step 3: Add "Crow's Feet" parameter if it doesn't exist
INSERT INTO skin_analysis_parameters (
  parameter_name, 
  parameter_description, 
  category, 
  ai_detection_instructions, 
  display_order, 
  is_active, 
  severity_levels
)
SELECT 
  'Crow''s Feet',
  'Fine lines and wrinkles that appear around the outer corners of the eyes, typically extending horizontally or diagonally',
  'concern',
  'Examine the outer corner areas of the eyes (lateral canthus) for fine lines, wrinkles, or creases. Look for lines that radiate outward from the eye corners, which are often more visible when smiling or squinting. Assess the depth, length, and number of lines present.',
  COALESCE((SELECT MAX(display_order) FROM skin_analysis_parameters), 0) + 1,
  true,
  '["High", "Medium", "Low"]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM skin_analysis_parameters 
  WHERE parameter_name = 'Crow''s Feet'
);

-- Step 4: Update any products linked to "Oiliness" to be linked to "Sebum"
-- First, get the new Sebum parameter ID
DO $$
DECLARE
  sebum_param_id UUID;
  oiliness_param_id UUID;
BEGIN
  -- Get the Sebum parameter ID (after update)
  SELECT id INTO sebum_param_id 
  FROM skin_analysis_parameters 
  WHERE parameter_name = 'Sebum' 
  LIMIT 1;
  
  -- Get the old Oiliness parameter ID (if still exists with old name)
  SELECT id INTO oiliness_param_id 
  FROM skin_analysis_parameters 
  WHERE parameter_name ILIKE '%oil%' 
    AND parameter_name != 'Sebum'
  LIMIT 1;
  
  -- Update products if we have both IDs
  IF sebum_param_id IS NOT NULL AND oiliness_param_id IS NOT NULL THEN
    UPDATE skin_parameter_products
    SET parameter_id = sebum_param_id
    WHERE parameter_id = oiliness_param_id;
    
    RAISE NOTICE 'Updated products from Oiliness to Sebum';
  END IF;
  
  -- If Sebum exists but no old Oiliness, products should already be linked correctly
  IF sebum_param_id IS NOT NULL AND oiliness_param_id IS NULL THEN
    RAISE NOTICE 'Sebum parameter found, products should already be linked';
  END IF;
END $$;

-- Step 5: Clean up - Delete any inactive Wrinkles parameters (optional, can be commented out if you want to keep them for reference)
-- Uncomment the following if you want to permanently delete Wrinkles parameters:
-- DELETE FROM skin_parameter_products 
-- WHERE parameter_id IN (
--   SELECT id FROM skin_analysis_parameters 
--   WHERE parameter_name ILIKE '%wrinkle%' AND is_active = false
-- );
-- 
-- DELETE FROM skin_analysis_parameters
-- WHERE parameter_name ILIKE '%wrinkle%' 
--   AND is_active = false;


