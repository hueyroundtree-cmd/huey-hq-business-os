CREATE TABLE public.operations_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  title TEXT NOT NULL,
  detail TEXT,
  source TEXT NOT NULL DEFAULT 'Huey HQ',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operations_events TO authenticated;
GRANT ALL ON public.operations_events TO service_role;
ALTER TABLE public.operations_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own operations events"
  ON public.operations_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX operations_events_user_time_idx
  ON public.operations_events (user_id, occurred_at DESC);
CREATE INDEX operations_events_entity_idx
  ON public.operations_events (user_id, entity_type, entity_id);
