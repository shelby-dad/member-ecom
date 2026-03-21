-- Make auth user-created notification trigger non-blocking.
-- User creation must succeed even if edge notification fails.

CREATE OR REPLACE FUNCTION public.notify_user_created_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
  token text;
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

  IF coalesce(base_url, '') = '' OR coalesce(token, '') = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := rtrim(base_url, '/') || '/user-created-notify',
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
    -- non-blocking by design
  END;

  RETURN NEW;
END;
$$;
