BEGIN;

-- Concord Outreach fields for the existing Command Center CRM.
-- Additive only; no status enum changes and no destructive operations.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS address_service_area TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS verification_source TEXT,
  ADD COLUMN IF NOT EXISTS date_added DATE,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS outreach_status TEXT NOT NULL DEFAULT 'Ready to Send',
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_body TEXT,
  ADD COLUMN IF NOT EXISTS text_message_template TEXT,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS text_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS leads_user_city_idx
  ON public.leads (user_id, city);

CREATE INDEX IF NOT EXISTS leads_user_outreach_status_idx
  ON public.leads (user_id, outreach_status);

CREATE INDEX IF NOT EXISTS leads_user_concord_source_idx
  ON public.leads (user_id, source)
  WHERE source = 'Concord Professional Outreach';

COMMIT;
