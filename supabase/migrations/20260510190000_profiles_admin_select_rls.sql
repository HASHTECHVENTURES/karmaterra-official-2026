-- Admin panel lists all app users via Supabase Auth (anon key + user JWT).
-- profiles_select_linked_auth only allows each user to see their own row,
-- so admins otherwise get an empty list.

DROP POLICY IF EXISTS "profiles_select_admin_scope" ON public.profiles;

CREATE POLICY "profiles_select_admin_scope"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'karmaterra_admin') = 'true'
);

COMMENT ON POLICY "profiles_select_admin_scope" ON public.profiles IS
  'Full profiles read when JWT app_metadata contains "karmaterra_admin": true. Set in Supabase Auth for admin users; re-login after change.';
