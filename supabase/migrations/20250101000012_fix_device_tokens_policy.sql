-- Fix RLS policy for device_tokens table
-- Since we use custom auth (not Supabase Auth), we need a more permissive policy

-- Drop the old policy
DROP POLICY IF EXISTS "Users can manage their own device tokens" ON device_tokens;

-- Create new policy that allows all operations (app handles user validation)
CREATE POLICY "Allow authenticated device token management" ON device_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);


