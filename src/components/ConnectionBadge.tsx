import { relTime } from "@/lib/format";
import { AlertTriangle, CheckCircle2, CircleOff } from "lucide-react";

export type ConnStatus = "Verified Live" | "Needs Setup" | "Error" | "Manual Only" | "Not Implemented";

export function ConnectionBadge({ status, lastSync }: { status: ConnStatus; lastSync?: string | null }) {
  const map = {
    "Verified Live": { icon: CheckCircle2, cls: "bg-forest/10 text-forest border-forest/20" },
    "Needs Setup": { icon: CircleOff, cls: "bg-muted text-muted-foreground border-border" },
    "Error": { icon: AlertTriangle, cls: "bg-destructive/10 text-destructive border-destructive/20" },
    "Manual Only": { icon: CircleOff, cls: "bg-gold/10 text-gold border-gold/20" },
    "Not Implemented": { icon: CircleOff, cls: "bg-muted text-muted-foreground border-border" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-medium ${map.cls}`}>
      <Icon className="h-3 w-3" />
      {status}
      {lastSync && status === "Verified Live" && <span className="text-muted-foreground">· synced {relTime(lastSync)}</span>}
    </span>
  );
}
