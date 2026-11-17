import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { relTime } from "@/lib/format";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

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

const COMMANDS = [
  { department: "Executive", command: "Give me today's three highest-value actions from verified Huey HQ data." },
  { department: "Sales", command: "Rank the five warmest overdue leads and draft one manual follow-up for each." },
  { department: "Finance", command: "Show verified income, available cash, bills due and missing proof." },
  { department: "Operations", command: "Build today's detailing procurement and booking checklist." },
  { department: "Marketing", command: "Turn today's real work into one post and one local offer." },
  { department: "Content", command: "Move one in-flight idea to a publish-ready script." },
  { department: "Customer Success", command: "List booked customers needing confirmation, review or follow-up." },
  { department: "Automation", command: "Audit every connection and show only statuses backed by a current run." },
];

export default function Executive() {
  const [stats, setStats] = useState<any>({});
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date().toISOString();
      const [followRes, billsRes, leadsRes, contentRes, autoRes, revRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).lte("next_follow_up_at", now).not("next_follow_up_at", "is", null),
        supabase.from("bills").select("amount").eq("paid", false),
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("content_items").select("id", { count: "exact", head: true }).in("stage", ["Idea","Script","Record","Edit","Review"]),
        supabase.from("automations").select("id, status"),
        supabase.from("revenue_entries").select("id", { count: "exact", head: true }).is("proof_url", null),
      ]);
      setStats({
        overdueFollowups: followRes.count ?? 0,
        billsUnpaidCount: (billsRes.data ?? []).length,
        totalLeads: leadsRes.count ?? 0,
        contentInFlight: contentRes.count ?? 0,
        activeAutos: (autoRes.data ?? []).filter((a: any) => a.status === "Active").length,
        autoTotal: (autoRes.data ?? []).length,
        revNoProof: revRes.count ?? 0,
      });
      setLastSync(new Date().toISOString());
    })();
  }, []);

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
      <PageHeader title="AI Executive Team" description="Live data-derived operating guidance. Generative AI remains Not Implemented; commands and recommendations below are usable now." />
      <div className="p-4 md:p-6 space-y-5">
        <section className="surface border-gold/40 bg-gold/10 p-4">
          <div className="font-medium">Today's recovery order</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground/80">
            <li>Follow up with the five warmest existing leads; do not wait for the full product restock.</li>
            <li>Log only money that actually moved, with source and proof.</li>
            <li>Verify Notion mappings and current run evidence before calling any connection live.</li>
          </ol>
          <Button asChild size="sm" className="mt-3"><Link to="/crm">Open warm leads</Link></Button>
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
        <section>
          <h2 className="mb-3 font-medium">Approved command library</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {COMMANDS.map((item) => (
              <div key={item.department} className="surface p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gold-foreground/80">{item.department}</div>
                <p className="mt-2 text-sm">{item.command}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
