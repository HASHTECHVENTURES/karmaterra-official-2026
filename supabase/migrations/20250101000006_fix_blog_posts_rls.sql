-- =====================================================
-- FIX ROW LEVEL SECURITY FOR BLOG_POSTS TABLE
-- This allows the admin panel to insert/update/delete blog posts
-- =====================================================

-- Enable RLS (if not already enabled)
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on blog_posts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'blog_posts'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON blog_posts';
    END LOOP;
END $$;

-- Create permissive policies for blog_posts
-- Allow public read access (for main app to display blogs)
CREATE POLICY "Allow public read access for blog_posts"
ON blog_posts
FOR SELECT
USING (true);

-- Allow public insert (for admin panel to create blog cards)
CREATE POLICY "Allow public insert for blog_posts"
ON blog_posts
FOR INSERT
WITH CHECK (true);

-- Allow public update (for admin panel to edit blog cards)
CREATE POLICY "Allow public update for blog_posts"
ON blog_posts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow public delete (for admin panel to delete blog cards)
CREATE POLICY "Allow public delete for blog_posts"
ON blog_posts
FOR DELETE
USING (true);


