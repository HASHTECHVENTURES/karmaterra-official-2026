-- =====================================================
-- FIX ROW LEVEL SECURITY FOR PROFILES TABLE
-- This allows the admin panel to delete user profiles
-- =====================================================

-- Check if RLS is enabled on profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        RAISE NOTICE 'profiles table does not exist';
        RETURN;
    END IF;
END $$;

-- Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policies on profiles (if any)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
        AND cmd = 'DELETE'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- Allow delete access for admin panel
-- Since admin panel uses anon key, we need permissive policy
-- For production, consider using service role key or proper admin authentication
CREATE POLICY "Allow admin delete for profiles"
ON profiles
FOR DELETE
USING (true);

-- Note: This allows anyone with the anon key to delete profiles
-- For production, you should:
-- 1. Set up proper admin authentication
-- 2. Use service role key in admin panel (server-side only)
-- 3. Or create a more restrictive policy based on user roles
