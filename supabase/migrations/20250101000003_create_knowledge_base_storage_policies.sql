-- =====================================================
-- CREATE KNOWLEDGE BASE STORAGE POLICIES
-- This migration sets up storage policies for the knowledge-base bucket
-- Note: The bucket itself must be created in Supabase Dashboard > Storage
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public Upload for knowledge-base" ON storage.objects;
DROP POLICY IF EXISTS "Public Access for knowledge-base" ON storage.objects;
DROP POLICY IF EXISTS "Public Update for knowledge-base" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete for knowledge-base" ON storage.objects;

-- Create permissive policies for knowledge-base bucket
-- Allow public read access
CREATE POLICY "Public Access for knowledge-base"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base');

-- Allow public insert (upload)
CREATE POLICY "Public Upload for knowledge-base"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'knowledge-base');

-- Allow public update
CREATE POLICY "Public Update for knowledge-base"
ON storage.objects FOR UPDATE
USING (bucket_id = 'knowledge-base')
WITH CHECK (bucket_id = 'knowledge-base');

-- Allow public delete
CREATE POLICY "Public Delete for knowledge-base"
ON storage.objects FOR DELETE
USING (bucket_id = 'knowledge-base');







