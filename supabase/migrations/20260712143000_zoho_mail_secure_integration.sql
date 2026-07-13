-- Zoho Mail secure CRM integration.
-- Additive only: preserves existing CRM, Daily Driver, dashboards and Notion sync.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS zoho_last_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zoho_last_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS zoho_last_message_id TEXT,
  ADD COLUMN IF NOT EXISTS zoho_last_subject TEXT;

CREATE TABLE IF NOT EXISTS public.zoho_mail_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_address TEXT NOT NULL,
  account_id TEXT,
  zoho_dc TEXT NOT NULL DEFAULT 'com',
  api_domain TEXT NOT NULL DEFAULT 'https://mail.zoho.com',
  accounts_domain TEXT NOT NULL DEFAULT 'https://accounts.zoho.com',
  refresh_token TEXT,
  access_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'Needs Setup',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT zoho_mail_connection_status_check CHECK (status IN ('Verified Live','Needs Setup','Error','Manual Only','Not Implemented'))
);

REVOKE ALL ON public.zoho_mail_connections FROM authenticated;
GRANT ALL ON public.zoho_mail_connections TO service_role;
ALTER TABLE public.zoho_mail_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'zoho_mail_connections'
      AND policyname = 'own zoho mail connection metadata'
  ) THEN
    CREATE POLICY "own zoho mail connection metadata"
      ON public.zoho_mail_connections
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS zoho_mail_connections_updated ON public.zoho_mail_connections;
CREATE TRIGGER zoho_mail_connections_updated
  BEFORE UPDATE ON public.zoho_mail_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'zoho',
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'draft_saved',
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  zoho_message_id TEXT,
  zoho_draft_id TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT crm_email_messages_direction_check CHECK (direction IN ('outbound','inbound')),
  CONSTRAINT crm_email_messages_status_check CHECK (status IN ('draft_saved','sent','reply_synced','error','manual_only'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_email_messages TO authenticated;
GRANT ALL ON public.crm_email_messages TO service_role;
ALTER TABLE public.crm_email_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'crm_email_messages'
      AND policyname = 'own crm email messages'
  ) THEN
    CREATE POLICY "own crm email messages"
      ON public.crm_email_messages
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS crm_email_messages_updated ON public.crm_email_messages;
CREATE TRIGGER crm_email_messages_updated
  BEFORE UPDATE ON public.crm_email_messages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX IF NOT EXISTS crm_email_messages_lead_time_idx
  ON public.crm_email_messages (user_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_email_messages_send_guard_idx
  ON public.crm_email_messages (user_id, lead_id, to_address, sent_at DESC)
  WHERE status = 'sent';

CREATE TABLE IF NOT EXISTS public.zoho_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state_token TEXT NOT NULL UNIQUE,
  zoho_dc TEXT NOT NULL DEFAULT 'com',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

REVOKE ALL ON public.zoho_oauth_states FROM authenticated;
GRANT ALL ON public.zoho_oauth_states TO service_role;
ALTER TABLE public.zoho_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS zoho_oauth_states_token_idx
  ON public.zoho_oauth_states (state_token, expires_at)
  WHERE used_at IS NULL;

CREATE OR REPLACE FUNCTION public.add_business_days(start_at TIMESTAMPTZ, business_days INTEGER)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  next_at TIMESTAMPTZ := start_at;
  added INTEGER := 0;
BEGIN
  WHILE added < business_days LOOP
    next_at := next_at + INTERVAL '1 day';
    IF EXTRACT(ISODOW FROM next_at) < 6 THEN
      added := added + 1;
    END IF;
  END LOOP;
  RETURN date_trunc('day', next_at) + INTERVAL '9 hours';
END;
$$;
