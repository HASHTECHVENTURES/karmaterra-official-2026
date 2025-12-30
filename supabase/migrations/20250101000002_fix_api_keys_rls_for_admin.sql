-- Fix RLS policies to allow admin panel access
-- Admin panel uses anon key, so we need to allow service role or disable RLS for admin operations
-- Option 1: Allow service role (recommended for admin operations)
-- Option 2: Temporarily disable RLS for this table (less secure but works)

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can manage api_keys" ON api_keys;
DROP POLICY IF EXISTS "Authenticated users can manage user_api_key_assignments" ON user_api_key_assignments;

-- For admin panel, we'll allow service role access
-- Service role key bypasses RLS, but we can also allow anon key for now
-- Better solution: Set up proper admin authentication later

-- Allow service role to manage API keys (this is what admin panel should use)
-- But for now, let's allow anon key access since admin panel uses it
CREATE POLICY "Service role can manage api_keys" ON api_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage user_api_key_assignments" ON user_api_key_assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: This allows anyone with the anon key to access API keys
-- For production, you should:
-- 1. Set up proper admin authentication
-- 2. Use service role key in admin panel (server-side only)
-- 3. Or create a more restrictive policy based on user roles






