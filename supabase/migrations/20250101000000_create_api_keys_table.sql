-- Secure API Key Management for Admin Panel
-- This allows admins to manage API keys centrally without exposing them to clients

-- Create api_keys table for secure key storage
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(255) NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Create user_api_key_assignments table (optional - for assigning specific keys to users)
CREATE TABLE IF NOT EXISTS user_api_key_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, api_key_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_api_key_assignments_user ON user_api_key_assignments(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_key_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admin users can view/manage API keys
-- Note: Adjust this policy based on your admin authentication setup
CREATE POLICY "Admin can manage api_keys" ON api_keys
  FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can manage user_api_key_assignments" ON user_api_key_assignments
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Function to get API key for a user (checks assignments first, then uses round-robin)
CREATE OR REPLACE FUNCTION get_api_key_for_user(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  -- First, check if user has a specific assignment
  SELECT ak.api_key INTO v_api_key
  FROM user_api_key_assignments uaka
  JOIN api_keys ak ON uaka.api_key_id = ak.id
  WHERE uaka.user_id = p_user_id
    AND ak.is_active = true
  LIMIT 1;
  
  -- If no assignment, use round-robin from active keys
  IF v_api_key IS NULL THEN
    SELECT api_key INTO v_api_key
    FROM api_keys
    WHERE is_active = true
    ORDER BY usage_count ASC, last_used_at ASC NULLS FIRST
    LIMIT 1;
  END IF;
  
  -- Update usage stats
  IF v_api_key IS NOT NULL THEN
    UPDATE api_keys
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE api_key = v_api_key;
  END IF;
  
  RETURN v_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get API key by name (for admin use)
CREATE OR REPLACE FUNCTION get_api_key_by_name(p_key_name VARCHAR)
RETURNS TEXT AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  SELECT api_key INTO v_api_key
  FROM api_keys
  WHERE key_name = p_key_name
    AND is_active = true
  LIMIT 1;
  
  RETURN v_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;






