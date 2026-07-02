BEGIN;

CREATE TYPE public.lead_status_v2 AS ENUM (
  'New Lead', 'Contacted', 'Quoted', 'Booked', 'Completed', 'Review Requested', 'Closed/Lost',
  'Quote Sent', 'Lost', 'Follow-Up Needed'
);

ALTER TABLE public.leads ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.leads
  ALTER COLUMN status TYPE public.lead_status_v2
  USING (
    CASE status::text
      WHEN 'Quote Sent' THEN 'Quoted'
      WHEN 'Lost' THEN 'Closed/Lost'
      WHEN 'Follow-Up Needed' THEN 'Contacted'
      ELSE status::text
    END
  )::public.lead_status_v2;

DROP TYPE public.lead_status;
ALTER TYPE public.lead_status_v2 RENAME TO lead_status;

ALTER TABLE public.leads
  ALTER COLUMN status SET DEFAULT 'New Lead';

ALTER TABLE public.leads
  ADD COLUMN estimated_value NUMERIC(12,2),
  ADD COLUMN lead_type TEXT NOT NULL DEFAULT 'Detailing'
    CHECK (lead_type IN ('Detailing', 'Logistics', 'Dealer/Fleet'));

UPDATE public.leads
SET estimated_value = quote_amount
WHERE estimated_value IS NULL;

CREATE INDEX leads_user_type_idx ON public.leads (user_id, lead_type);

COMMIT;
