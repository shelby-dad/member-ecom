-- Replace edge-function trigger with Nuxt-server queue orchestration.
-- Auth user creation writes lightweight queue jobs only.

DROP TRIGGER IF EXISTS trg_auth_user_created_edge_notify ON auth.users;
DROP FUNCTION IF EXISTS public.notify_user_created_edge();
DROP TABLE IF EXISTS public.internal_edge_settings;

CREATE TABLE IF NOT EXISTS public.internal_job_queue (
  id bigserial PRIMARY KEY,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'retry', 'done', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts > 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_job_queue_claim
  ON public.internal_job_queue (job_type, status, available_at, created_at);

CREATE INDEX IF NOT EXISTS idx_internal_job_queue_status
  ON public.internal_job_queue (status, updated_at DESC);

ALTER TABLE public.internal_job_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_job_queue_no_select ON public.internal_job_queue;
CREATE POLICY internal_job_queue_no_select
  ON public.internal_job_queue
  FOR SELECT
  TO authenticated, anon
  USING (false);

DROP TRIGGER IF EXISTS internal_job_queue_updated_at ON public.internal_job_queue;
CREATE TRIGGER internal_job_queue_updated_at
  BEFORE UPDATE ON public.internal_job_queue
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION public.enqueue_auth_user_created_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.internal_job_queue (
    job_type,
    payload,
    status,
    available_at,
    max_attempts
  )
  VALUES (
    'auth_user_created_notify',
    jsonb_build_object(
      'user_id', NEW.id::text,
      'email', NEW.email,
      'created_at', NEW.created_at
    ),
    'pending',
    now(),
    8
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_created_edge_notify ON auth.users;
CREATE TRIGGER trg_auth_user_created_edge_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_auth_user_created_notification();

CREATE OR REPLACE FUNCTION public.claim_internal_job_queue(
  p_job_type text,
  p_limit integer DEFAULT 10,
  p_worker text DEFAULT NULL
)
RETURNS SETOF public.internal_job_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT q.id
    FROM public.internal_job_queue q
    WHERE q.job_type = p_job_type
      AND q.status IN ('pending', 'retry')
      AND q.available_at <= now()
    ORDER BY q.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 100))
  ),
  updated AS (
    UPDATE public.internal_job_queue q
    SET
      status = 'processing',
      attempt_count = q.attempt_count + 1,
      locked_at = now(),
      locked_by = COALESCE(NULLIF(p_worker, ''), 'nuxt-server'),
      updated_at = now()
    FROM picked p
    WHERE q.id = p.id
    RETURNING q.*
  )
  SELECT * FROM updated;
END;
$$;
