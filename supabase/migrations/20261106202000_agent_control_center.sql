-- Agent Control Center: user-owned planning and approval queue.
-- No external actions are executed by this table or its policies.
CREATE TABLE public.agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 500),
  source text NOT NULL DEFAULT 'manual',
  department text NOT NULL CHECK (department IN ('executive','revenue','marketing','finance','operations','technology','administration')),
  assigned_agent_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('research','draft','organize','internal_update','client_contact','publish','spend','transfer','trade','external_commitment','change_settings','delete')),
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('inbox','assigned','working','awaiting_approval','verified_complete','blocked')),
  approved_by_owner boolean NOT NULL DEFAULT false,
  evidence_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_tasks_verified_evidence CHECK (status <> 'verified_complete' OR nullif(trim(evidence_url), '') IS NOT NULL),
  CONSTRAINT agent_tasks_approval_gate CHECK (
    action NOT IN ('client_contact','publish','spend','transfer','trade','external_commitment','change_settings','delete')
    OR approved_by_owner
    OR status IN ('inbox','assigned','awaiting_approval','blocked')
  )
);
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_tasks TO authenticated;
GRANT ALL ON public.agent_tasks TO service_role;
CREATE POLICY "own agent tasks" ON public.agent_tasks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER agent_tasks_updated BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX agent_tasks_user_created_idx ON public.agent_tasks (user_id, created_at DESC);
