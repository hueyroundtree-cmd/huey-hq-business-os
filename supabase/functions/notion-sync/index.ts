import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const notionRequest = async (token: string, path: string, init: RequestInit = {}) => {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2026-03-11",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Notion request failed with status ${response.status}`);
  return payload;
};

const richText = (value: unknown) => [
  { type: "text", text: { content: String(value ?? "").slice(0, 2000) } },
];

type SourceField = {
  source: string;
  notion: string;
  kind?: "text" | "number" | "date" | "url" | "email" | "phone" | "boolean" | "select" | "multi_select" | "json";
  value?: (row: Record<string, any>) => unknown;
};

type EntityDefinition = {
  table: string;
  select: string;
  orderBy?: string;
  titleSource: string;
  title: (row: Record<string, any>) => string;
  fields: SourceField[];
  filter?: { column: string; value: string };
};

const DEFINITIONS: Record<string, EntityDefinition> = {
  tasks: {
    table: "tasks",
    select: "id,title,done,is_top_priority,for_date,proof_note,updated_at",
    titleSource: "title",
    title: (row) => row.title,
    fields: [
      { source: "done", notion: "Status", kind: "select", value: (row) => row.done ? "Done" : "To Do" },
      { source: "for_date", notion: "Due Date", kind: "date" },
      { source: "proof_note", notion: "Proof", kind: "text" },
      { source: "is_top_priority", notion: "Top Priority", kind: "boolean" },
    ],
  },
  leads: {
    table: "leads",
    select: "id,name,business,phone,email,source,lead_type,service_needed,status,estimated_value,deposit,booking_at,last_contact_at,next_follow_up_at,notes,updated_at",
    titleSource: "name",
    title: (row) => row.name,
    fields: [
      { source: "business", notion: "Business" },
      { source: "phone", notion: "Phone", kind: "phone" },
      { source: "email", notion: "Email", kind: "email" },
      { source: "source", notion: "Source", kind: "select" },
      { source: "lead_type", notion: "Lead Type", kind: "select" },
      { source: "service_needed", notion: "Service Needed" },
      { source: "status", notion: "Status", kind: "select" },
      { source: "estimated_value", notion: "Quote Amount", kind: "number" },
      { source: "deposit", notion: "Deposit", kind: "number" },
      { source: "booking_at", notion: "Booking Date", kind: "date" },
      { source: "last_contact_at", notion: "Last Contact", kind: "date" },
      { source: "next_follow_up_at", notion: "Next Follow-Up", kind: "date" },
      { source: "notes", notion: "Notes" },
    ],
  },
  content_items: {
    table: "content_items",
    select: "id,title,stage,hook,script,thumbnail_url,posted_url,scheduled_for,analytics_json,notes,updated_at",
    titleSource: "title",
    title: (row) => row.title,
    fields: [
      { source: "stage", notion: "Stage", kind: "select" },
      { source: "hook", notion: "Hook" },
      { source: "script", notion: "Script" },
      { source: "thumbnail_url", notion: "Thumbnail", kind: "url" },
      { source: "posted_url", notion: "Posted URL", kind: "url" },
      { source: "scheduled_for", notion: "Scheduled For", kind: "date" },
      { source: "analytics_json", notion: "Analytics", kind: "json" },
      { source: "notes", notion: "Notes" },
    ],
  },
  business_projects: {
    table: "business_projects",
    select: "id,title,business,status,priority,owner,next_action,due_date,notes,updated_at",
    titleSource: "title",
    title: (row) => row.title,
    fields: [
      { source: "business", notion: "Business", kind: "select" },
      { source: "status", notion: "Status", kind: "select" },
      { source: "priority", notion: "Priority", kind: "select" },
      { source: "owner", notion: "Owner" },
      { source: "next_action", notion: "Next Action" },
      { source: "due_date", notion: "Due Date", kind: "date" },
      { source: "notes", notion: "Notes" },
    ],
  },
  sops: {
    table: "knowledge_docs",
    select: "id,title,category,content_md,updated_at",
    titleSource: "title",
    title: (row) => row.title,
    filter: { column: "category", value: "SOPs" },
    fields: [
      { source: "category", notion: "Category", kind: "select" },
      { source: "content_md", notion: "Content" },
    ],
  },
  revenue_entries: {
    table: "revenue_entries",
    select: "id,entry_date,stream,amount,payment_method,proof_url,notes,updated_at",
    titleSource: "entry",
    title: (row) => `${row.stream} - ${row.entry_date} - $${Number(row.amount).toFixed(2)}`,
    fields: [
      { source: "entry_date", notion: "Date", kind: "date" },
      { source: "stream", notion: "Source", kind: "select" },
      { source: "amount", notion: "Amount", kind: "number" },
      { source: "payment_method", notion: "Payment Method", kind: "select" },
      { source: "proof_url", notion: "Proof", kind: "url" },
      { source: "notes", notion: "Notes" },
    ],
  },
  scripts: {
    table: "scripts",
    select: "id,category,title,body,placeholders,updated_at",
    titleSource: "title",
    title: (row) => row.title,
    fields: [
      { source: "category", notion: "Category", kind: "select" },
      { source: "body", notion: "Script" },
      { source: "placeholders", notion: "Placeholders", kind: "multi_select" },
    ],
  },
  daily_checkins: {
    table: "daily_checkins",
    select: "id,check_date,kind,cash_on_hand,summary_json,notes,created_at",
    orderBy: "created_at",
    titleSource: "check_in",
    title: (row) => `${row.kind === "morning" ? "Start My Day" : row.kind === "plan" ? "Daily Plan" : "End My Day"} - ${row.check_date}`,
    fields: [
      { source: "check_date", notion: "Date", kind: "date" },
      { source: "kind", notion: "Check-In", kind: "select" },
      { source: "cash_on_hand", notion: "Cash Available", kind: "number" },
      { source: "summary_json", notion: "Summary", kind: "json" },
      { source: "notes", notion: "Notes" },
    ],
  },
  ai_commands: {
    table: "ai_commands",
    select: "id,title,department,command,usage_notes,active,updated_at",
    titleSource: "title",
    title: (row) => row.title,
    fields: [
      { source: "department", notion: "Department", kind: "select" },
      { source: "command", notion: "Command" },
      { source: "usage_notes", notion: "Usage Notes" },
      { source: "active", notion: "Active", kind: "boolean" },
    ],
  },
  automations: {
    table: "automations",
    select: "id,agent_name,owner,trigger,platform,last_run_at,next_run_at,status,proof,updated_at",
    titleSource: "agent_name",
    title: (row) => row.agent_name,
    fields: [
      { source: "owner", notion: "Owner" },
      { source: "trigger", notion: "Trigger" },
      { source: "platform", notion: "Platform", kind: "select" },
      { source: "last_run_at", notion: "Last Run", kind: "date" },
      { source: "next_run_at", notion: "Next Run", kind: "date" },
      { source: "status", notion: "Status", kind: "select" },
      { source: "proof", notion: "Proof" },
    ],
  },
};

const propertyValue = (property: any, value: unknown, kind = "text") => {
  if (value === null || value === undefined || value === "") return undefined;
  switch (property?.type) {
    case "rich_text":
      return { rich_text: richText(kind === "json" ? JSON.stringify(value) : value) };
    case "number":
      return { number: Number(value) };
    case "date":
      return { date: { start: String(value) } };
    case "url":
      return { url: String(value) };
    case "email":
      return { email: String(value) };
    case "phone_number":
      return { phone_number: String(value) };
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "select":
      return { select: { name: String(value).slice(0, 100) } };
    case "status":
      return { status: { name: String(value).slice(0, 100) } };
    case "multi_select": {
      const values = Array.isArray(value) ? value : [value];
      return { multi_select: values.map((item) => ({ name: String(item).slice(0, 100) })) };
    }
    default:
      return undefined;
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const notionToken = Deno.env.get("NOTION_TOKEN");
  if (!supabaseUrl || !supabaseAnonKey) return json({ error: "Supabase function environment is incomplete" }, 500);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) return json({ error: "Invalid Huey HQ session" }, 401);

  const audit = async (outcome: "success" | "skipped" | "failed", detail: string, entity: string | null = null) => {
    await supabase.from("sync_audit").insert({
      user_id: user.id,
      provider: "Notion",
      entity,
      outcome,
      detail,
    });
  };

  const setIntegration = async (
    status: "Connected" | "Not Connected" | "Error",
    lastError: string | null,
    lastSyncAt: string | null = null,
  ) => {
    await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        provider: "Notion",
        status,
        last_error: lastError,
        last_sync_at: lastSyncAt,
      },
      { onConflict: "user_id,provider" },
    );
  };

  const setMapping = async (
    entity: string,
    values: {
      status: "Connected" | "Not Connected" | "Error";
      last_error: string | null;
      last_sync_at?: string | null;
      verified_at?: string | null;
    },
  ) => {
    await supabase
      .from("sync_mappings")
      .update(values)
      .eq("provider", "Notion")
      .eq("entity", entity);
  };

  const body = await request.json().catch(() => ({ action: "verify" }));
  const action = body.action === "sync" ? "sync" : "verify";
  const entity = String(body.entity || (action === "sync" ? "tasks" : ""));
  const recordId = typeof body.record_id === "string" ? body.record_id : null;
  let notionVerified = false;

  if (!notionToken) {
    const detail = "NOTION_TOKEN is not configured in Supabase Edge Function secrets.";
    await setIntegration("Not Connected", detail);
    if (entity) await setMapping(entity, { status: "Not Connected", last_error: detail });
    await audit("failed", detail, entity || null);
    return json({ connected: false, error: detail }, 503);
  }

  try {
    const bot = await notionRequest(notionToken, "/users/me");
    notionVerified = true;
    await setIntegration("Connected", null);

    if (!entity) {
      const detail = `Verified Notion integration: ${bot?.name || bot?.type || "bot user"}.`;
      await audit("success", detail);
      return json({ connected: true, verified: true, detail });
    }

    const definition = DEFINITIONS[entity];
    if (!definition) throw new Error(`Unsupported Notion sync entity: ${entity}`);

    const { data: mapping, error: mappingError } = await supabase
      .from("sync_mappings")
      .select("entity,target_ref,field_map")
      .eq("provider", "Notion")
      .eq("entity", entity)
      .maybeSingle();
    if (mappingError) throw mappingError;
    if (!mapping) throw new Error(`No Notion mapping exists for ${entity}.`);

    const fieldMap = (mapping.field_map || {}) as Record<string, string>;
    const dataSource = await notionRequest(notionToken, `/data_sources/${mapping.target_ref}`);
    const properties = dataSource?.properties || {};
    const titleProperty =
      fieldMap.title ||
      Object.entries(properties).find(([, value]: [string, any]) => value?.type === "title")?.[0];
    const externalIdProperty = fieldMap.external_id || "Huey HQ ID";

    if (!titleProperty) throw new Error("The mapped Notion data source has no title property.");
    if (properties[externalIdProperty]?.type !== "rich_text") {
      throw new Error(`Add a Notion rich-text property named "${externalIdProperty}" to prevent duplicate records.`);
    }

    const verifiedAt = new Date().toISOString();
    await setMapping(entity, {
      status: "Connected",
      last_error: null,
      verified_at: verifiedAt,
    });

    if (action === "verify") {
      const detail = `Verified ${entity}: live Notion data source response received and "${externalIdProperty}" is duplicate-safe.`;
      await audit("success", detail, entity);
      return json({ connected: true, verified: true, entity, detail });
    }

    let sourceQuery = supabase
      .from(definition.table)
      .select(definition.select)
      .order(definition.orderBy || "updated_at", { ascending: true });
    if (definition.filter) sourceQuery = sourceQuery.eq(definition.filter.column, definition.filter.value);
    if (recordId) sourceQuery = sourceQuery.eq("id", recordId);
    const { data: rows, error: sourceError } = await sourceQuery;
    if (sourceError) throw sourceError;

    if (!rows?.length) {
      const completedAt = new Date().toISOString();
      const detail = `No Huey HQ records were available for ${entity}; nothing was written to Notion.`;
      await setMapping(entity, { status: "Connected", last_error: null, last_sync_at: completedAt });
      await setIntegration("Connected", null, completedAt);
      await audit("skipped", detail, entity);
      return json({ connected: true, synced: true, entity, created: 0, updated: 0, skipped: 0, failed: 0, detail });
    }

    let created = 0;
    let updated = 0;
    let skippedFields = 0;
    let failed = 0;
    const recordErrors: Array<{ id: string; error: string }> = [];

    for (const row of rows as Record<string, any>[]) {
      try {
        const query = await notionRequest(notionToken, `/data_sources/${mapping.target_ref}/query`, {
          method: "POST",
          body: JSON.stringify({
            page_size: 1,
            filter: { property: externalIdProperty, rich_text: { equals: row.id } },
          }),
        });
        const notionProperties: Record<string, unknown> = {
          [titleProperty]: { title: richText(definition.title(row)) },
          [externalIdProperty]: { rich_text: richText(row.id) },
        };

        for (const field of definition.fields) {
          const propertyName = fieldMap[field.source] || field.notion;
          const property = properties[propertyName];
          const value = field.value ? field.value(row) : row[field.source];
          const converted = propertyValue(property, value, field.kind);
          if (converted) notionProperties[propertyName] = converted;
          else if (value !== null && value !== undefined && value !== "") skippedFields += 1;
        }

        const existing = query?.results?.[0];
        if (existing?.id) {
          await notionRequest(notionToken, `/pages/${existing.id}`, {
            method: "PATCH",
            body: JSON.stringify({ properties: notionProperties }),
          });
          updated += 1;
        } else {
          await notionRequest(notionToken, "/pages", {
            method: "POST",
            body: JSON.stringify({
              parent: { type: "data_source_id", data_source_id: mapping.target_ref },
              properties: notionProperties,
            }),
          });
          created += 1;
        }
      } catch (recordError) {
        failed += 1;
        const recordDetail = recordError instanceof Error ? recordError.message : "Unknown record error";
        recordErrors.push({ id: String(row.id), error: recordDetail });
        await audit(
          "failed",
          `Record ${row.id}: ${recordDetail}`,
          entity,
        );
      }
    }

    const completedAt = new Date().toISOString();
    if (skippedFields > 0) {
      await audit("skipped", `${skippedFields} optional field values were skipped because matching Notion properties were absent or incompatible.`, entity);
    }

    if (failed > 0) {
      const detail = `${entity} sync incomplete: ${created} created, ${updated} updated, ${failed} failed.`;
      await setMapping(entity, { status: "Error", last_error: detail, last_sync_at: completedAt });
      await audit("failed", detail, entity);
      return json({
        connected: true,
        synced: false,
        entity,
        created,
        updated,
        skipped: skippedFields,
        failed,
        error: detail,
        record_errors: recordErrors,
      });
    }

    const detail = `${entity} sync complete: ${created} created, ${updated} updated, ${skippedFields} optional fields skipped.`;
    await setMapping(entity, { status: "Connected", last_error: null, last_sync_at: completedAt });
    await setIntegration("Connected", null, completedAt);
    await audit("success", detail, entity);
    return json({ connected: true, synced: true, entity, created, updated, skipped: skippedFields, failed: 0, detail });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Notion integration error";
    if (!notionVerified) await setIntegration("Error", detail);
    if (entity) await setMapping(entity, { status: "Error", last_error: detail });
    await audit("failed", detail, entity || null);
    return json({ connected: notionVerified, error: detail }, 502);
  }
});
