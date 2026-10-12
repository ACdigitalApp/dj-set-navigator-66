CREATE TABLE public.sumup_payments (
  checkout_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  plan text NOT NULL,
  amount numeric NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sumup_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view sumup payments" ON public.sumup_payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.sumup_payments TO authenticated;
GRANT ALL ON public.sumup_payments TO service_role;

CREATE OR REPLACE FUNCTION public.expire_pro_plans()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  UPDATE public.profiles SET plan = 'free', subscription_status = 'expired', updated_at = now()
  WHERE plan = 'pro' AND current_period_end IS NOT NULL AND current_period_end < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE EXECUTE ON FUNCTION public.expire_pro_plans() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('djs-expire-pro', '15 * * * *', $$SELECT public.expire_pro_plans();$$);