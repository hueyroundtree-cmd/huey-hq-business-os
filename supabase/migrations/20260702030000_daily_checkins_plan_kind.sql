ALTER TABLE public.daily_checkins
  DROP CONSTRAINT IF EXISTS daily_checkins_kind_check;

ALTER TABLE public.daily_checkins
  ADD CONSTRAINT daily_checkins_kind_check
  CHECK (kind IN ('morning', 'evening', 'plan'));
