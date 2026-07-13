BEGIN;

-- Daily Progress and Performance History.
-- Additive only: preserves revenue_entries, leads, crm_activity, Zoho Mail,
-- Daily Driver, Notion sync, CRM and production features.

CREATE TABLE IF NOT EXISTS public.daily_performance_score_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  income_activity_points INTEGER NOT NULL DEFAULT 25 CHECK (income_activity_points >= 0),
  outreach_points INTEGER NOT NULL DEFAULT 25 CHECK (outreach_points >= 0),
  follow_up_points INTEGER NOT NULL DEFAULT 20 CHECK (follow_up_points >= 0),
  booking_points INTEGER NOT NULL DEFAULT 20 CHECK (booking_points >= 0),
  planning_points INTEGER NOT NULL DEFAULT 10 CHECK (planning_points >= 0),
  income_target_amount NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (income_target_amount >= 0),
  outreach_target INTEGER NOT NULL DEFAULT 20 CHECK (outreach_target >= 0),
  follow_up_target INTEGER NOT NULL DEFAULT 5 CHECK (follow_up_target >= 0),
  booking_target INTEGER NOT NULL DEFAULT 1 CHECK (booking_target >= 0),
  weekly_income_goal NUMERIC(12,2) NOT NULL DEFAULT 1000 CHECK (weekly_income_goal >= 0),
  monthly_income_goal NUMERIC(12,2) NOT NULL DEFAULT 4000 CHECK (monthly_income_goal >= 0),
  minimum_score_for_streak INTEGER NOT NULL DEFAULT 70 CHECK (minimum_score_for_streak BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_performance_score_settings TO authenticated;
GRANT ALL ON public.daily_performance_score_settings TO service_role;
ALTER TABLE public.daily_performance_score_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_performance_score_settings'
      AND policyname = 'own daily performance score settings'
  ) THEN
    CREATE POLICY "own daily performance score settings"
      ON public.daily_performance_score_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS daily_performance_score_settings_updated ON public.daily_performance_score_settings;
CREATE TRIGGER daily_performance_score_settings_updated
  BEFORE UPDATE ON public.daily_performance_score_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.daily_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_date DATE NOT NULL,
  total_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  detailing_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_income NUMERIC(12,2) NOT NULL DEFAULT 0,
  leads_added INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  texts_sent INTEGER NOT NULL DEFAULT 0,
  calls_completed INTEGER NOT NULL DEFAULT 0,
  contact_forms_submitted INTEGER NOT NULL DEFAULT 0,
  follow_ups_completed INTEGER NOT NULL DEFAULT 0,
  replies_received INTEGER NOT NULL DEFAULT 0,
  quotes_sent INTEGER NOT NULL DEFAULT 0,
  jobs_booked INTEGER NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  reviews_requested INTEGER NOT NULL DEFAULT 0,
  content_posted INTEGER NOT NULL DEFAULT 0,
  planning_completed BOOLEAN NOT NULL DEFAULT false,
  end_of_day_review_completed BOOLEAN NOT NULL DEFAULT false,
  daily_score INTEGER NOT NULL DEFAULT 0 CHECK (daily_score BETWEEN 0 AND 100),
  goal_completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (goal_completion_percentage BETWEEN 0 AND 100),
  notes TEXT,
  wins TEXT,
  problems TEXT,
  tomorrow_first_actions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  source_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  manual_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_performance_snapshots_user_date_unique UNIQUE (user_id, business_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_performance_snapshots TO authenticated;
GRANT ALL ON public.daily_performance_snapshots TO service_role;
ALTER TABLE public.daily_performance_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_performance_snapshots'
      AND policyname = 'own daily performance snapshots'
  ) THEN
    CREATE POLICY "own daily performance snapshots"
      ON public.daily_performance_snapshots
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS daily_performance_snapshots_updated ON public.daily_performance_snapshots;
CREATE TRIGGER daily_performance_snapshots_updated
  BEFORE UPDATE ON public.daily_performance_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS daily_performance_snapshots_user_date_idx
  ON public.daily_performance_snapshots (user_id, business_date DESC);

CREATE TABLE IF NOT EXISTS public.daily_performance_manual_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.daily_performance_snapshots(id) ON DELETE SET NULL,
  business_date DATE NOT NULL,
  field_name TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.daily_performance_manual_corrections TO authenticated;
GRANT ALL ON public.daily_performance_manual_corrections TO service_role;
ALTER TABLE public.daily_performance_manual_corrections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'daily_performance_manual_corrections'
      AND policyname = 'own daily performance manual corrections'
  ) THEN
    CREATE POLICY "own daily performance manual corrections"
      ON public.daily_performance_manual_corrections
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_performance_corrections_user_date_idx
  ON public.daily_performance_manual_corrections (user_id, business_date DESC, created_at DESC);

COMMIT;
