import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { relTime } from "@/lib/format";

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
      <PageHeader title="AI Executive Team" description="Deterministic recommendations from your own data. AI provider Not Implemented â€” proposed actions require your review." />
      <div className="p-4 md:p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-3">
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
  );
}
