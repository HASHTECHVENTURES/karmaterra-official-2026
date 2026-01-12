-- =====================================================
-- ADD BLOG BANNER IMAGE TO APP_CONFIG
-- This allows admins to manage the blog banner image
-- =====================================================

-- Add blog_banner_image column to app_config
ALTER TABLE app_config
ADD COLUMN IF NOT EXISTS blog_banner_image TEXT;

-- Add comment for documentation
COMMENT ON COLUMN app_config.blog_banner_image IS 'URL of the banner image displayed in the "Latest Blog Posts" section on the homepage.';







