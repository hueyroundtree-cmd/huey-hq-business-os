import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://hueyroundtree-cmd.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://hueyroundtree-cmd.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase function environment is incomplete" }, 500, origin);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401, origin);
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401, origin);

  const recordStatus = async (status: "Connected" | "Error", error: string | null) => {
    const verification = status === "Connected" ? { last_sync_at: new Date().toISOString() } : {};
    await supabase.from("integrations").upsert(
      {
        user_id: authData.user.id,
        provider: "Claude AI",
        status,
        last_error: error,
        config: { function: "ask-claude", model: "claude-sonnet-4-6" },
        ...verification,
      },
      { onConflict: "user_id,provider" },
    );
  };

  if (!anthropicApiKey) {
    const detail = "ANTHROPIC_API_KEY is not configured in Supabase Edge Function secrets.";
    await recordStatus("Error", detail);
    return json({ error: detail }, 503, origin);
  }

  let prompt = "";
  try {
    const body = await request.json();
    prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    return json({ error: "Invalid JSON body" }, 400, origin);
  }
  if (!prompt) return json({ error: "Prompt is required" }, 400, origin);
  if (prompt.length > 4000) return json({ error: "Prompt exceeds 4,000 characters" }, 400, origin);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: "You are the Huey HQ executive assistant. Give concise, practical answers. Never claim an external action was completed unless the supplied data proves it.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const detail = payload?.error?.message ?? `Claude API returned ${response.status}`;
      await recordStatus("Error", detail);
      return json({ error: detail }, 502, origin);
    }
    const text = Array.isArray(payload?.content)
      ? payload.content
          .filter((block: { type?: string; text?: string }) => block.type === "text" && block.text)
          .map((block: { text: string }) => block.text)
          .join("\n")
      : "";
    if (!text) {
      const detail = "Claude API returned no text response.";
      await recordStatus("Error", detail);
      return json({ error: detail }, 502, origin);
    }
    await recordStatus("Connected", null);
    return json({ text, model: payload.model, usage: payload.usage }, 200, origin);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Claude API request failed";
    await recordStatus("Error", detail);
    return json({ error: detail }, 502, origin);
  }
});
