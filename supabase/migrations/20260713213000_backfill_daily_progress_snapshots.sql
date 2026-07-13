BEGIN;

-- Backfill daily_performance_snapshots only from reliable existing source rows.
-- This does not invent zero-activity days.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    WITH source_days AS (
      SELECT
        l.user_id,
        COALESCE(bu.name, 'Great Freight Mobile Detailing') AS business_unit,
        COALESCE(l.date_added, public.daily_progress_date_pacific(l.created_at)) AS progress_date
      FROM public.leads l
      LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id

      UNION
      SELECT
        l.user_id,
        COALESCE(bu.name, 'Great Freight Mobile Detailing') AS business_unit,
        public.daily_progress_date_pacific(l.updated_at) AS progress_date
      FROM public.leads l
      LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id

      UNION
      SELECT
        la.user_id,
        COALESCE(bu.name, 'Great Freight Mobile Detailing') AS business_unit,
        public.daily_progress_date_pacific(la.created_at) AS progress_date
      FROM public.lead_activities la
      JOIN public.leads l ON l.id = la.lead_id
      LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id

      UNION
      SELECT
        oe.user_id,
        COALESCE(bu.name, 'Great Freight Mobile Detailing') AS business_unit,
        public.daily_progress_date_pacific(COALESCE(oe.occurred_at, oe.created_at)) AS progress_date
      FROM public.operations_events oe
      LEFT JOIN public.leads l ON l.id = oe.entity_id AND oe.entity_type = 'lead'
      LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id
      WHERE oe.entity_type = 'lead'

      UNION
      SELECT
        em.user_id,
        COALESCE(bu.name, 'Great Freight Mobile Detailing') AS business_unit,
        public.daily_progress_date_pacific(COALESCE(em.sent_at, em.replied_at, em.created_at)) AS progress_date
      FROM public.crm_email_messages em
      LEFT JOIN public.leads l ON l.id = em.lead_id
      LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id

      UNION
      SELECT
        j.user_id,
        COALESCE(bu.name, 'Great Freight Mobile Detailing') AS business_unit,
        public.daily_progress_date_pacific(COALESCE(j.updated_at, j.scheduled_at, j.created_at)) AS progress_date
      FROM public.jobs j
      LEFT JOIN public.leads l ON l.id = j.lead_id
      LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id

      UNION
      SELECT
        r.user_id,
        public.daily_progress_business_unit_from_stream(r.stream::text) AS business_unit,
        r.entry_date AS progress_date
      FROM public.revenue_entries r

      UNION
      SELECT
        c.user_id,
        'Content & Brand Deals' AS business_unit,
        public.daily_progress_date_pacific(COALESCE(c.updated_at, c.created_at)) AS progress_date
      FROM public.content_items c
      WHERE c.stage = 'Posted'

      UNION
      SELECT
        dc.user_id,
        'Great Freight Mobile Detailing' AS business_unit,
        dc.check_date AS progress_date
      FROM public.daily_checkins dc
    )
    SELECT DISTINCT user_id, business_unit, progress_date
    FROM source_days
    WHERE user_id IS NOT NULL
      AND business_unit IS NOT NULL
      AND progress_date IS NOT NULL
  LOOP
    PERFORM public.refresh_daily_performance_snapshot(rec.user_id, rec.business_unit, rec.progress_date);
  END LOOP;
END $$;

COMMIT;
