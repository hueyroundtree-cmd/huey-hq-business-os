import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { EmptyState } from "@/components/EmptyState";
import { NOTION_ENTITIES, notionEntity, type NotionEntityKey } from "@/lib/notionEntities";
import { toast } from "sonner";
import { relTime } from "@/lib/format";
import { ArrowLeft, Database, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

type Mapping = {
  id: string;
  entity: NotionEntityKey;
  target_ref: string;
  field_map: Record<string, string>;
  status: "Connected" | "Not Connected" | "Error";
  last_sync_at: string | null;
  last_error: string | null;
  verified_at: string | null;
};
type Audit = {
  id: string;
  entity: string | null;
  outcome: "success" | "skipped" | "failed";
  detail: string | null;
  created_at: string;
};

export default function NotionSetup() {
  const { entity: entityParam } = useParams();
  const selected = notionEntity(entityParam);
  const [integration, setIntegration] = useState<any>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [targetRef, setTargetRef] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    let auditQuery = supabase
      .from("sync_audit")
      .select("*")
      .eq("provider", "Notion")
      .order("created_at", { ascending: false })
      .limit(selected ? 30 : 50);
    if (selected) auditQuery = auditQuery.eq("entity", selected.key);

    const [i, m, a] = await Promise.all([
      supabase.from("integrations").select("*").eq("provider", "Notion").maybeSingle(),
      supabase.from("sync_mappings").select("*").eq("provider", "Notion").order("entity"),
      auditQuery,
    ]);
    setIntegration(i.data);
    setMappings((m.data as unknown as Mapping[]) ?? []);
    setAudits((a.data as Audit[]) ?? []);
    if (selected) {
      const current = (m.data as unknown as Mapping[] | null)?.find((item) => item.entity === selected.key);
      setTargetRef(current?.target_ref ?? "");
    }
  };

  useEffect(() => {
    load();
  }, [entityParam]);

  const current = useMemo(
    () => mappings.find((mapping) => mapping.entity === selected?.key),
    [mappings, selected],
  );
  const globalStatus = (integration?.status ?? "Not Connected") as "Connected" | "Not Connected" | "Error";
  const pageStatus = current?.status ?? "Not Connected";

  const saveMapping = async () => {
    if (!selected || !targetRef.trim()) return toast.error("Notion data source ID required");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return toast.error("Sign in again before saving.");
    const { error } = await supabase.from("sync_mappings").upsert(
      {
        user_id: data.user.id,
        provider: "Notion",
        entity: selected.key,
        target_ref: targetRef.trim(),
        field_map: current?.field_map ?? {},
        status: "Not Connected",
        last_error: null,
      } as any,
      { onConflict: "user_id,provider,entity" },
    );
    if (error) return toast.error(error.message);
    toast.success(`${selected.label} mapping saved`);
    await load();
  };

  const runNotion = async (action: "verify" | "sync") => {
    if (!selected) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("notion-sync", {
      body: { action, entity: selected.key },
    });
    if (error || data?.error) {
      toast.error(action === "verify" ? "Connection verification failed" : "Sync failed", {
        description: data?.error || error?.message || "Review the audit log.",
      });
    } else {
      toast.success(action === "verify" ? "Connection verified" : `${selected.label} synced`, {
        description: data?.detail,
      });
    }
    setBusy(false);
    await load();
  };

  const removeMapping = async () => {
    if (!current) return;
    const { error } = await supabase.from("sync_mappings").delete().eq("id", current.id);
    if (error) return toast.error(error.message);
    toast.success("Mapping removed");
    setTargetRef("");
    await load();
  };

  if (!selected) {
    return (
      <div>
        <PageHeader
          title="Notion Connections"
          description="Each data area verifies and syncs independently. Connected means Notion returned a real response."
          actions={<ConnectionBadge status={globalStatus} lastSync={integration?.last_sync_at} />}
        />
        <div className="p-4 md:p-6 space-y-4">
          <div className="surface border-gold/40 bg-gold/10 p-4 text-sm">
            Every mapped Notion data source needs a title property and a rich-text property named{" "}
            <code className="font-mono">Huey HQ ID</code>. That ID is the duplicate-prevention key.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {NOTION_ENTITIES.map((entity) => {
              const mapping = mappings.find((item) => item.entity === entity.key);
              const status = mapping?.status ?? "Not Connected";
              return (
                <Link
                  key={entity.key}
                  to={`/integrations/notion/${entity.key}`}
                  className="surface p-4 transition-colors hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{entity.label}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{entity.description}</p>
                    </div>
                    <ConnectionBadge status={status} lastSync={mapping?.last_sync_at} />
                  </div>
                  {mapping?.last_error && <p className="mt-3 text-xs text-destructive">{mapping.last_error}</p>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={selected.label}
        description={selected.description}
        actions={<ConnectionBadge status={pageStatus} lastSync={current?.last_sync_at} />}
      />
      <div className="p-4 md:p-6 space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link to="/integrations/notion"><ArrowLeft className="mr-1.5 h-4 w-4" />All Notion connections</Link>
        </Button>

        <section className="surface p-4 space-y-4">
          <div>
            <h2 className="font-medium">Notion data source</h2>
            <p className="text-xs text-muted-foreground">
              Share the database with Command Center, then paste its data source ID. Expected title:{" "}
              <code className="font-mono">{selected.requiredTitle}</code>.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={targetRef}
              onChange={(event) => setTargetRef(event.target.value)}
              placeholder="Notion data source ID"
              className="flex-1"
            />
            <Button onClick={saveMapping}>Save mapping</Button>
            {current && (
              <Button variant="outline" size="icon" onClick={removeMapping} aria-label="Remove mapping" title="Remove mapping">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runNotion("verify")} disabled={busy || !current}>
              <ShieldCheck className="mr-1.5 h-4 w-4" />Verify Connection
            </Button>
            <Button onClick={() => runNotion("sync")} disabled={busy || !current}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${busy ? "animate-spin" : ""}`} />Sync Now
            </Button>
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{pageStatus}</dd></div>
            <div><dt className="text-muted-foreground">Verified</dt><dd className="font-medium">{current?.verified_at ? relTime(current.verified_at) : "Never"}</dd></div>
            <div><dt className="text-muted-foreground">Last sync</dt><dd className="font-medium">{current?.last_sync_at ? relTime(current.last_sync_at) : "Never"}</dd></div>
          </dl>
          {current?.last_error && <p className="text-xs text-destructive">Last error: {current.last_error}</p>}
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-medium"><Database className="h-4 w-4" />Audit log</h2>
          {audits.length === 0 ? (
            <EmptyState icon={Database} title="No sync evidence yet" description="Verify the connection to create the first audit record." />
          ) : (
            <ul className="space-y-2 text-sm">
              {audits.map((audit) => (
                <li key={audit.id} className="flex items-start justify-between gap-3 border-l-2 border-border pl-3">
                  <div>
                    <div className="font-medium capitalize">
                      {audit.outcome}
                      <span className={`ml-2 text-xs ${audit.outcome === "success" ? "text-forest" : audit.outcome === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                        {selected.label}
                      </span>
                    </div>
                    {audit.detail && <div className="text-xs text-muted-foreground">{audit.detail}</div>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relTime(audit.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
