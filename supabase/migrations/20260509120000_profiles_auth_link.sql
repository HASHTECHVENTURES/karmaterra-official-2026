-- Link Karma Terra profiles (custom id + PIN) to Supabase Auth (email/password).
-- Safe additive migration: nullable columns, no PIN removal.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

COMMENT ON COLUMN public.profiles.auth_user_id IS
  'References auth.users(id) after user completes email+password migration; null = PIN-only legacy.';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_migrated_at timestamptz;

COMMENT ON COLUMN public.profiles.password_migrated_at IS
  'When the account was linked to Supabase Auth / password set; null if still legacy.';

CREATE INDEX IF NOT EXISTS profiles_auth_user_id_idx
  ON public.profiles (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Optional FK (only if auth schema visible; comment out on forks where migration fails)
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_auth_user_id_fkey
--   FOREIGN KEY (auth_user_id) REFERENCES auth.users (id) ON DELETE SET NULL;

-- RLS (examples — adjust to your existing policies; many tables use profiles.id, not auth.uid())
-- After migration, prefer matching session with:
--   EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = <row>.user_id AND p.auth_user_id = auth.uid())
-- Keep legacy anon policies until PIN sunset; do not drop PIN policies until product confirms.
