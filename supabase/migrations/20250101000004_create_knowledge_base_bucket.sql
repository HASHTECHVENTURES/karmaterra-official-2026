-- =====================================================
-- CREATE KNOWLEDGE BASE STORAGE BUCKET
-- This migration creates the knowledge-base storage bucket
-- =====================================================

-- Create the knowledge-base bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-base',
  'knowledge-base',
  true,
  52428800, -- 50MB file size limit
  ARRAY['application/pdf', 'text/plain']::text[]
)
ON CONFLICT (id) DO NOTHING;






