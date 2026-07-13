BEGIN;

-- Daily Progress and Performance History.
-- Existing table name is intentionally preserved: daily_performance_snapshots.
-- This is a derived snapshot/cache only. Source-of-truth remains:
-- leads, lead_activities, operations_events, crm_email_messages, jobs,
-- revenue_entries, and content_items.

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
  progress_date DATE NOT NULL,
  business_unit TEXT NOT NULL DEFAULT 'Great Freight Mobile Detailing',
  new_leads INTEGER NOT NULL DEFAULT 0,
  leads_contacted INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  texts_sent INTEGER NOT NULL DEFAULT 0,
  calls_made INTEGER NOT NULL DEFAULT 0,
  replies_received INTEGER NOT NULL DEFAULT 0,
  estimates_sent INTEGER NOT NULL DEFAULT 0,
  bookings_created INTEGER NOT NULL DEFAULT 0,
  appointments_completed INTEGER NOT NULL DEFAULT 0,
  deposits_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  revenue_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  reviews_requested INTEGER NOT NULL DEFAULT 0,
  reviews_received INTEGER NOT NULL DEFAULT 0,
  followups_completed INTEGER NOT NULL DEFAULT 0,
  content_posts INTEGER NOT NULL DEFAULT 0,
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
  incomplete_historical_data BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_performance_snapshots_user_unit_date_unique UNIQUE (user_id, business_unit, progress_date)
);

-- Align earlier branch versions of this same table to the approved model.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_performance_snapshots'
      AND column_name = 'business_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_performance_snapshots'
      AND column_name = 'progress_date'
  ) THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN business_date TO progress_date;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'total_income')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'revenue_collected') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN total_income TO revenue_collected;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'leads_added')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'new_leads') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN leads_added TO new_leads;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'calls_completed')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'calls_made') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN calls_completed TO calls_made;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'quotes_sent')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'estimates_sent') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN quotes_sent TO estimates_sent;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'jobs_booked')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'bookings_created') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN jobs_booked TO bookings_created;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'jobs_completed')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'appointments_completed') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN jobs_completed TO appointments_completed;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'follow_ups_completed')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'followups_completed') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN follow_ups_completed TO followups_completed;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'content_posted')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_performance_snapshots' AND column_name = 'content_posts') THEN
    ALTER TABLE public.daily_performance_snapshots RENAME COLUMN content_posted TO content_posts;
  END IF;
END $$;

ALTER TABLE public.daily_performance_snapshots
  ADD COLUMN IF NOT EXISTS progress_date DATE,
  ADD COLUMN IF NOT EXISTS business_unit TEXT NOT NULL DEFAULT 'Great Freight Mobile Detailing',
  ADD COLUMN IF NOT EXISTS new_leads INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_contacted INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS emails_sent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS texts_sent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calls_made INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_received INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimates_sent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookings_created INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS appointments_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposits_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_collected NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_requested INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_received INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followups_completed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_posts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planning_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS end_of_day_review_completed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goal_completion_percentage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS wins TEXT,
  ADD COLUMN IF NOT EXISTS problems TEXT,
  ADD COLUMN IF NOT EXISTS tomorrow_first_actions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS source_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manual_adjustments JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS incomplete_historical_data BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.daily_performance_snapshots
SET progress_date = COALESCE(progress_date, created_at::date)
WHERE progress_date IS NULL;

ALTER TABLE public.daily_performance_snapshots
  ALTER COLUMN progress_date SET NOT NULL,
  ALTER COLUMN business_unit SET NOT NULL;

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

ALTER TABLE public.daily_performance_snapshots
  DROP CONSTRAINT IF EXISTS daily_performance_snapshots_user_date_unique;

ALTER TABLE public.daily_performance_snapshots
  DROP CONSTRAINT IF EXISTS daily_performance_snapshots_user_unit_date_unique;

ALTER TABLE public.daily_performance_snapshots
  ADD CONSTRAINT daily_performance_snapshots_user_unit_date_unique
  UNIQUE (user_id, business_unit, progress_date);

DROP TRIGGER IF EXISTS daily_performance_snapshots_updated ON public.daily_performance_snapshots;
CREATE TRIGGER daily_performance_snapshots_updated
  BEFORE UPDATE ON public.daily_performance_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP INDEX IF EXISTS public.daily_performance_snapshots_user_date_idx;
CREATE INDEX IF NOT EXISTS daily_performance_snapshots_user_unit_date_idx
  ON public.daily_performance_snapshots (user_id, business_unit, progress_date DESC);

CREATE TABLE IF NOT EXISTS public.daily_performance_manual_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_id UUID REFERENCES public.daily_performance_snapshots(id) ON DELETE SET NULL,
  progress_date DATE NOT NULL,
  business_unit TEXT NOT NULL DEFAULT 'Great Freight Mobile Detailing',
  field_name TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_performance_manual_corrections'
      AND column_name = 'business_date'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_performance_manual_corrections'
      AND column_name = 'progress_date'
  ) THEN
    ALTER TABLE public.daily_performance_manual_corrections RENAME COLUMN business_date TO progress_date;
  END IF;
END $$;

ALTER TABLE public.daily_performance_manual_corrections
  ADD COLUMN IF NOT EXISTS progress_date DATE,
  ADD COLUMN IF NOT EXISTS business_unit TEXT NOT NULL DEFAULT 'Great Freight Mobile Detailing';

UPDATE public.daily_performance_manual_corrections
SET progress_date = COALESCE(progress_date, created_at::date)
WHERE progress_date IS NULL;

ALTER TABLE public.daily_performance_manual_corrections
  ALTER COLUMN progress_date SET NOT NULL,
  ALTER COLUMN business_unit SET NOT NULL;

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

DROP INDEX IF EXISTS public.daily_performance_corrections_user_date_idx;
CREATE INDEX IF NOT EXISTS daily_performance_corrections_user_unit_date_idx
  ON public.daily_performance_manual_corrections (user_id, business_unit, progress_date DESC, created_at DESC);

COMMIT;
