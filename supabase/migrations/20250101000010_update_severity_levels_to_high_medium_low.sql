-- =====================================================
-- Update Severity Levels from "Mild, Moderate, Severe" to "High, Medium, Low"
-- =====================================================

-- Update default severity_levels for new parameters
ALTER TABLE skin_analysis_parameters 
ALTER COLUMN severity_levels SET DEFAULT '["High", "Medium", "Low"]'::jsonb;

-- Update existing parameters that have old values
UPDATE skin_analysis_parameters
SET severity_levels = '["High", "Medium", "Low"]'::jsonb
WHERE severity_levels::text LIKE '%Mild%'
   OR severity_levels::text LIKE '%Moderate%'
   OR severity_levels::text LIKE '%Severe%';

-- Also update any products that reference old severity levels
-- Note: This updates the severity_level column in products table
UPDATE skin_parameter_products
SET severity_level = CASE 
  WHEN severity_level = 'Mild' THEN 'Low'
  WHEN severity_level = 'Moderate' THEN 'Medium'
  WHEN severity_level = 'Severe' THEN 'High'
  ELSE severity_level
END
WHERE severity_level IN ('Mild', 'Moderate', 'Severe');


