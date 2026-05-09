-- Last native client OS for analytics when push device_tokens rows are absent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_client_platform text;

COMMENT ON COLUMN public.profiles.last_client_platform IS
  'android | ios from the mobile app on last session; complements device_tokens for admin analytics.';
