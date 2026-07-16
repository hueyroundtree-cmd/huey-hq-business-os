-- Stabilization pass: truthful connection status labels and structured finance fields.
-- Daily Driver canonical Notion page:
-- 37f0c11a-8316-810c-bc3d-c6b7679c1244

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.integration_status'::regtype
      AND enumlabel = 'Not Connected'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.integration_status'::regtype
      AND enumlabel = 'Needs Setup'
  ) THEN
    ALTER TYPE public.integration_status RENAME VALUE 'Not Connected' TO 'Needs Setup';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.integration_status'::regtype
      AND enumlabel = 'Connected'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.integration_status'::regtype
      AND enumlabel = 'Verified Live'
  ) THEN
    ALTER TYPE public.integration_status RENAME VALUE 'Connected' TO 'Verified Live';
  END IF;
END $$;

ALTER TYPE public.integration_status ADD VALUE IF NOT EXISTS 'Manual Only';
ALTER TYPE public.integration_status ADD VALUE IF NOT EXISTS 'Not Implemented';

ALTER TABLE public.integrations
  ALTER COLUMN status SET DEFAULT 'Needs Setup';

ALTER TABLE public.sync_mappings
  ALTER COLUMN status SET DEFAULT 'Needs Setup';

ALTER TABLE public.revenue_entries
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS available_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS income_lane public.income_stream,
  ADD COLUMN IF NOT EXISTS week_start DATE,
  ADD COLUMN IF NOT EXISTS month_start DATE;

UPDATE public.revenue_entries
SET
  source = COALESCE(source, payment_method, stream::text),
  gross_amount = COALESCE(gross_amount, amount),
  available_amount = COALESCE(available_amount, amount, gross_amount),
  income_lane = COALESCE(income_lane, stream),
  week_start = COALESCE(week_start, date_trunc('week', entry_date::timestamp)::date),
  month_start = COALESCE(month_start, date_trunc('month', entry_date::timestamp)::date);

ALTER TABLE public.revenue_entries
  ALTER COLUMN gross_amount SET DEFAULT 0,
  ALTER COLUMN available_amount SET DEFAULT 0;

UPDATE public.sync_mappings
SET
  target_ref = '37f0c11a-8316-810c-bc3d-c6b7679c1244',
  status = 'Needs Setup',
  verified_at = NULL,
  last_sync_at = NULL,
  last_error = NULL
WHERE provider = 'Notion'
  AND entity = 'daily_checkins'
  AND target_ref IS DISTINCT FROM '37f0c11a-8316-810c-bc3d-c6b7679c1244';
