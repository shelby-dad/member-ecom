-- Normalize trigger URL for user-created edge notify.
-- Supports both:
-- 1) https://<ref>.supabase.co/functions/v1
-- 2) https://<ref>.supabase.co/functions/v1/user-created-notify

CREATE OR REPLACE FUNCTION public.notify_user_created_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
  token text;
  endpoint text;
BEGIN
  BEGIN
    SELECT
      coalesce(edge_functions_base_url, ''),
      coalesce(edge_functions_token, '')
    INTO base_url, token
    FROM public.internal_edge_settings
    WHERE id = 1;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'notify_user_created_edge settings load failed: %', SQLERRM;
    RETURN NEW;
  END;

  IF base_url = '' OR token = '' THEN
    RETURN NEW;
  END IF;

  endpoint := rtrim(base_url, '/');
  IF right(endpoint, length('/user-created-notify')) <> '/user-created-notify' THEN
    endpoint := endpoint || '/user-created-notify';
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || token
      ),
      body := jsonb_build_object(
        'user_id', NEW.id::text,
        'email', NEW.email,
        'created_at', NEW.created_at
      ),
      timeout_milliseconds := 8000
    );
  EXCEPTION WHEN others THEN
    RAISE WARNING 'notify_user_created_edge http_post failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
