-- =====================================================
-- ADD EXTERNAL LINK COLUMN TO BLOG POSTS
-- This migration adds the external_link column to blog_posts table
-- =====================================================

-- Add external_link column if it doesn't exist
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN blog_posts.external_link IS 'External URL where users will be redirected when clicking the blog card. If provided, blog card will link to this URL instead of internal page.';







