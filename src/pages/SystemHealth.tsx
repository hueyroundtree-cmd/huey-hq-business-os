import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  HardDriveDownload,
  LockKeyhole,
  RefreshCw,
  Server,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

type HealthStatus = "Healthy" | "Connected" | "Waiting" | "Error" | "Not Verified";
type HealthItem = {
  name: string;
  status: HealthStatus;
  detail: string;
  lastChecked?: string;
};

const providers = ["Notion", "Google Drive", "Google Calendar", "Gmail", "Zoho Mail", "Google Business", "Square", "Shopify", "Stan Store"];

function StatusBadge({ status }: { status: HealthStatus }) {
  const healthy = status === "Healthy" || status === "Connected";
  const failed = status === "Error";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
      healthy ? "border-forest/30 bg-forest/10 text-forest" :
      failed ? "border-destructive/30 bg-destructive/10 text-destructive" :
      "border-gold/30 bg-gold/10 text-amber-700"
    }`}>
      {healthy ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {status}
    </span>
  );
}

export default function SystemHealth() {
  const [items, setItems] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(true);

  const check = async () => {
    setLoading(true);
    const checked = new Date().toISOString();
    const [integrationResult, supabaseResult, eventResult] = await Promise.all([
      supabase.from("integrations").select("provider, status, last_sync_at"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("operations_events").select("id", { count: "exact", head: true }),
    ]);

    const integrationRows = integrationResult.data ?? [];
    const providerItems: HealthItem[] = providers.map((provider) => {
      const row = integrationRows.find((item) => item.provider === provider);
      const status: HealthStatus =
        row?.status === "Connected" ? "Connected" :
        row?.status === "Error" ? "Error" :
        "Waiting";
      return {
        name: provider,
        status,
        detail: row?.last_sync_at ? `Last sync ${new Date(row.last_sync_at).toLocaleString()}` : "No verified connection or sync",
        lastChecked: checked,
      };
    });

    const runtimeItems: HealthItem[] = [
      {
        name: "Supabase",
        status: supabaseResult.error ? "Error" : "Healthy",
        detail: supabaseResult.error?.message ?? "Authenticated database responded",
        lastChecked: checked,
      },
      {
        name: "Event Engine",
        status: eventResult.error ? "Waiting" : "Healthy",
        detail: eventResult.error ? "Migration has not been verified in production" : "Operations events table responded",
        lastChecked: checked,
      },
      {
        name: "Command Center App",
        status: "Healthy",
        detail: `Current session loaded at ${window.location.host || "local preview"}`,
        lastChecked: checked,
      },
      {
        name: "SSL",
        status: window.location.protocol === "https:" ? "Healthy" : "Not Verified",
        detail: window.location.protocol === "https:" ? "This session uses HTTPS" : "Local preview is not proof of production SSL",
        lastChecked: checked,
      },
      {
        name: "Backups",
        status: "Waiting",
        detail: "Automatic backup schedule is not verified; manual JSON export is available in Settings",
        lastChecked: checked,
      },
      {
        name: "Production Deployment",
        status: window.location.hostname.includes("github.io") ? "Healthy" : "Not Verified",
        detail: window.location.hostname.includes("github.io") ? "Running from GitHub Pages" : "Production URL was not tested from this session",
        lastChecked: checked,
      },
    ];

    setItems([...runtimeItems, ...providerItems]);
    setLoading(false);
  };

  useEffect(() => { check(); }, []);

  const summary = useMemo(() => ({
    healthy: items.filter((item) => ["Healthy", "Connected"].includes(item.status)).length,
    attention: items.filter((item) => ["Waiting", "Not Verified"].includes(item.status)).length,
    errors: items.filter((item) => item.status === "Error").length,
  }), [items]);

  return (
    <div>
      <PageHeader
        title="System Health"
        description="Live connection and foundation status. Nothing is marked healthy without evidence."
        actions={
          <Button size="sm" variant="outline" onClick={check} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Run health check
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Summary label="Healthy" value={summary.healthy} icon={CheckCircle2} />
          <Summary label="Needs Attention" value={summary.attention} icon={AlertTriangle} />
          <Summary label="Errors" value={summary.errors} icon={Activity} />
        </div>

        <section className="surface overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="font-display font-semibold">Command Center foundation</h2>
          </div>
          <div className="divide-y">
            {items.slice(0, 6).map((item) => <HealthRow key={item.name} item={item} />)}
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="font-display font-semibold">Integrations</h2>
          </div>
          <div className="grid md:grid-cols-2">
            {items.slice(6).map((item) => <HealthRow key={item.name} item={item} />)}
          </div>
        </section>

        <section className="surface border-l-4 border-l-gold p-4">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 h-5 w-5 text-gold" />
            <div>
              <div className="font-medium">Current foundation priority</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Apply and verify the Event Engine migration, then test one real lead from CRM through follow-up task and Operations Timeline.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Server }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="stat-label">{label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function HealthRow({ item }: { item: HealthItem }) {
  const icon =
    item.name === "Supabase" || item.name === "Event Engine" ? Database :
    item.name === "Backups" ? HardDriveDownload :
    item.name === "SSL" ? LockKeyhole :
    item.name.includes("App") || item.name.includes("Deployment") ? Cloud :
    Server;
  const Icon = icon;
  return (
    <div className="flex items-start gap-3 p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="font-medium text-sm">{item.name}</div>
          <StatusBadge status={item.status} />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{item.detail}</div>
      </div>
    </div>
  );
}
