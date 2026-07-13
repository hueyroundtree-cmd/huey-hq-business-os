import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRIMARY_SENDER = "huey.roundtree@gfldetail.com";
const DEFAULT_ZOHO_DC = "com";
const ZOHO_SCOPES = ["ZohoMail.accounts.READ", "ZohoMail.messages.CREATE"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (name: string) => Deno.env.get(name) ?? "";

const appOrigin = () => getEnv("APP_ORIGIN") || "https://hueyroundtree-cmd.github.io";
const appBasePath = () => getEnv("APP_BASE_PATH") || "/huey-hq-business-os";
const redirectUri = () =>
  getEnv("ZOHO_REDIRECT_URI") ||
  `${getEnv("SUPABASE_URL")}/functions/v1/zoho-mail?action=callback`;

const accountsDomainForDc = (dc = DEFAULT_ZOHO_DC) => {
  const clean = dc.replace(/^\./, "");
  return clean === "com" ? "https://accounts.zoho.com" : `https://accounts.zoho.${clean}`;
};

const mailDomainForDc = (dc = DEFAULT_ZOHO_DC) => {
  const clean = dc.replace(/^\./, "");
  return clean === "com" ? "https://mail.zoho.com" : `https://mail.zoho.${clean}`;
};

const sanitizeConnection = (row: Record<string, any> | null) => ({
  status: row?.status ?? "Needs Setup",
  connectedAddress: row?.email_address ?? null,
  accountId: row?.account_id ?? null,
  lastSync: row?.last_sync_at ?? null,
  lastError: row?.last_error ?? null,
  connectedAt: row?.connected_at ?? null,
  disconnectedAt: row?.disconnected_at ?? null,
  sender: PRIMARY_SENDER,
  scopes: ZOHO_SCOPES,
});

const requireUser = async (supabaseUrl: string, anonKey: string, authHeader: string | null) => {
  if (!authHeader) throw new Error("Missing Authorization header.");
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) throw new Error("Sign in again before using Zoho Mail.");
  return data.user;
};

const exchangeToken = async (
  accountsDomain: string,
  params: Record<string, string>,
) => {
  const body = new URLSearchParams({
    client_id: getEnv("ZOHO_CLIENT_ID"),
    client_secret: getEnv("ZOHO_CLIENT_SECRET"),
    ...params,
  });
  const response = await fetch(`${accountsDomain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error_description || payload.error || "Zoho token exchange failed.");
  return payload;
};

const zohoRequest = async (
  connection: Record<string, any>,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${connection.api_domain}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Zoho-oauthtoken ${connection.access_token}`,
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.status?.code >= 400) {
    throw new Error(payload.status?.description || payload.message || `Zoho API failed with status ${response.status}`);
  }
  return payload;
};

const ensureAccessToken = async (admin: any, connection: Record<string, any>) => {
  const expiresAt = connection.access_token_expires_at ? new Date(connection.access_token_expires_at).getTime() : 0;
  if (connection.access_token && expiresAt > Date.now() + 120_000) return connection;
  if (!connection.refresh_token) throw new Error("Zoho refresh token is missing. Reconnect Zoho Mail.");
  const refreshed = await exchangeToken(connection.accounts_domain, {
    refresh_token: connection.refresh_token,
    grant_type: "refresh_token",
  });
  const nextConnection = {
    ...connection,
    access_token: refreshed.access_token,
    access_token_expires_at: new Date(Date.now() + Number(refreshed.expires_in ?? 3600) * 1000).toISOString(),
    status: "Verified Live",
    last_error: null,
  };
  await admin.from("zoho_mail_connections").update({
    access_token: nextConnection.access_token,
    access_token_expires_at: nextConnection.access_token_expires_at,
    status: nextConnection.status,
    last_error: null,
    last_sync_at: new Date().toISOString(),
  }).eq("id", connection.id);
  return nextConnection;
};

const findSenderAccount = async (connection: Record<string, any>) => {
  const accounts = await zohoRequest(connection, "/api/accounts");
  const rows = Array.isArray(accounts.data) ? accounts.data : [];
  const account = rows.find((row: any) =>
    row.primaryEmailAddress === PRIMARY_SENDER ||
    row.mailboxAddress === PRIMARY_SENDER ||
    row.incomingUserName === PRIMARY_SENDER ||
    row.emailAddress?.some?.((email: any) => email.mailId === PRIMARY_SENDER) ||
    row.sendMailDetails?.some?.((detail: any) => detail.fromAddress === PRIMARY_SENDER),
  );
  if (!account?.accountId) throw new Error(`Connected Zoho account must include ${PRIMARY_SENDER}.`);
  return account.accountId;
};

const loadConnection = async (admin: any, userId: string) => {
  const { data, error } = await admin.from("zoho_mail_connections").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

const emailPayload = (body: Record<string, any>) => {
  const fromAddress = String(body.fromAddress ?? PRIMARY_SENDER).trim().toLowerCase();
  if (fromAddress !== PRIMARY_SENDER) throw new Error(`Send-from address must be ${PRIMARY_SENDER}.`);
  const toAddress = String(body.toAddress ?? "").trim();
  if (!toAddress || !toAddress.includes("@")) throw new Error("Recipient email is required.");
  const subject = String(body.subject ?? "").trim();
  if (!subject) throw new Error("Subject is required.");
  const content = String(body.body ?? "").trim();
  if (!content) throw new Error("Email body is required.");
  return {
    fromAddress: PRIMARY_SENDER,
    toAddress,
    subject,
    content,
    mailFormat: "plaintext",
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || (req.method === "GET" ? "status" : "");

  try {
    if (!getEnv("ZOHO_CLIENT_ID") || !getEnv("ZOHO_CLIENT_SECRET")) {
      if (action === "callback") throw new Error("Zoho OAuth secrets are not configured in Supabase.");
    }

    if (action === "callback") {
      const code = url.searchParams.get("code");
      const stateToken = url.searchParams.get("state");
      if (!code || !stateToken) throw new Error("Zoho callback is missing code/state.");
      const { data: state, error: stateError } = await admin.from("zoho_oauth_states")
        .select("*")
        .eq("state_token", stateToken)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (stateError || !state) throw new Error("Zoho OAuth state expired or invalid. Please reconnect.");
      const userId = String(state.user_id);
      const dc = String(state.zoho_dc ?? DEFAULT_ZOHO_DC);
      const accountsDomain = accountsDomainForDc(dc);
      const apiDomain = mailDomainForDc(dc);
      const token = await exchangeToken(accountsDomain, {
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri(),
      });
      const tempConnection = {
        access_token: token.access_token,
        access_token_expires_at: new Date(Date.now() + Number(token.expires_in ?? 3600) * 1000).toISOString(),
        api_domain: apiDomain,
        accounts_domain: accountsDomain,
      };
      const accountId = await findSenderAccount(tempConnection);
      await admin.from("zoho_mail_connections").upsert({
        user_id: userId,
        email_address: PRIMARY_SENDER,
        account_id: accountId,
        zoho_dc: dc,
        api_domain: apiDomain,
        accounts_domain: accountsDomain,
        refresh_token: token.refresh_token,
        access_token: token.access_token,
        access_token_expires_at: tempConnection.access_token_expires_at,
        scopes: ZOHO_SCOPES,
        status: "Verified Live",
        last_error: null,
        last_sync_at: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        disconnected_at: null,
      }, { onConflict: "user_id" });
      await admin.from("zoho_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", state.id);
      return Response.redirect(`${appOrigin()}${appBasePath()}/#/settings?zoho=connected`, 302);
    }

    const user = await requireUser(supabaseUrl, anonKey, req.headers.get("Authorization"));
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const bodyAction = String(body.action ?? action);

    if (bodyAction === "authorize-url") {
      const dc = String(body.dc ?? DEFAULT_ZOHO_DC);
      const state = crypto.randomUUID();
      const { error: stateError } = await admin.from("zoho_oauth_states").insert({
        user_id: user.id,
        state_token: state,
        zoho_dc: dc,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (stateError) throw new Error(stateError.message);
      const authUrl = new URL(`${accountsDomainForDc(dc)}/oauth/v2/auth`);
      authUrl.searchParams.set("scope", ZOHO_SCOPES.join(","));
      authUrl.searchParams.set("client_id", getEnv("ZOHO_CLIENT_ID"));
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("redirect_uri", redirectUri());
      authUrl.searchParams.set("state", state);
      return json({ url: authUrl.toString(), redirectUri: redirectUri(), scopes: ZOHO_SCOPES, sender: PRIMARY_SENDER });
    }

    if (bodyAction === "status") {
      return json(sanitizeConnection(await loadConnection(admin, user.id)));
    }

    if (bodyAction === "disconnect") {
      const connection = await loadConnection(admin, user.id);
      if (connection?.refresh_token) {
        await fetch(`${connection.accounts_domain}/oauth/v2/token/revoke?token=${encodeURIComponent(connection.refresh_token)}`, { method: "POST" }).catch(() => null);
      }
      await admin.from("zoho_mail_connections").upsert({
        user_id: user.id,
        email_address: PRIMARY_SENDER,
        status: "Needs Setup",
        refresh_token: null,
        access_token: null,
        access_token_expires_at: null,
        last_error: null,
        disconnected_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      return json({ ok: true, status: "Needs Setup" });
    }

    const connection = await loadConnection(admin, user.id);
    if (!connection || connection.status !== "Verified Live") throw new Error("Connect Zoho Mail before sending or saving drafts.");
    const active = await ensureAccessToken(admin, connection);

    if (bodyAction === "save-draft" || bodyAction === "send-email") {
      const payload = emailPayload(body);
      const leadId = body.leadId ? String(body.leadId) : null;
      const duplicate = leadId ? await admin.from("crm_email_messages")
        .select("id,sent_at,subject")
        .eq("user_id", user.id)
        .eq("lead_id", leadId)
        .eq("to_address", payload.toAddress)
        .eq("status", "sent")
        .gte("sent_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle() : { data: null };

      if (bodyAction === "send-email" && duplicate.data && !body.confirmDuplicate) {
        return json({ duplicateWarning: true, message: "This lead already has a sent email in the last 14 days. Confirm before sending again.", lastSent: duplicate.data }, 409);
      }

      const zohoBody: Record<string, unknown> = { ...payload };
      if (bodyAction === "save-draft") zohoBody.mode = "draft";
      const result = await zohoRequest(active, `/api/accounts/${active.account_id}/messages`, {
        method: "POST",
        body: JSON.stringify(zohoBody),
      });

      const messageId = String(result.data?.messageId ?? result.data?.messageID ?? result.data?.id ?? result.messageId ?? "");
      const now = new Date();
      const followUpAt = bodyAction === "send-email"
        ? new Date((await admin.rpc("add_business_days", { start_at: now.toISOString(), business_days: 3 })).data).toISOString()
        : null;

      const { data: emailRow, error: emailError } = await admin.from("crm_email_messages").insert({
        user_id: user.id,
        lead_id: leadId,
        provider: "zoho",
        direction: "outbound",
        status: bodyAction === "send-email" ? "sent" : "draft_saved",
        from_address: PRIMARY_SENDER,
        to_address: payload.toAddress,
        subject: payload.subject,
        body: payload.content,
        zoho_message_id: bodyAction === "send-email" ? messageId || null : null,
        zoho_draft_id: bodyAction === "save-draft" ? messageId || null : null,
        provider_payload: result,
        sent_at: bodyAction === "send-email" ? now.toISOString() : null,
        follow_up_at: followUpAt,
      }).select("*").single();
      if (emailError) throw new Error(emailError.message);

      if (leadId && bodyAction === "send-email") {
        await Promise.all([
          admin.from("leads").update({
            status: "Contacted",
            last_contact_at: now.toISOString(),
            contact_date: now.toISOString(),
            contact_method: "Email",
            contacted_by: "Huey",
            zoho_email_sent: true,
            email_sent_at: now.toISOString(),
            zoho_last_sent_at: now.toISOString(),
            zoho_last_message_id: messageId || null,
            zoho_last_subject: payload.subject,
            next_follow_up_at: followUpAt,
            outreach_status: "Email Sent",
          }).eq("id", leadId).eq("user_id", user.id),
          admin.from("lead_activities").insert({
            user_id: user.id,
            lead_id: leadId,
            kind: "Zoho email sent",
            detail: `Sent from ${PRIMARY_SENDER} to ${payload.toAddress}: ${payload.subject}`,
            created_at: now.toISOString(),
          }),
          admin.from("operations_events").insert({
            user_id: user.id,
            event_type: "zoho_email_sent",
            entity_type: "lead",
            entity_id: leadId,
            title: "Zoho email sent",
            detail: `Sent ${payload.subject} to ${payload.toAddress}. Follow-up scheduled in three business days.`,
            source: "Zoho Mail",
            metadata: { zoho_message_id: messageId || null, email_message_id: emailRow.id },
            occurred_at: now.toISOString(),
          }),
        ]);
      }

      return json({ ok: true, action: bodyAction, email: emailRow, zohoMessageId: messageId || null });
    }

    if (bodyAction === "sync-reply-manual") {
      const leadId = String(body.leadId ?? "");
      if (!leadId) throw new Error("Lead ID is required.");
      const repliedAt = body.repliedAt ? new Date(body.repliedAt).toISOString() : new Date().toISOString();
      await Promise.all([
        admin.from("leads").update({
          zoho_last_reply_at: repliedAt,
          outreach_status: "Replied",
          next_action: "Review reply and book appointment",
        }).eq("id", leadId).eq("user_id", user.id),
        admin.from("crm_email_messages").insert({
          user_id: user.id,
          lead_id: leadId,
          provider: "zoho",
          direction: "inbound",
          status: "reply_synced",
          from_address: String(body.fromAddress ?? ""),
          to_address: PRIMARY_SENDER,
          subject: String(body.subject ?? "Manual reply logged"),
          body: String(body.body ?? "Reply manually synced from Zoho Mail."),
          replied_at: repliedAt,
        }),
      ]);
      return json({ ok: true, repliedAt });
    }

    return json({ error: "Unknown Zoho Mail action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 400);
  }
});
