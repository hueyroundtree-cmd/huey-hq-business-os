
-- Utility: updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profile auto-create on signup
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enums
CREATE TYPE public.lead_status AS ENUM ('New Lead','Contacted','Quote Sent','Booked','Completed','Review Requested','Lost','Follow-Up Needed');
CREATE TYPE public.income_stream AS ENUM ('Detailing','Logistics','Shopify','Stan Store','Gig Work','Content','Investing','Other');
CREATE TYPE public.content_stage AS ENUM ('Idea','Script','Record','Edit','Review','Scheduled','Posted','Repurpose');
CREATE TYPE public.integration_status AS ENUM ('Not Connected','Connected','Error');
CREATE TYPE public.automation_status AS ENUM ('Not Connected','Active','Paused','Error');

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business TEXT,
  phone TEXT,
  email TEXT,
  source TEXT,
  service_needed TEXT,
  status public.lead_status NOT NULL DEFAULT 'New Lead',
  quote_amount NUMERIC(12,2),
  deposit NUMERIC(12,2),
  booking_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own leads" ON public.leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX ON public.leads (user_id, status);
CREATE INDEX ON public.leads (user_id, next_follow_up_at);

-- Lead activities (timeline)
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lead activities" ON public.lead_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Revenue entries
CREATE TABLE public.revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  stream public.income_stream NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT,
  proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_entries TO authenticated;
GRANT ALL ON public.revenue_entries TO service_role;
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own revenue" ON public.revenue_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER rev_updated BEFORE UPDATE ON public.revenue_entries FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX ON public.revenue_entries (user_id, entry_date);

-- Bills
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO authenticated;
GRANT ALL ON public.bills TO service_role;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bills" ON public.bills FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER bills_updated BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs" ON public.jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tasks / priorities
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  is_top_priority BOOLEAN NOT NULL DEFAULT false,
  for_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  proof_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX ON public.tasks (user_id, for_date);

-- Daily check-ins
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  kind TEXT NOT NULL CHECK (kind IN ('morning','evening')),
  cash_on_hand NUMERIC(12,2),
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.daily_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.daily_checkins (user_id, check_date, kind);

-- Scripts (templates shared + user copies)
CREATE TABLE public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = global template
  is_template BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  placeholders TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripts TO authenticated;
GRANT ALL ON public.scripts TO service_role;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or template scripts" ON public.scripts FOR SELECT
  USING (user_id = auth.uid() OR (is_template = true AND user_id IS NULL));
CREATE POLICY "insert own scripts" ON public.scripts FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_template = false);
CREATE POLICY "update own scripts" ON public.scripts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own scripts" ON public.scripts FOR DELETE
  USING (auth.uid() = user_id);
CREATE TRIGGER scripts_updated BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Content items
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stage public.content_stage NOT NULL DEFAULT 'Idea',
  hook TEXT,
  script TEXT,
  thumbnail_url TEXT,
  posted_url TEXT,
  scheduled_for TIMESTAMPTZ,
  analytics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT ALL ON public.content_items TO service_role;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own content" ON public.content_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER content_updated BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Automations
CREATE TABLE public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  owner TEXT,
  trigger TEXT,
  platform TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  status public.automation_status NOT NULL DEFAULT 'Not Connected',
  proof TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own automations" ON public.automations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER autos_updated BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Integrations
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status public.integration_status NOT NULL DEFAULT 'Not Connected',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own integrations" ON public.integrations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER integ_updated BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sync mappings
CREATE TABLE public.sync_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, entity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_mappings TO authenticated;
GRANT ALL ON public.sync_mappings TO service_role;
ALTER TABLE public.sync_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mappings" ON public.sync_mappings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER map_updated BEFORE UPDATE ON public.sync_mappings FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Sync audit logs
CREATE TABLE public.sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  entity TEXT,
  outcome TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_audit TO authenticated;
GRANT ALL ON public.sync_audit TO service_role;
ALTER TABLE public.sync_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own audit" ON public.sync_audit FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ON public.sync_audit (user_id, created_at DESC);

-- Knowledge docs
CREATE TABLE public.knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_docs TO authenticated;
GRANT ALL ON public.knowledge_docs TO service_role;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own knowledge" ON public.knowledge_docs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER know_updated BEFORE UPDATE ON public.knowledge_docs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed Great Freight Detailing script templates (global, no owner)
INSERT INTO public.scripts (user_id, is_template, category, title, body, placeholders) VALUES
(NULL, true, 'Dealership Outreach', 'Dealership Cold Outreach',
 'Hi {{contact_name}}, this is {{sender_name}} with Great Freight Detailing. We help dealerships like {{business_name}} keep inventory looking showroom-ready. Do you have 5 minutes this week to talk about a recon partnership? — {{sender_name}}',
 ARRAY['contact_name','sender_name','business_name']),
(NULL, true, 'Fleet Outreach', 'Fleet Detailing Pitch',
 'Hi {{contact_name}}, I run Great Freight Detailing. We specialize in fleet washes and interior details on-site so your vehicles stay in service. Would a quick quote for {{business_name}}''s fleet be useful?',
 ARRAY['contact_name','business_name']),
(NULL, true, 'Individual Seller DM', 'Marketplace Seller DM',
 'Hey {{customer_name}}, saw your {{vehicle}} listed. A quick full detail usually adds resale value. I can do it at your place for {{price}} — want me to swing by?',
 ARRAY['customer_name','vehicle','price']),
(NULL, true, 'Booking Confirmation', 'Booking Confirmation',
 'Hi {{customer_name}}, confirming your {{service}} on {{date}} at {{time}} for your {{vehicle}}. Total: {{price}}. Booking details: {{booking_link}}. Reply CONFIRM to lock it in.',
 ARRAY['customer_name','service','date','time','vehicle','price','booking_link']),
(NULL, true, 'Follow-Up', 'Quote Follow-Up',
 'Hey {{customer_name}}, just following up on the {{service}} quote for your {{vehicle}}. Want me to hold {{date}} for you?',
 ARRAY['customer_name','service','vehicle','date']),
(NULL, true, 'Review Request', 'Post-Service Review Request',
 'Thanks for choosing Great Freight, {{customer_name}}! If the {{service}} on your {{vehicle}} met the bar, a quick Google review would mean a lot: {{booking_link}}',
 ARRAY['customer_name','service','vehicle','booking_link']),
(NULL, true, 'Referral Pitch', 'Referral Ask',
 'Appreciate you, {{customer_name}}. If you know anyone else who needs a {{service}}, send them my way — I''ll take $20 off your next detail as a thank-you.',
 ARRAY['customer_name','service']);
