-- Fallback when Edge Function "send-push-notification" is not redeployed yet:
-- admins can still mark broadcast as sent and fan out user_notifications from the client.

CREATE OR REPLACE FUNCTION public.admin_fanout_notification_in_app(p_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target text;
  v_sent_at timestamptz;
  cnt int := 0;
BEGIN
  IF coalesce(auth.jwt()->'app_metadata'->>'karmaterra_admin', '') <> 'true' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT target_audience, sent_at
  INTO v_target, v_sent_at
  FROM public.notifications
  WHERE id = p_notification_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'notification not found';
  END IF;

  IF v_sent_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_sent', true, 'in_app_users', 0);
  END IF;

  IF v_target = 'all' THEN
    INSERT INTO public.user_notifications (user_id, notification_id, is_read)
    SELECT p.id, p_notification_id, false
    FROM public.profiles p
    ON CONFLICT (user_id, notification_id) DO NOTHING;

    SELECT COUNT(*)::int INTO cnt FROM public.profiles;
  ELSE
    SELECT COUNT(*)::int INTO cnt
    FROM public.user_notifications un
    WHERE un.notification_id = p_notification_id;
  END IF;

  UPDATE public.notifications
  SET sent_at = now()
  WHERE id = p_notification_id;

  RETURN jsonb_build_object('ok', true, 'in_app_users', cnt);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fanout_notification_in_app(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_fanout_notification_in_app(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_fanout_notification_in_app IS
  'Admin-only (JWT app_metadata.karmaterra_admin): fan out in-app notification and set sent_at when push path is unavailable.';
