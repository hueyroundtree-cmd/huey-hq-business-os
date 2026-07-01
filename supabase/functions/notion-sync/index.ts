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

const text = (value: string) => [{ type: "text", text: { content: value.slice(0, 2000) } }];

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

  const audit = async (outcome: string, detail: string, entity: string | null = null) => {
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

  if (!notionToken) {
    const detail = "NOTION_TOKEN is not configured in Supabase Edge Function secrets.";
    await setIntegration("Not Connected", detail);
    await audit("failed", detail);
    return json({ connected: false, error: detail }, 503);
  }

  const body = await request.json().catch(() => ({ action: "verify" }));

  try {
    const bot = await notionRequest(notionToken, "/users/me");
    await setIntegration("Connected", null);

    if ((body.action ?? "verify") === "verify") {
      const detail = `Verified Notion integration: ${bot?.name || bot?.type || "bot user"}.`;
      await audit("success", detail);
      return json({ connected: true, verified: true, detail });
    }

    const { data: mappings, error: mappingError } = await supabase
      .from("sync_mappings")
      .select("entity,target_ref,field_map")
      .eq("provider", "Notion");
    if (mappingError) throw mappingError;
    if (!mappings?.length) throw new Error("No Notion mappings exist. Add a tasks database mapping first.");

    for (const mapping of mappings.filter((item) => item.entity !== "tasks")) {
      await audit("skipped", `${mapping.entity} sync is not enabled yet.`, mapping.entity);
    }

    const mapping = mappings.find((item) => item.entity === "tasks");
    if (!mapping) throw new Error("Task sync requires a tasks mapping.");

    const fieldMap = (mapping.field_map || {}) as Record<string, string>;
    const dataSource = await notionRequest(notionToken, `/data_sources/${mapping.target_ref}`);
    const properties = dataSource?.properties || {};
    const titleProperty =
      fieldMap.title ||
      Object.entries(properties).find(([, value]: [string, any]) => value?.type === "title")?.[0];
    const externalIdProperty = fieldMap.external_id || "Huey HQ ID";
    const doneProperty = fieldMap.done || "Done";
    const dateProperty = fieldMap.for_date || "Date";

    if (!titleProperty) throw new Error("The mapped Notion database has no title property.");
    if (properties[externalIdProperty]?.type !== "rich_text") {
      throw new Error(`Add a Notion rich-text property named "${externalIdProperty}" to prevent duplicate tasks.`);
    }

    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("id,title,done,for_date,updated_at")
      .order("updated_at", { ascending: true });
    if (taskError) throw taskError;

    let created = 0;
    let updated = 0;
    for (const task of tasks || []) {
      const query = await notionRequest(notionToken, `/data_sources/${mapping.target_ref}/query`, {
        method: "POST",
        body: JSON.stringify({
          page_size: 1,
          filter: { property: externalIdProperty, rich_text: { equals: task.id } },
        }),
      });
      const notionProperties: Record<string, unknown> = {
        [titleProperty]: { title: text(task.title) },
        [externalIdProperty]: { rich_text: text(task.id) },
      };
      if (properties[doneProperty]?.type === "checkbox") notionProperties[doneProperty] = { checkbox: task.done };
      if (properties[dateProperty]?.type === "date") notionProperties[dateProperty] = { date: { start: task.for_date } };

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
    }

    const completedAt = new Date().toISOString();
    const detail = `Task sync complete: ${created} created, ${updated} updated.`;
    await setIntegration("Connected", null, completedAt);
    await audit("success", detail, "tasks");
    return json({ connected: true, synced: true, entity: "tasks", created, updated, detail });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Notion integration error";
    await setIntegration("Error", detail);
    await audit("failed", detail);
    return json({ connected: false, error: detail }, 502);
  }
});
