
CREATE TABLE IF NOT EXISTS public.app_visit_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_key text UNIQUE NOT NULL,
  total_visits integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_visit_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_visit_counters" ON public.app_visit_counters;
CREATE POLICY "Public read app_visit_counters"
ON public.app_visit_counters
FOR SELECT
USING (true);

INSERT INTO public.app_visit_counters (app_key, total_visits)
VALUES ('djsengine', 0)
ON CONFLICT (app_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_app_visit(p_app_key text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total integer;
BEGIN
  INSERT INTO public.app_visit_counters (app_key, total_visits)
  VALUES (p_app_key, 1)
  ON CONFLICT (app_key)
  DO UPDATE SET
    total_visits = public.app_visit_counters.total_visits + 1,
    updated_at = now()
  RETURNING total_visits INTO new_total;
  RETURN new_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_app_visit_count(p_app_key text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT total_visits FROM public.app_visit_counters WHERE app_key = p_app_key),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public.increment_app_visit(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_visit_count(text) TO anon, authenticated;
