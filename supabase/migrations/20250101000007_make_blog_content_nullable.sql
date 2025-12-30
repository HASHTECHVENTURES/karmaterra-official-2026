-- =====================================================
-- MAKE BLOG_POSTS CONTENT COLUMN NULLABLE
-- Since blog cards link to external blogs, content is optional
-- =====================================================

-- Make content column nullable
ALTER TABLE blog_posts
ALTER COLUMN content DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN blog_posts.content IS 'Blog post content (HTML/text). Optional for external blog links.';






