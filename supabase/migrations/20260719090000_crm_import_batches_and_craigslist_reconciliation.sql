BEGIN;

-- CRM 2.0 Phase 1: reviewed import batches plus the proof-safe July 2
-- Craigslist reconciliation. This extends the existing CRM and Event Engine.

CREATE TABLE IF NOT EXISTS public.crm_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Previewed',
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  merged_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  original_headers TEXT,
  latest_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, batch_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_import_batches TO authenticated;
GRANT ALL ON public.crm_import_batches TO service_role;
ALTER TABLE public.crm_import_batches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_import_batches'
      AND policyname = 'own CRM import batches'
  ) THEN
    CREATE POLICY "own CRM import batches"
      ON public.crm_import_batches FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.crm_import_batches(id);

CREATE INDEX IF NOT EXISTS leads_user_import_batch_idx
  ON public.leads (user_id, import_batch_id)
  WHERE import_batch_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_import_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  import_batch_id UUID NOT NULL REFERENCES public.crm_import_batches(id) ON DELETE CASCADE,
  source_record_id TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('Imported', 'Merged', 'Skipped', 'Failed')),
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  original_data JSONB NOT NULL,
  previous_values JSONB,
  error_message TEXT,
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, import_batch_id, source_record_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_import_reconciliation TO authenticated;
GRANT ALL ON public.crm_import_reconciliation TO service_role;
ALTER TABLE public.crm_import_reconciliation ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'crm_import_reconciliation'
      AND policyname = 'own CRM import reconciliation'
  ) THEN
    CREATE POLICY "own CRM import reconciliation"
      ON public.crm_import_reconciliation FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
DECLARE
  v_user RECORD;
  v_row RECORD;
  v_existing public.leads%ROWTYPE;
  v_lead_id UUID;
  v_batch_id UUID;
  v_outcome TEXT;
  v_missing TEXT[];
BEGIN
  FOR v_user IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.crm_import_batches (
      user_id, batch_name, source, status, total_rows, original_headers
    )
    VALUES (
      v_user.id,
      'Craigslist_2026_07_02',
      'Craigslist',
      'Running',
      13,
      'Lead ID,Name,Business,Vehicle,Phone,Email,Source,City,Date Added,Last Contact,Next Follow-up,Status,Listing URL,Notes'
    )
    ON CONFLICT (user_id, batch_name) DO UPDATE
    SET status = 'Running', latest_error = NULL
    RETURNING id INTO v_batch_id;

    FOR v_row IN
      SELECT *
      FROM (VALUES
        ('CL-001','Craigslist Seller',NULL::TEXT,'Unknown',NULL::TEXT,'01686418379a3af4be1756563f7f790d@sale.craigslist.org','Recovered from attached outreach transcript; not contacted'),
        ('CL-002','Craigslist Seller',NULL::TEXT,'Unknown','(707) 770-7368','e1537a89b74136fc868e61c92a088d6b@sale.craigslist.org','Direct phone available; not contacted'),
        ('CL-003','Craigslist Seller',NULL::TEXT,'Unknown',NULL::TEXT,'793df5be435d307fadef3f6e3a5996c4@sale.craigslist.org','Recovered from attached outreach transcript; not contacted'),
        ('CL-004','Craigslist Seller',NULL::TEXT,'Unknown',NULL::TEXT,'61a96a17e0e935c38a7f137b964e2952@sale.craigslist.org','Recovered from attached outreach transcript; not contacted'),
        ('CL-005','Craigslist Seller',NULL::TEXT,'Unknown',NULL::TEXT,'dcf1f5a566be3c168e2020654c326a74@sale.craigslist.org','Recovered from attached outreach transcript; not contacted'),
        ('CL-006','Craigslist Seller',NULL::TEXT,'2020 Chevy 2500 High Country',NULL::TEXT,'6c11baf72de033438892d4bc325af8a3@sale.craigslist.org','High-value truck; relay address separated from concatenated vehicle text'),
        ('CL-007','Craigslist Seller',NULL::TEXT,'1985 Buick Riviera 2D Coupe (26k miles)',NULL::TEXT,'e37e34d86251397b8c7df24e7983c6fa@sale.craigslist.org','Collector vehicle; not contacted'),
        ('CL-008','Craigslist Seller',NULL::TEXT,'2008 Chevy Impala','(707) 655-3152','6a2d5d8f02ac3c6f80d3046f2deff3e6@sale.craigslist.org','Direct phone available; relay address separated from concatenated vehicle text'),
        ('CL-009','Craigslist Seller',NULL::TEXT,'2002 Lincoln Navigator',NULL::TEXT,NULL::TEXT,'Original relay address was not recoverable from the attachment'),
        ('CL-010','Craigslist Seller',NULL::TEXT,'2014 Mini Cooper',NULL::TEXT,NULL::TEXT,'Original relay address was not recoverable from the attachment'),
        ('CL-011','Craigslist Seller',NULL::TEXT,'2023 vehicle (model unknown)','(707) 339-9033',NULL::TEXT,'Direct phone available; original relay address was not recoverable'),
        ('CL-012','Craigslist Seller',NULL::TEXT,'2011 Toyota Tundra TRD 4x4',NULL::TEXT,NULL::TEXT,'Original relay address was not recoverable; duplicate mentioned in source transcript'),
        ('CL-013','Craigslist Seller',NULL::TEXT,'2001 Chevrolet 2500HD Long Bed',NULL::TEXT,'bede7031ae9aacf39319322eeb751b38833@sale.craigslist.org','High-value truck; relay address separated from concatenated vehicle text')
      ) AS staged(source_record_id, name, business, vehicle, phone, email, notes)
    LOOP
      v_existing := NULL;
      SELECT l.* INTO v_existing
      FROM public.leads l
      WHERE l.user_id = v_user.id
        AND (
          l.source_record_id = v_row.source_record_id
          OR l.crm_id = v_row.source_record_id
          OR (v_row.email IS NOT NULL AND lower(l.email) = lower(v_row.email))
          OR (
            v_row.phone IS NOT NULL
            AND regexp_replace(COALESCE(l.phone, ''), '\D', '', 'g')
              = regexp_replace(v_row.phone, '\D', '', 'g')
          )
        )
      ORDER BY l.updated_at DESC
      LIMIT 1;

      v_missing := ARRAY[]::TEXT[];
      IF v_row.email IS NULL THEN v_missing := array_append(v_missing, 'email'); END IF;
      IF v_row.phone IS NULL THEN v_missing := array_append(v_missing, 'phone'); END IF;
      IF v_row.vehicle = 'Unknown' THEN v_missing := array_append(v_missing, 'vehicle'); END IF;
      v_missing := array_cat(v_missing, ARRAY['city','listing_url','seller_name','estimated_price']);

      IF v_existing.id IS NOT NULL THEN
        UPDATE public.leads
        SET
          crm_id = COALESCE(crm_id, v_row.source_record_id),
          source_record_id = COALESCE(source_record_id, v_row.source_record_id),
          name = COALESCE(NULLIF(name, ''), v_row.name),
          business = COALESCE(business, v_row.business),
          vehicle = CASE WHEN vehicle IS NULL OR vehicle = '' OR vehicle = 'Unknown' THEN v_row.vehicle ELSE vehicle END,
          phone = COALESCE(phone, v_row.phone),
          email = COALESCE(email, v_row.email),
          source = COALESCE(NULLIF(source, ''), 'Craigslist'),
          industry = COALESCE(industry, 'Private Seller'),
          business_unit_id = COALESCE(business_unit_id, '11111111-1111-4111-8111-111111111111'),
          import_batch_id = COALESCE(import_batch_id, v_batch_id),
          notes = CASE
            WHEN COALESCE(notes, '') ILIKE '%Craigslist_2026_07_02%' THEN notes
            ELSE trim(COALESCE(notes, '') || CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n\n' END ||
              'Import batch: Craigslist_2026_07_02. ' || v_row.notes ||
              '. Contacted remains unchanged; no outreach was sent by this import.')
          END,
          updated_at = now()
        WHERE id = v_existing.id
        RETURNING id INTO v_lead_id;
        v_outcome := 'Merged';
      ELSE
        INSERT INTO public.leads (
          user_id, crm_id, name, business, vehicle, phone, email, source,
          source_record_id, lead_type, industry, business_unit_id, status, outreach_status,
          zoho_email_sent, deposit_status, appointment_status, date_added,
          import_batch_id, next_action, notes
        )
        VALUES (
          v_user.id, v_row.source_record_id, v_row.name, v_row.business,
          v_row.vehicle, v_row.phone, v_row.email, 'Craigslist',
          v_row.source_record_id, 'Detailing', 'Private Seller',
          '11111111-1111-4111-8111-111111111111', 'New Lead',
          'Not Contacted', false, 'Not Requested', 'Not Scheduled',
          '2026-07-02'::DATE, v_batch_id,
          'Complete missing information, then choose a verified outreach method',
          'Import batch: Craigslist_2026_07_02. ' || v_row.notes ||
          '. Contacted: No. No outreach was sent by this import.'
        )
        RETURNING id INTO v_lead_id;
        v_outcome := 'Imported';

        INSERT INTO public.lead_activities (user_id, lead_id, kind, detail, created_at)
        VALUES (
          v_user.id, v_lead_id, 'Lead imported',
          v_row.source_record_id || ' imported from reviewed Craigslist staging; outreach not sent.',
          '2026-07-02 12:00:00-07'::TIMESTAMPTZ
        );
      END IF;

      INSERT INTO public.crm_import_reconciliation (
        user_id, import_batch_id, source_record_id, lead_id, outcome,
        missing_fields, original_data, previous_values
      )
      VALUES (
        v_user.id, v_batch_id, v_row.source_record_id, v_lead_id, v_outcome,
        v_missing, to_jsonb(v_row),
        CASE WHEN v_outcome = 'Merged' THEN to_jsonb(v_existing) ELSE NULL END
      )
      ON CONFLICT (user_id, import_batch_id, source_record_id) DO UPDATE
      SET
        lead_id = EXCLUDED.lead_id,
        outcome = CASE
          WHEN public.crm_import_reconciliation.outcome = 'Imported' THEN 'Imported'
          ELSE EXCLUDED.outcome
        END,
        missing_fields = EXCLUDED.missing_fields,
        original_data = EXCLUDED.original_data,
        previous_values = COALESCE(public.crm_import_reconciliation.previous_values, EXCLUDED.previous_values),
        reconciled_at = now();
    END LOOP;

    UPDATE public.crm_import_batches b
    SET
      status = 'Completed',
      imported_rows = counts.imported_rows,
      merged_rows = counts.merged_rows,
      skipped_rows = counts.skipped_rows,
      failed_rows = counts.failed_rows,
      completed_at = now()
    FROM (
      SELECT
        count(*) FILTER (WHERE outcome = 'Imported') AS imported_rows,
        count(*) FILTER (WHERE outcome = 'Merged') AS merged_rows,
        count(*) FILTER (WHERE outcome = 'Skipped') AS skipped_rows,
        count(*) FILTER (WHERE outcome = 'Failed') AS failed_rows
      FROM public.crm_import_reconciliation
      WHERE user_id = v_user.id AND import_batch_id = v_batch_id
    ) counts
    WHERE b.id = v_batch_id;

    INSERT INTO public.operations_events (
      user_id, event_type, entity_type, title, detail, source, metadata
    )
    SELECT
      v_user.id,
      'crm_import_reconciled',
      'import_batch',
      'Craigslist lead import reconciled',
      'All 13 staged July 2 rows were reconciled. No outreach was sent.',
      'CRM',
      jsonb_build_object(
        'batch_name', 'Craigslist_2026_07_02',
        'total_rows', 13,
        'imported_rows', imported_rows,
        'merged_rows', merged_rows
      )
    FROM public.crm_import_batches
    WHERE id = v_batch_id
      AND NOT EXISTS (
        SELECT 1 FROM public.operations_events
        WHERE user_id = v_user.id
          AND event_type = 'crm_import_reconciled'
          AND metadata->>'batch_name' = 'Craigslist_2026_07_02'
      );
  END LOOP;
END $$;

COMMIT;
