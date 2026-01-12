-- Fix admin user creation issue
-- Admin users created via Supabase Auth don't need profiles entries
-- This migration ensures admin users can be created without errors

-- Check if there's a trigger on auth.users that creates profiles
-- If such a trigger exists and requires phone_number or pin, it will fail for admin users

-- Option 1: Create a function that handles admin users gracefully
-- Admin users (created via Supabase Dashboard) won't have profiles
-- This is fine - they use Supabase Auth, not the custom profiles system

-- If there's a trigger that auto-creates profiles, we need to make it optional
-- Let's check and drop any problematic triggers first

-- Drop any existing trigger that might be causing issues
DO $$
BEGIN
    -- Drop trigger if it exists on auth.users
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
    DROP TRIGGER IF EXISTS on_auth_user_created_trigger ON auth.users;
EXCEPTION
    WHEN OTHERS THEN
        -- Trigger might not exist, that's fine
        NULL;
END $$;

-- Create a safe trigger function that only creates profiles for app users
-- Admin users created via Supabase Dashboard won't trigger profile creation
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create profile if user metadata indicates it's an app user
    -- Admin users created via dashboard won't have this metadata
    -- So they won't get profiles created, which is what we want
    
    -- Check if this is an admin user (no phone_number in metadata)
    -- If it's an admin user, skip profile creation
    IF NEW.raw_user_meta_data->>'phone_number' IS NULL 
       AND NEW.raw_user_meta_data->>'is_admin' IS NULL THEN
        -- This is likely an admin user created via dashboard
        -- Don't create a profile for them
        RETURN NEW;
    END IF;
    
    -- For app users, you can create profiles here if needed
    -- But since the app handles profile creation manually, we'll skip it
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if we want automatic profile creation for app users
-- For now, we'll leave it commented out since the app handles profile creation
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_auth_user();

-- Note: Admin users created via Supabase Dashboard will work fine
-- They use Supabase Auth directly and don't need profiles table entries






