-- =====================================================
-- Insert Service Icons into app_images table
-- =====================================================

-- Insert Know Your Skin icon
INSERT INTO app_images (
  image_name,
  image_url,
  category,
  alt_text,
  description,
  is_active,
  display_order,
  width,
  height
) VALUES (
  'know-your-skin-icon',
  'https://aagehceioskhyxvtolfz.supabase.co/storage/v1/object/public/karmaterra%20images/ec8d32dd-cf00-4a0d-93bd-64307bab4bef-removebg-preview.png',
  'app_icon',
  'Know Your Skin Icon',
  'Icon for Know Your Skin service',
  true,
  1,
  512,
  512
) ON CONFLICT (image_name) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

-- Insert Know Your Hair icon
INSERT INTO app_images (
  image_name,
  image_url,
  category,
  alt_text,
  description,
  is_active,
  display_order,
  width,
  height
) VALUES (
  'know-your-hair-icon',
  'https://aagehceioskhyxvtolfz.supabase.co/storage/v1/object/public/karmaterra%20images/1dec4eca-3cf7-4ae8-92e6-baf368a43342-removebg-preview.png',
  'app_icon',
  'Know Your Hair Icon',
  'Icon for Know Your Hair service',
  true,
  2,
  512,
  512
) ON CONFLICT (image_name) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

-- Insert Community icon
INSERT INTO app_images (
  image_name,
  image_url,
  category,
  alt_text,
  description,
  is_active,
  display_order,
  width,
  height
) VALUES (
  'community-icon',
  'https://aagehceioskhyxvtolfz.supabase.co/storage/v1/object/public/karmaterra%20images/1538a485-a313-4adb-9e57-a0a25659c63c-removebg-preview.png',
  'app_icon',
  'Community Icon',
  'Icon for Community service',
  true,
  3,
  512,
  512
) ON CONFLICT (image_name) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  updated_at = NOW();

