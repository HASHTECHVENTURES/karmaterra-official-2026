-- Fix RLS policies for api_keys table to allow inserts
-- The previous policy only had USING clause which doesn't cover INSERT operations

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage api_keys" ON api_keys;
DROP POLICY IF EXISTS "Admin can manage user_api_key_assignments" ON user_api_key_assignments;

-- Create new policies that allow authenticated users to manage API keys
-- USING clause applies to SELECT, UPDATE, DELETE
-- WITH CHECK clause applies to INSERT, UPDATE

-- Policy for api_keys: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage api_keys" ON api_keys
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy for user_api_key_assignments: Allow authenticated users full access
CREATE POLICY "Authenticated users can manage user_api_key_assignments" ON user_api_key_assignments
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');


