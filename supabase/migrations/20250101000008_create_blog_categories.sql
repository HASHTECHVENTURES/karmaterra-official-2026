-- =====================================================
-- CREATE BLOG CATEGORIES TABLE
-- This allows admins to manage blog categories
-- =====================================================

CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_categories_active ON blog_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_blog_categories_display_order ON blog_categories(display_order);

-- Insert default categories
INSERT INTO blog_categories (name, display_order, is_active) VALUES
    ('Anti-Aging', 1, true),
    ('DIY', 2, true),
    ('Hair Care', 3, true),
    ('Skincare', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Update trigger
DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
    BEFORE UPDATE ON blog_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'blog_categories'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON blog_categories';
    END LOOP;
END $$;

-- Create permissive policies
CREATE POLICY "Allow public read access for blog_categories"
ON blog_categories
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert for blog_categories"
ON blog_categories
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update for blog_categories"
ON blog_categories
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete for blog_categories"
ON blog_categories
FOR DELETE
USING (true);







