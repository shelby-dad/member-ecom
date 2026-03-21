-- Supabase-safe runtime config for edge trigger calls.
-- Managed Postgres may block ALTER DATABASE custom settings.

CREATE TABLE IF NOT EXISTS public.internal_edge_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  edge_functions_base_url text,
  edge_functions_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_edge_settings ENABLE ROW LEVEL SECURITY;

-- No direct client access to this table.
DROP POLICY IF EXISTS internal_edge_settings_select_none ON public.internal_edge_settings;
CREATE POLICY internal_edge_settings_select_none
  ON public.internal_edge_settings
  FOR SELECT
  TO authenticated, anon
  USING (false);

INSERT INTO public.internal_edge_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

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
  SELECT
    coalesce(edge_functions_base_url, ''),
    coalesce(edge_functions_token, '')
  INTO base_url, token
  FROM public.internal_edge_settings
  WHERE id = 1;

  IF base_url = '' OR token = '' THEN
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
