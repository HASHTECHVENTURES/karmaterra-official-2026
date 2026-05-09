-- Tighten profiles RLS for Supabase Auth sessions without breaking legacy PIN (anon).
-- See karma-terra-mobile/docs/AUTH_MIGRATION.md.

DROP POLICY IF EXISTS "Allow anonymous read for PIN auth" ON public.profiles;
CREATE POLICY "Allow anonymous read for PIN auth"
ON public.profiles FOR SELECT
TO anon
USING (true);

DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;
CREATE POLICY "Allow users to update own profile"
ON public.profiles FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "profiles_select_linked_auth"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

CREATE POLICY "profiles_update_linked_auth"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);
