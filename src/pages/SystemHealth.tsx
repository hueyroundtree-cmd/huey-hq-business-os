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
import {
  latestTimestamp,
  stateFromEvidence,
  type ConnectionState,
} from "@/lib/connectionHealth";

type HealthItem = {
  name: string;
  status: ConnectionState;
  detail: string;
  lastVerified?: string | null;
  latestError?: string | null;
};

const notImplementedProviders = [
  "Google Drive",
  "Google Calendar",
  "Gmail",
  "Zoho Mail",
  "Google Business",
  "Square",
  "Shopify",
  "Stan Store",
];

function StatusBadge({ status }: { status: ConnectionState }) {
  const verified = status === "Verified Live";
  const failed = status === "Error";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
      verified ? "border-forest/30 bg-forest/10 text-forest" :
      failed ? "border-destructive/30 bg-destructive/10 text-destructive" :
      "border-gold/30 bg-gold/10 text-amber-700"
    }`}>
      {verified ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
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
    const [supabaseResult, eventResult, timelineResult, integrationResult, mappingResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("operations_events").select("id", { count: "exact", head: true }),
      supabase.from("operations_events").select("id, occurred_at").order("occurred_at", { ascending: false }).limit(1),
      supabase.from("integrations").select("provider, last_sync_at, last_error"),
      supabase.from("sync_mappings").select("entity, status, last_sync_at, last_error, verified_at").eq("provider", "Notion"),
    ]);

    const integrations = integrationResult.data ?? [];
    const mappings = mappingResult.data ?? [];
    const notion = integrations.find((item) => item.provider === "Notion");
    const notionError = integrationResult.error?.message ?? mappingResult.error?.message ?? notion?.last_error ?? null;
    const notionVerifiedAt = latestTimestamp([
      notion?.last_sync_at,
      ...mappings.filter((item) => item.status === "Connected").map((item) => item.verified_at),
    ]);
    const mappingHealth = (entity: "leads" | "daily_checkins", name: string): HealthItem => {
      const mapping = mappings.find((item) => item.entity === entity);
      const error = mappingResult.error?.message ?? mapping?.last_error ?? null;
      return {
        name,
        status: stateFromEvidence({
          succeeded: mapping?.status === "Connected",
          verifiedAt: mapping?.verified_at ?? mapping?.last_sync_at,
          error,
        }),
        detail: mapping ? `Notion mapping: ${entity}` : `No Notion mapping configured for ${entity}`,
        lastVerified: mapping?.verified_at ?? mapping?.last_sync_at,
        latestError: error,
      };
    };

    const verifiedItems: HealthItem[] = [
      {
        name: "Supabase",
        status: stateFromEvidence({
          succeeded: !supabaseResult.error,
          verifiedAt: supabaseResult.error ? null : checked,
          error: supabaseResult.error?.message,
        }),
        detail: supabaseResult.error ? "Authenticated database probe failed" : "Authenticated database query succeeded",
        lastVerified: supabaseResult.error ? null : checked,
        latestError: supabaseResult.error?.message,
      },
      {
        name: "Event Engine",
        status: stateFromEvidence({
          succeeded: !eventResult.error,
          verifiedAt: eventResult.error ? null : checked,
          error: eventResult.error?.message,
        }),
        detail: eventResult.error ? "operations_events write foundation is unavailable" : "operations_events table query succeeded",
        lastVerified: eventResult.error ? null : checked,
        latestError: eventResult.error?.message,
      },
      {
        name: "Operations Timeline",
        status: stateFromEvidence({
          succeeded: !timelineResult.error,
          verifiedAt: timelineResult.error ? null : checked,
          error: timelineResult.error?.message,
        }),
        detail: timelineResult.error
          ? "Timeline read failed"
          : timelineResult.data?.length
            ? "Latest operations event read succeeded"
            : "Timeline query succeeded; no events exist yet",
        lastVerified: timelineResult.error ? null : checked,
        latestError: timelineResult.error?.message,
      },
      {
        name: "Notion",
        status: stateFromEvidence({
          succeeded: Boolean(notionVerifiedAt),
          verifiedAt: notionVerifiedAt,
          error: notionError,
        }),
        detail: notionVerifiedAt ? "Notion has a successful verified mapping response" : "No successful Notion API verification recorded",
        lastVerified: notionVerifiedAt,
        latestError: notionError,
      },
      mappingHealth("leads", "CRM sync"),
      mappingHealth("daily_checkins", "Daily Driver sync"),
      {
        name: "Command Center App",
        status: window.location.hostname.includes("github.io") ? "Verified Live" : "Needs Setup",
        detail: `Current session loaded at ${window.location.host || "local preview"}`,
        lastVerified: window.location.hostname.includes("github.io") ? checked : null,
      },
      {
        name: "SSL",
        status: window.location.protocol === "https:" ? "Verified Live" : "Needs Setup",
        detail: window.location.protocol === "https:" ? "Current session uses HTTPS" : "HTTPS not verified",
        lastVerified: window.location.protocol === "https:" ? checked : null,
      },
      {
        name: "Backups",
        status: "Manual Only",
        detail: "Automatic backups are not verified; JSON export is available in Settings",
      },
      ...notImplementedProviders.map((name): HealthItem => ({
        name,
        status: "Not Implemented",
        detail: "No server-side API handshake exists. Saved configuration does not count as a live connection.",
      })),
    ];

    setItems(verifiedItems);
    setLoading(false);
  };

  useEffect(() => { check(); }, []);

  const summary = useMemo(() => ({
    verified: items.filter((item) => item.status === "Verified Live").length,
    attention: items.filter((item) => ["Needs Setup", "Manual Only", "Not Implemented"].includes(item.status)).length,
    errors: items.filter((item) => item.status === "Error").length,
  }), [items]);

  return (
    <div>
      <PageHeader
        title="System Health"
        description="Evidence-based connection status. Configuration alone never counts as live."
        actions={
          <Button size="sm" variant="outline" onClick={check} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Run health check
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <Summary label="Verified Live" value={summary.verified} icon={CheckCircle2} />
          <Summary label="Needs Attention" value={summary.attention} icon={AlertTriangle} />
          <Summary label="Errors" value={summary.errors} icon={Activity} />
        </div>

        <section className="surface overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="font-display font-semibold">Core verification</h2>
          </div>
          <div className="divide-y">
            {items.slice(0, 9).map((item) => <HealthRow key={item.name} item={item} />)}
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="font-display font-semibold">External integrations</h2>
          </div>
          <div className="grid md:grid-cols-2">
            {items.slice(9).map((item) => <HealthRow key={item.name} item={item} />)}
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
    ["Supabase", "Event Engine", "Operations Timeline"].includes(item.name) ? Database :
    item.name === "Backups" ? HardDriveDownload :
    item.name === "SSL" ? LockKeyhole :
    item.name.includes("App") ? Cloud :
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
        <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
          <div>Last verified: {item.lastVerified ? new Date(item.lastVerified).toLocaleString() : "Never"}</div>
          <div>Latest error: {item.latestError || "None recorded"}</div>
        </div>
      </div>
    </div>
  );
}
