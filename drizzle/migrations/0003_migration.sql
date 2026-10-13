ALTER TABLE public.sumup_payments
  ADD COLUMN IF NOT EXISTS ingest_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ingest_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ingest_error text,
  ADD COLUMN IF NOT EXISTS ingest_delivered_at timestamptz;