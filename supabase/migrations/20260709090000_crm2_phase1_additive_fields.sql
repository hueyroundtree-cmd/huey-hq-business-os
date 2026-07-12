BEGIN;

-- CRM 2.0 Phase 1 additive support.
-- Guardrails:
-- - Do not replace the existing CRM.
-- - Do not alter or migrate the existing lead_status enum.
-- - Preserve the existing 7-stage pipeline used by the app.

CREATE TABLE IF NOT EXISTS public.business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_units TO authenticated;
GRANT ALL ON public.business_units TO service_role;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_units'
      AND policyname = 'read business units'
  ) THEN
    CREATE POLICY "read business units"
      ON public.business_units
      FOR SELECT
      USING (true);
  END IF;
END $$;

INSERT INTO public.business_units (id, name, slug)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Great Freight Mobile Detailing', 'great-freight-mobile-detailing'),
  ('22222222-2222-4222-8222-222222222222', 'Great Freight Logistics', 'great-freight-logistics'),
  ('33333333-3333-4333-8333-333333333333', 'Dispatch', 'dispatch'),
  ('44444444-4444-4444-8444-444444444444', 'Content & Brand Deals', 'content-brand-deals'),
  ('55555555-5555-4555-8555-555555555555', 'Digital Products', 'digital-products'),
  ('66666666-6666-4666-8666-666666666666', 'Shopify', 'shopify'),
  ('77777777-7777-4777-8777-777777777777', 'Stan Store', 'stan-store'),
  ('88888888-8888-4888-8888-888888888888', 'Future Trucking', 'future-trucking'),
  ('99999999-9999-4999-8999-999999999999', 'Consulting', 'consulting')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS crm_id TEXT,
  ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES public.business_units(id),
  ADD COLUMN IF NOT EXISTS lead_score INTEGER NOT NULL DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  ADD COLUMN IF NOT EXISTS source_record_id TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS vehicle TEXT,
  ADD COLUMN IF NOT EXISTS contact_method TEXT,
  ADD COLUMN IF NOT EXISTS contact_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contacted_by TEXT,
  ADD COLUMN IF NOT EXISTS zoho_email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'Not Requested',
  ADD COLUMN IF NOT EXISTS appointment_status TEXT NOT NULL DEFAULT 'Not Scheduled';

UPDATE public.leads
SET business_unit_id = '11111111-1111-4111-8111-111111111111'
WHERE business_unit_id IS NULL;

ALTER TABLE public.leads
  ALTER COLUMN business_unit_id SET DEFAULT '11111111-1111-4111-8111-111111111111',
  ALTER COLUMN business_unit_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS leads_user_crm_id_idx
  ON public.leads (user_id, crm_id)
  WHERE crm_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS leads_user_crm_id_unique_idx
  ON public.leads (user_id, crm_id)
  WHERE crm_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_user_business_unit_idx
  ON public.leads (user_id, business_unit_id);

CREATE INDEX IF NOT EXISTS leads_user_source_record_idx
  ON public.leads (user_id, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE OR REPLACE VIEW public.crm_activity AS
SELECT
  la.id,
  la.user_id,
  la.lead_id,
  'lead_activity'::TEXT AS activity_source,
  lower(regexp_replace(la.kind, '[^a-zA-Z0-9]+', '_', 'g')) AS event_type,
  la.kind AS title,
  la.detail,
  'lead_activities'::TEXT AS source,
  '{}'::JSONB AS metadata,
  la.created_at AS occurred_at,
  la.created_at
FROM public.lead_activities la
UNION ALL
SELECT
  oe.id,
  oe.user_id,
  oe.entity_id AS lead_id,
  'operations_event'::TEXT AS activity_source,
  oe.event_type,
  oe.title,
  oe.detail,
  oe.source,
  oe.metadata,
  oe.occurred_at,
  oe.created_at
FROM public.operations_events oe
WHERE oe.entity_type = 'lead';

GRANT SELECT ON public.crm_activity TO authenticated;
GRANT SELECT ON public.crm_activity TO service_role;

COMMENT ON VIEW public.crm_activity IS
  'CRM 2.0 Phase 1 compatibility view over lead_activities and operations_events. Event Engine remains operations_events; lead timeline remains lead_activities.';

COMMIT;
