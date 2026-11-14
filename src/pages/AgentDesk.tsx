import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { RefreshCw, ShieldCheck, Search, ExternalLink } from "lucide-react";

type AgentTask = {
  id: string;
  title: string;
  source: string | null;
  department: string | null;
  assigned_agent_id: string | null;
  action: string | null;
  status: string | null;
  approved_by_owner: boolean | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
};

const notionCommandCenter = "https://app.notion.com/p/38f0c11a8316818ea175e1707763239f";
const states = ["all", "awaiting_approval", "blocked", "inbox"] as const;

export default function AgentDesk() {
  const [rows, setRows] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    // Supabase generated types in this repository predate the agent_tasks table.
    // Query the existing owner-RLS-protected table. This page is read-only.
    const { data, error: requestError } = await (supabase as any)
      .from("agent_tasks")
      .select("id,title,source,department,assigned_agent_id,action,status,approved_by_owner,evidence_url,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (requestError) {
      setError(requestError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as AgentTask[]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  const visible = useMemo(() => rows.filter((row) =>
    filter === "all" || row.status === filter
  ), [rows, filter]);
  const pending = rows.filter((row) => row.status === "awaiting_approval" && !row.approved_by_owner).length;
  const blocked = rows.filter((row) => row.status === "blocked").length;

  return (
    <div>
      <PageHeader title="Malcolm · Agent Desk"
        description="Read-only review of specialist reports, approvals and blockers from your existing Huey HQ database."
        actions={<Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>}
      />
      <div className="space-y-4 p-4 md:p-6">
        <div className="surface p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-gold" />Owner approval is required</div>
          <p className="text-xs text-muted-foreground">Reviewing a report does not approve orders, payments, seller/customer contact, publishing, financing, credit pulls, applications, security changes or deployments. This screen does not send instructions to Claude or make payments. Evidence links may point to files that must be opened in their original system.</p>
          <a className="inline-flex items-center gap-1 text-xs underline" href={notionCommandCenter} target="_blank" rel="noopener noreferrer">Open existing Notion CEO Command Center <ExternalLink className="h-3 w-3" /></a>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card"><div className="stat-label">Recorded tasks</div><div className="stat-value">{rows.length}</div></div>
          <div className="stat-card"><div className="stat-label">Approval review</div><div className="stat-value">{pending}</div></div>
          <div className="stat-card"><div className="stat-label">Blocked</div><div className="stat-value">{blocked}</div></div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filter reports">
          {states.map((state) => (
            <Button key={state} type="button" size="sm" variant={filter === state ? "default" : "outline"} onClick={() => setFilter(state)}>
              {state === "all" ? "All reports" : state.replaceAll("_", " ")}
            </Button>
          ))}
        </div>

        {error && <div className="surface p-4 text-sm text-destructive" role="alert">Agent report read failed: {error}. Do not treat missing data as no reports.</div>}
        {!loading && !error && rows.length === 0 && <div className="surface p-6 text-sm text-muted-foreground">No visible agent reports. Verify the signed-in account and Supabase permissions; a blank list does not prove that agents completed no work.</div>}

        <div className="space-y-3">
          {visible.map((row) => (
            <article key={row.id} className="surface p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Search className="h-4 w-4 text-gold" />{row.assigned_agent_id || row.source || "Unassigned report"}
                </div>
                <span className="rounded-full border px-2 py-1 text-[11px]">{(row.status || "unknown").replaceAll("_", " ")}</span>
              </div>
              <p className="text-sm break-words">{row.title}</p>
              <div className="text-xs text-muted-foreground">Department: {row.department || "—"} · Action: {row.action || "—"} · Filed {new Date(row.updated_at).toLocaleString()}</div>
              <div className="text-xs">Owner approval recorded: <b>{row.approved_by_owner ? "Yes (verify scope)" : "No"}</b></div>
              {row.evidence_url && (
                row.evidence_url.startsWith("https://")
                  ? <a className="text-xs underline break-all" href={row.evidence_url} target="_blank" rel="noopener noreferrer">Open evidence <ExternalLink className="inline h-3 w-3" /></a>
                  : <div className="text-xs text-muted-foreground break-all">Evidence file: {row.evidence_url} (open in the source agent project)</div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
