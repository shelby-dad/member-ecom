-- Trigger auth user creation -> call edge function microservice via pg_net.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_user_created_edge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text := current_setting('app.settings.edge_functions_base_url', true);
  token text := current_setting('app.settings.edge_functions_token', true);
BEGIN
  IF coalesce(base_url, '') = '' OR coalesce(token, '') = '' THEN
    RETURN NEW;
  END IF;

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created_edge_notify ON auth.users;

CREATE TRIGGER trg_auth_user_created_edge_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.notify_user_created_edge();
