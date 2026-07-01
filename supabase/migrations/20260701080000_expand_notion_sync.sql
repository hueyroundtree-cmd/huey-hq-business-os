ALTER TABLE public.sync_mappings
  ADD COLUMN IF NOT EXISTS status public.integration_status NOT NULL DEFAULT 'Not Connected',
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.business_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  business TEXT,
  status TEXT NOT NULL DEFAULT 'Planning',
  priority TEXT,
  owner TEXT,
  next_action TEXT,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_projects TO authenticated;
GRANT ALL ON public.business_projects TO service_role;
ALTER TABLE public.business_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own business projects" ON public.business_projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER business_projects_updated
  BEFORE UPDATE ON public.business_projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX business_projects_user_status_idx ON public.business_projects (user_id, status);

CREATE TABLE IF NOT EXISTS public.ai_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  command TEXT NOT NULL,
  usage_notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_commands TO authenticated;
GRANT ALL ON public.ai_commands TO service_role;
ALTER TABLE public.ai_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai commands" ON public.ai_commands
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER ai_commands_updated
  BEFORE UPDATE ON public.ai_commands
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX ai_commands_user_active_idx ON public.ai_commands (user_id, active);
