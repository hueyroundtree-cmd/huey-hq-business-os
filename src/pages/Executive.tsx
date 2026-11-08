import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { relTime } from "@/lib/format";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const DEPTS = [
  { key: "Executive Office", brief: "Oversight, priorities, weekly review." },
  { key: "Finance", brief: "Cash, revenue, bills, proof enforcement." },
  { key: "Operations", brief: "Jobs, scheduling, checklists." },
  { key: "Sales", brief: "Lead flow, follow-ups, conversion." },
  { key: "Marketing", brief: "Positioning, offers, channels." },
  { key: "Content", brief: "Ideas â†’ posted. Repurposing." },
  { key: "Customer Success", brief: "Bookings, delivery, reviews." },
  { key: "Automation", brief: "Registered automations & health." },
];

export default function Executive() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [agentTasks, setAgentTasks] = useState<any[]>([]);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const [followRes, billsRes, leadsRes, contentRes, autoRes, revRes, jobsRes, tasksRes, revenueTotalRes, checkinsRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).lte("next_follow_up_at", now).not("next_follow_up_at", "is", null),
        supabase.from("bills").select("amount").eq("paid", false),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("content_items").select("id", { count: "exact", head: true }).in("stage", ["Idea","Script","Record","Edit","Review"]),
        supabase.from("automations").select("id, status"),
        supabase.from("revenue_entries").select("id", { count: "exact", head: true }).is("proof_url", null),
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id", { count: "exact", head: true }),
        supabase.from("revenue_entries").select("id", { count: "exact", head: true }),
        supabase.from("daily_checkins").select("id", { count: "exact", head: true }),
      ]);
      const failed = [followRes,billsRes,leadsRes,contentRes,autoRes,revRes,jobsRes,tasksRes,revenueTotalRes,checkinsRes].some(r => r.error);
      setDataError(failed ? "Some business records could not be loaded; totals may be incomplete." : null);
      setStats({
        overdueFollowups: followRes.count ?? 0,
        billsUnpaidCount: (billsRes.data ?? []).length,
        totalLeads: leadsRes.count ?? 0,
        contentInFlight: contentRes.count ?? 0,
        activeAutos: (autoRes.data ?? []).filter((a: any) => a.status === "Active").length,
        autoTotal: (autoRes.data ?? []).length,
        revNoProof: revRes.count ?? 0,
        jobs: jobsRes.count,
        tasks: tasksRes.count,
        revenueEntries: revenueTotalRes.count,
        checkins: checkinsRes.count,
      });
      setLastSync(new Date().toISOString());
    })();
  }, []);

  useEffect(() => {
    if (!user) { setAgentTasks([]); return; }
    let alive = true;
    supabase.from("agent_tasks").select("id,title,source,assigned_agent_id,department,status,evidence_url,created_at,approved_by_owner").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100).then(({ data, error }: any) => {
      if (!alive) return;
      setAgentError(error?.message ?? null);
      setAgentTasks(data ?? []);
    });
    return () => { alive = false; };
  }, [user?.id]);

  const realAgentTasks = agentTasks.filter(t => t.source !== "claude-test" && !String(t.title ?? "").startsWith("TEST ONLY:"));
  const testTaskCount = agentTasks.length - realAgentTasks.length;
  const recFor = (key: string): string[] => {
    switch (key) {
      case "Finance": return [
        stats.revNoProof > 0 ? `Attach proof to ${stats.revNoProof} revenue entr${stats.revNoProof === 1 ? "y" : "ies"}.` : "All logged revenue has proof.",
        stats.billsUnpaidCount > 0 ? `${stats.billsUnpaidCount} unpaid bills to review.` : "No unpaid bills tracked.",
      ];
      case "Sales": return [
        stats.overdueFollowups > 0 ? `${stats.overdueFollowups} overdue follow-ups to work.` : "No overdue follow-ups. Prospect.",
      ];
      case "Content": return [
        stats.contentInFlight > 0 ? `${stats.contentInFlight} items in flight â€” move one to Posted today.` : "Pipeline empty. Capture 3 ideas.",
      ];
      case "Automation": return [
        stats.autoTotal === 0 ? "No automations registered yet." : `${stats.activeAutos}/${stats.autoTotal} automations Active.`,
      ];
      default: return ["Recommendations appear once relevant data exists."];
    }
  };

  return (
    <div>
      <PageHeader title="Malcolm Shakur — CEO Command Center" description="Deterministic recommendations from your own data. AI provider Not Implemented â€” proposed actions require your review." />
      <div className="p-4 md:p-6 space-y-4">
        <section className="surface p-4 space-y-3" aria-label="CEO daily command report">
          <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">Malcolm Shakur · CEO Command Report</h2><p className="text-xs text-muted-foreground">Live database snapshot, not autonomous specialist execution. Refreshed {relTime(lastSync)}.</p></div><Link className="text-sm underline" to="/agents">Agent Control Center</Link></div>
          {dataError && <p role="alert" className="text-sm text-destructive">{dataError}</p>}
          {agentError && <p role="alert" className="text-sm text-destructive">Agent reporting unavailable: {agentError}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{[["Leads",stats.totalLeads],["Tasks",stats.tasks],["Revenue records",stats.revenueEntries],["Daily check-ins",stats.checkins],["Jobs",stats.jobs],["Content in progress",stats.contentInFlight]].map(([label,value]) => <div key={String(label)} className="rounded border p-3"><div className="text-xl font-semibold">{value ?? "—"}</div><div className="text-xs text-muted-foreground">{label}</div></div>)}</div>
          <div className="grid md:grid-cols-3 gap-3 text-sm"><div className="rounded border p-3"><strong>Evidence-linked completion claims</strong><p className="text-muted-foreground">{realAgentTasks.filter(t => t.status === "verified_complete" && t.evidence_url).length} marked complete in the database; independent verification not yet automated.</p></div><div className="rounded border p-3"><strong>Waiting on approval</strong><p className="text-muted-foreground">{realAgentTasks.filter(t => t.status === "awaiting_approval").length} agent task(s) need your review.</p></div><div className="rounded border p-3"><strong>Open specialist work</strong><p className="text-muted-foreground">{realAgentTasks.filter(t => ["assigned","working","inbox","blocked"].includes(t.status)).length} recorded assignment(s); execution worker not connected.</p></div></div>
          <div className="rounded border p-3 space-y-2"><h3 className="font-medium text-sm">Specialist reports to Malcolm Shakur</h3><p className="text-xs text-muted-foreground">Non-test records: {realAgentTasks.length}; test records excluded: {testTaskCount}. Saved rows do not establish agent execution.</p>{realAgentTasks.length === 0 ? <p className="text-xs text-muted-foreground">No specialist assignments recorded yet. The report will populate when tasks and evidence are added.</p> : realAgentTasks.slice(0, 5).map(t => <div key={t.id} className="border-t pt-2 text-xs flex flex-wrap justify-between gap-2"><div><strong>{t.assigned_agent_id}</strong> · {t.title}<div className="text-muted-foreground">{t.status.replaceAll("_", " ")}{t.evidence_url ? " · evidence attached (not independently verified)" : " · no evidence"}</div></div>{t.evidence_url?.startsWith("https://") && <a className="underline" href={t.evidence_url} target="_blank" rel="noopener noreferrer">Evidence</a>}</div>)}</div>
          <div className="text-xs text-muted-foreground">Notion and ChatGPT scheduled briefs are separate until a verified sync worker is installed. Counts reflect this signed-in user’s accessible database records. No trades, messages, or purchases are performed.</div>
        </section>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
        {DEPTS.map(d => (
          <div key={d.key} className="surface p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-sm">{d.key}</div>
                <div className="text-xs text-muted-foreground">{d.brief}</div>
              </div>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              {recFor(d.key).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div className="text-[10px] text-muted-foreground/80 mt-auto pt-2 border-t">
              Updated {relTime(lastSync)} Â· <span className="uppercase tracking-wide">AI: Not Implemented</span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
