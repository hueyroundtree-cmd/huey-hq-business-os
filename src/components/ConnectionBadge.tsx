import { relTime } from "@/lib/format";
import { CheckCircle2, CircleOff, AlertTriangle } from "lucide-react";

export type ConnStatus = "Connected" | "Not Connected" | "Error";

export function ConnectionBadge({ status, lastSync }: { status: ConnStatus; lastSync?: string | null }) {
  const map = {
    "Connected": { icon: CheckCircle2, cls: "bg-forest/10 text-forest border-forest/20" },
    "Not Connected": { icon: CircleOff, cls: "bg-muted text-muted-foreground border-border" },
    "Error": { icon: AlertTriangle, cls: "bg-destructive/10 text-destructive border-destructive/20" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${map.cls}`}>
      <Icon className="h-3 w-3" />
      {status}
      {lastSync && status === "Connected" && <span className="text-muted-foreground">· synced {relTime(lastSync)}</span>}
    </span>
  );
}
