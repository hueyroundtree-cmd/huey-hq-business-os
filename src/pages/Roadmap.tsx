import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, Circle } from "lucide-react";

const PHASES = [
  { name: "Phase 1 — Internal reliability", status: "current", items: ["Daily use by founder", "Zero-fake data guarantee", "Notion + revenue + CRM stable"] },
  { name: "Phase 2 — Great Freight validation", status: "next", items: ["Run full week of ops in Huey", "Prove revenue capture accuracy", "Two-way Notion sync"] },
  { name: "Phase 3 — One-niche beta", status: "later", items: ["5-10 detailing operators onboarded", "Feedback loop, retention data"] },
  { name: "Phase 4 — Secure subscription product", status: "later", items: ["Billing, tenant hardening, exports"] },
  { name: "Phase 5 — Ecosystem", status: "deferred", items: ["Industry packs", "AI agents", "Templates", "Education", "Consulting", "Marketplace", "Public API"] },
];

export default function Roadmap() {
  return (
    <div>
      <PageHeader title="Product Roadmap" description="Internal: Huey HQ. Public direction: Entrepreneur Operating System / Service Business OS." />
      <div className="p-4 md:p-6 space-y-4">
        {PHASES.map((p, i) => (
          <div key={p.name} className={`surface p-4 ${p.status === "current" ? "border-gold/50" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              {p.status === "current" ? <Circle className="h-4 w-4 text-gold fill-gold" />
                : p.status === "next" ? <Circle className="h-4 w-4 text-foreground" />
                : <CheckCircle2 className="h-4 w-4 text-muted-foreground/40" />}
              <h3 className="font-medium text-sm">{p.name}</h3>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                {p.status === "current" ? "In progress" : p.status === "next" ? "Next" : p.status === "later" ? "Later" : "Deferred"}
              </span>
            </div>
            <ul className="text-sm text-muted-foreground list-disc list-inside ml-1">
              {p.items.map(it => <li key={it}>{it}</li>)}
            </ul>
          </div>
        ))}
        <div className="text-xs text-muted-foreground">Later phases stay visibly deferred until core validation metrics are met.</div>
      </div>
    </div>
  );
}
