BEGIN;

-- Keep daily_performance_snapshots as the only daily progress history table.
-- These helpers refresh the derived cache from authoritative source records.

CREATE OR REPLACE FUNCTION public.daily_progress_business_unit_from_stream(p_stream TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN lower(COALESCE(p_stream, '')) LIKE '%logistics%' THEN 'Great Freight Logistics'
    WHEN lower(COALESCE(p_stream, '')) LIKE '%shopify%' THEN 'Shopify'
    WHEN lower(COALESCE(p_stream, '')) LIKE '%stan%' THEN 'Stan Store'
    WHEN lower(COALESCE(p_stream, '')) LIKE '%content%' THEN 'Content & Brand Deals'
    ELSE 'Great Freight Mobile Detailing'
  END;
$$;

CREATE OR REPLACE FUNCTION public.daily_progress_date_pacific(p_value TIMESTAMPTZ)
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT (p_value AT TIME ZONE 'America/Los_Angeles')::date;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_performance_snapshot(
  p_user_id UUID,
  p_business_unit TEXT,
  p_progress_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_unit TEXT := COALESCE(NULLIF(p_business_unit, ''), 'Great Freight Mobile Detailing');
  v_business_unit_id UUID;
  v_existing_finalized TIMESTAMPTZ;
  v_new_leads INTEGER := 0;
  v_leads_contacted INTEGER := 0;
  v_emails_sent INTEGER := 0;
  v_texts_sent INTEGER := 0;
  v_calls_made INTEGER := 0;
  v_replies_received INTEGER := 0;
  v_estimates_sent INTEGER := 0;
  v_bookings_created INTEGER := 0;
  v_appointments_completed INTEGER := 0;
  v_deposits_collected NUMERIC(12,2) := 0;
  v_revenue_collected NUMERIC(12,2) := 0;
  v_reviews_requested INTEGER := 0;
  v_reviews_received INTEGER := 0;
  v_followups_completed INTEGER := 0;
  v_content_posts INTEGER := 0;
  v_planning_completed BOOLEAN := false;
  v_end_review_completed BOOLEAN := false;
  v_daily_score INTEGER := 0;
  v_outreach_total INTEGER := 0;
  v_incomplete BOOLEAN := false;
BEGIN
  IF p_user_id IS NULL OR p_progress_date IS NULL THEN
    RETURN;
  END IF;

  SELECT finalized_at
  INTO v_existing_finalized
  FROM public.daily_performance_snapshots
  WHERE user_id = p_user_id
    AND business_unit = v_business_unit
    AND progress_date = p_progress_date;

  IF v_existing_finalized IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_business_unit_id
  FROM public.business_units
  WHERE name = v_business_unit
  LIMIT 1;

  WITH scoped_leads AS (
    SELECT *
    FROM public.leads
    WHERE user_id = p_user_id
      AND COALESCE(business_unit_id, '11111111-1111-4111-8111-111111111111'::uuid) = COALESCE(v_business_unit_id, '11111111-1111-4111-8111-111111111111'::uuid)
  ),
  scoped_activities AS (
    SELECT la.*
    FROM public.lead_activities la
    JOIN scoped_leads l ON l.id = la.lead_id
  ),
  scoped_events AS (
    SELECT oe.*
    FROM public.operations_events oe
    JOIN scoped_leads l ON l.id = oe.entity_id
    WHERE oe.entity_type = 'lead'
  ),
  scoped_emails AS (
    SELECT em.*
    FROM public.crm_email_messages em
    LEFT JOIN scoped_leads l ON l.id = em.lead_id
    WHERE em.user_id = p_user_id
      AND (em.lead_id IS NULL OR l.id IS NOT NULL)
  )
  SELECT
    (SELECT count(*) FROM scoped_leads WHERE COALESCE(date_added, created_at::date) = p_progress_date),
    (SELECT count(DISTINCT lead_id) FROM (
      SELECT id AS lead_id FROM scoped_leads WHERE
        public.daily_progress_date_pacific(last_contact_at) = p_progress_date OR
        public.daily_progress_date_pacific(contact_date) = p_progress_date OR
        public.daily_progress_date_pacific(email_sent_at) = p_progress_date OR
        public.daily_progress_date_pacific(text_sent_at) = p_progress_date
      UNION
      SELECT lead_id FROM scoped_activities
      WHERE public.daily_progress_date_pacific(created_at) = p_progress_date
        AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(contact|email|text|sms|call|voicemail|reply|follow)'
      UNION
      SELECT lead_id FROM scoped_emails
      WHERE direction = 'outbound'
        AND status = 'sent'
        AND public.daily_progress_date_pacific(COALESCE(sent_at, created_at)) = p_progress_date
    ) contacts),
    (SELECT count(*) FROM scoped_emails WHERE direction = 'outbound' AND status = 'sent' AND public.daily_progress_date_pacific(COALESCE(sent_at, created_at)) = p_progress_date)
      + (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) LIKE '%email%' AND lower(COALESCE(detail, '')) NOT LIKE '%zoho email sent%'),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(text|sms)')
      + (SELECT count(*) FROM scoped_leads WHERE public.daily_progress_date_pacific(text_sent_at) = p_progress_date),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(call|voicemail)'),
    (SELECT count(*) FROM scoped_emails WHERE (direction = 'inbound' OR status = 'reply_synced') AND public.daily_progress_date_pacific(COALESCE(replied_at, created_at)) = p_progress_date)
      + (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(reply|replied)'),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(quote|estimate)')
      + (SELECT count(*) FROM scoped_leads WHERE public.daily_progress_date_pacific(updated_at) = p_progress_date AND (COALESCE(quote_amount, 0) > 0 OR COALESCE(estimated_value, 0) > 0)),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(booked|booking)')
      + (SELECT count(*) FROM scoped_leads WHERE status = 'Booked' AND COALESCE(public.daily_progress_date_pacific(booking_at), public.daily_progress_date_pacific(updated_at)) = p_progress_date),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) LIKE '%completed%')
      + (SELECT count(*) FROM public.jobs j LEFT JOIN scoped_leads l ON l.id = j.lead_id WHERE j.user_id = p_user_id AND (j.lead_id IS NULL OR l.id IS NOT NULL) AND j.status = 'Completed' AND COALESCE(public.daily_progress_date_pacific(j.updated_at), public.daily_progress_date_pacific(j.scheduled_at), public.daily_progress_date_pacific(j.created_at)) = p_progress_date)
      + (SELECT count(*) FROM scoped_leads WHERE status = 'Completed' AND public.daily_progress_date_pacific(updated_at) = p_progress_date),
    COALESCE((SELECT sum(deposit) FROM scoped_leads WHERE COALESCE(deposit, 0) > 0 AND lower(COALESCE(deposit_status, '')) ~ '(paid|collected|received|complete|completed)' AND public.daily_progress_date_pacific(updated_at) = p_progress_date), 0),
    COALESCE((SELECT sum(amount) FROM public.revenue_entries WHERE user_id = p_user_id AND entry_date = p_progress_date AND public.daily_progress_business_unit_from_stream(stream::text) = v_business_unit), 0),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(review request|review requested)')
      + (SELECT count(*) FROM scoped_leads WHERE status = 'Review Requested' AND public.daily_progress_date_pacific(updated_at) = p_progress_date),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) ~ '(review received|review posted|review completed)'),
    (SELECT count(*) FROM scoped_activities WHERE public.daily_progress_date_pacific(created_at) = p_progress_date AND lower(COALESCE(kind, '') || ' ' || COALESCE(detail, '')) LIKE '%follow%'),
    (SELECT count(*) FROM public.content_items WHERE user_id = p_user_id AND stage = 'Posted' AND v_business_unit = 'Content & Brand Deals' AND public.daily_progress_date_pacific(COALESCE(updated_at, created_at)) = p_progress_date),
    EXISTS (SELECT 1 FROM public.daily_checkins WHERE user_id = p_user_id AND check_date = p_progress_date AND kind IN ('morning', 'plan')),
    EXISTS (SELECT 1 FROM public.daily_checkins WHERE user_id = p_user_id AND check_date = p_progress_date AND kind = 'evening'),
    EXISTS (SELECT 1 FROM scoped_leads WHERE COALESCE(deposit, 0) > 0 AND lower(COALESCE(deposit_status, '')) !~ '(paid|collected|received|complete|completed)')
  INTO
    v_new_leads,
    v_leads_contacted,
    v_emails_sent,
    v_texts_sent,
    v_calls_made,
    v_replies_received,
    v_estimates_sent,
    v_bookings_created,
    v_appointments_completed,
    v_deposits_collected,
    v_revenue_collected,
    v_reviews_requested,
    v_reviews_received,
    v_followups_completed,
    v_content_posts,
    v_planning_completed,
    v_end_review_completed,
    v_incomplete;

  v_outreach_total := v_emails_sent + v_texts_sent + v_calls_made;
  v_daily_score := LEAST(100, GREATEST(0,
    ROUND(
      LEAST(1, v_revenue_collected / 1.0) * 25
      + LEAST(1, v_outreach_total / 20.0) * 25
      + LEAST(1, v_followups_completed / 5.0) * 20
      + LEAST(1, (v_bookings_created + v_appointments_completed) / 1.0) * 20
      + ((CASE WHEN v_planning_completed THEN 1 ELSE 0 END + CASE WHEN v_end_review_completed THEN 1 ELSE 0 END) / 2.0) * 10
    )::INTEGER
  ));

  INSERT INTO public.daily_performance_snapshots (
    user_id,
    progress_date,
    business_unit,
    new_leads,
    leads_contacted,
    emails_sent,
    texts_sent,
    calls_made,
    replies_received,
    estimates_sent,
    bookings_created,
    appointments_completed,
    deposits_collected,
    revenue_collected,
    reviews_requested,
    reviews_received,
    followups_completed,
    content_posts,
    planning_completed,
    end_of_day_review_completed,
    daily_score,
    goal_completion_percentage,
    source_breakdown,
    incomplete_historical_data
  )
  VALUES (
    p_user_id,
    p_progress_date,
    v_business_unit,
    v_new_leads,
    v_leads_contacted,
    v_emails_sent,
    v_texts_sent,
    v_calls_made,
    v_replies_received,
    v_estimates_sent,
    v_bookings_created,
    v_appointments_completed,
    v_deposits_collected,
    v_revenue_collected,
    v_reviews_requested,
    v_reviews_received,
    v_followups_completed,
    v_content_posts,
    v_planning_completed,
    v_end_review_completed,
    v_daily_score,
    v_daily_score,
    jsonb_build_object('refreshed_from', 'source_triggers', 'time_zone', 'America/Los_Angeles'),
    v_incomplete
  )
  ON CONFLICT (user_id, business_unit, progress_date)
  DO UPDATE SET
    new_leads = EXCLUDED.new_leads,
    leads_contacted = EXCLUDED.leads_contacted,
    emails_sent = EXCLUDED.emails_sent,
    texts_sent = EXCLUDED.texts_sent,
    calls_made = EXCLUDED.calls_made,
    replies_received = EXCLUDED.replies_received,
    estimates_sent = EXCLUDED.estimates_sent,
    bookings_created = EXCLUDED.bookings_created,
    appointments_completed = EXCLUDED.appointments_completed,
    deposits_collected = EXCLUDED.deposits_collected,
    revenue_collected = EXCLUDED.revenue_collected,
    reviews_requested = EXCLUDED.reviews_requested,
    reviews_received = EXCLUDED.reviews_received,
    followups_completed = EXCLUDED.followups_completed,
    content_posts = EXCLUDED.content_posts,
    planning_completed = EXCLUDED.planning_completed,
    end_of_day_review_completed = EXCLUDED.end_of_day_review_completed,
    daily_score = EXCLUDED.daily_score,
    goal_completion_percentage = EXCLUDED.goal_completion_percentage,
    source_breakdown = EXCLUDED.source_breakdown,
    incomplete_historical_data = EXCLUDED.incomplete_historical_data,
    updated_at = now()
  WHERE public.daily_performance_snapshots.finalized_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit TEXT;
  v_day DATE;
BEGIN
  SELECT name INTO v_unit
  FROM public.business_units
  WHERE id = COALESCE(NEW.business_unit_id, '11111111-1111-4111-8111-111111111111'::uuid);
  v_unit := COALESCE(v_unit, 'Great Freight Mobile Detailing');

  FOREACH v_day IN ARRAY ARRAY[
    COALESCE(NEW.date_added, public.daily_progress_date_pacific(NEW.created_at)),
    public.daily_progress_date_pacific(NEW.updated_at),
    public.daily_progress_date_pacific(NEW.last_contact_at),
    public.daily_progress_date_pacific(NEW.contact_date),
    public.daily_progress_date_pacific(NEW.email_sent_at),
    public.daily_progress_date_pacific(NEW.text_sent_at),
    public.daily_progress_date_pacific(NEW.booking_at)
  ] LOOP
    IF v_day IS NOT NULL THEN
      PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, v_unit, v_day);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit TEXT := 'Great Freight Mobile Detailing';
BEGIN
  SELECT bu.name INTO v_unit
  FROM public.leads l
  LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id
  WHERE l.id = NEW.lead_id;
  PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, COALESCE(v_unit, 'Great Freight Mobile Detailing'), public.daily_progress_date_pacific(NEW.created_at));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit TEXT := 'Great Freight Mobile Detailing';
BEGIN
  IF NEW.entity_type = 'lead' THEN
    SELECT bu.name INTO v_unit
    FROM public.leads l
    LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id
    WHERE l.id = NEW.entity_id;
  ELSE
    v_unit := public.daily_progress_business_unit_from_stream(COALESCE(NEW.entity_type, ''));
  END IF;
  PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, COALESCE(v_unit, 'Great Freight Mobile Detailing'), public.daily_progress_date_pacific(COALESCE(NEW.occurred_at, NEW.created_at)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit TEXT := 'Great Freight Mobile Detailing';
  v_day DATE;
BEGIN
  SELECT bu.name INTO v_unit
  FROM public.leads l
  LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id
  WHERE l.id = NEW.lead_id;
  v_day := public.daily_progress_date_pacific(COALESCE(NEW.sent_at, NEW.replied_at, NEW.created_at));
  PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, COALESCE(v_unit, 'Great Freight Mobile Detailing'), v_day);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_revenue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, public.daily_progress_business_unit_from_stream(NEW.stream::text), NEW.entry_date);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit TEXT := 'Great Freight Mobile Detailing';
BEGIN
  SELECT bu.name INTO v_unit
  FROM public.leads l
  LEFT JOIN public.business_units bu ON bu.id = l.business_unit_id
  WHERE l.id = NEW.lead_id;
  PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, COALESCE(v_unit, 'Great Freight Mobile Detailing'), public.daily_progress_date_pacific(COALESCE(NEW.updated_at, NEW.scheduled_at, NEW.created_at)));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_daily_progress_for_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'Posted' THEN
    PERFORM public.refresh_daily_performance_snapshot(NEW.user_id, 'Content & Brand Deals', public.daily_progress_date_pacific(COALESCE(NEW.updated_at, NEW.created_at)));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_daily_progress_leads ON public.leads;
CREATE TRIGGER refresh_daily_progress_leads
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_lead();

DROP TRIGGER IF EXISTS refresh_daily_progress_lead_activities ON public.lead_activities;
CREATE TRIGGER refresh_daily_progress_lead_activities
  AFTER INSERT OR UPDATE ON public.lead_activities
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_activity();

DROP TRIGGER IF EXISTS refresh_daily_progress_operations_events ON public.operations_events;
CREATE TRIGGER refresh_daily_progress_operations_events
  AFTER INSERT OR UPDATE ON public.operations_events
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_event();

DROP TRIGGER IF EXISTS refresh_daily_progress_crm_email_messages ON public.crm_email_messages;
CREATE TRIGGER refresh_daily_progress_crm_email_messages
  AFTER INSERT OR UPDATE ON public.crm_email_messages
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_email();

DROP TRIGGER IF EXISTS refresh_daily_progress_revenue_entries ON public.revenue_entries;
CREATE TRIGGER refresh_daily_progress_revenue_entries
  AFTER INSERT OR UPDATE ON public.revenue_entries
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_revenue();

DROP TRIGGER IF EXISTS refresh_daily_progress_jobs ON public.jobs;
CREATE TRIGGER refresh_daily_progress_jobs
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_job();

DROP TRIGGER IF EXISTS refresh_daily_progress_content_items ON public.content_items;
CREATE TRIGGER refresh_daily_progress_content_items
  AFTER INSERT OR UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.refresh_daily_progress_for_content();

COMMIT;
