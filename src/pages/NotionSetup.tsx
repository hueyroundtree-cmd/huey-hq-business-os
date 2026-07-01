import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { relTime } from "@/lib/format";
import { Plug, Plus, RefreshCw } from "lucide-react";

const ENTITIES = ["leads", "revenue_entries", "daily_checkins", "tasks", "scripts"] as const;

type Mapping = { id: string; provider: string; entity: string; target_ref: string; field_map: any; updated_at: string };
type Audit = { id: string; provider: string; entity: string | null; outcome: string; detail: string | null; created_at: string };

export default function NotionSetup() {
  const [integration, setIntegration] = useState<any>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [form, setForm] = useState({ entity: "leads", target_ref: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [i, m, a] = await Promise.all([
      supabase.from("integrations").select("*").eq("provider", "Notion").maybeSingle(),
      supabase.from("sync_mappings").select("*").eq("provider", "Notion").order("entity"),
      supabase.from("sync_audit").select("*").eq("provider", "Notion").order("created_at", { ascending: false }).limit(20),
    ]);
    setIntegration(i.data);
    setMappings((m.data as Mapping[]) ?? []);
    setAudits((a.data as Audit[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const status = (integration?.status ?? "Not Connected") as "Connected" | "Not Connected" | "Error";

  const addMapping = async () => {
    if (!form.target_ref) return toast.error("Notion database/page ID required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const { error } = await supabase.from("sync_mappings").upsert({
      user_id: uid, provider: "Notion", entity: form.entity, target_ref: form.target_ref, field_map: {},
    }, { onConflict: "user_id,provider,entity" });
    if (error) return toast.error(error.message);
    toast.success("Mapping saved");
    setForm({ entity: "leads", target_ref: "" });
    load();
  };

  const runNotion = async (action: "verify" | "sync") => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("notion-sync", { body: { action } });
    if (error || data?.error) {
      toast.error(action === "verify" ? "Notion verification failed" : "Notion sync failed", {
        description: data?.error || error?.message || "Review the audit log.",
      });
    } else {
      toast.success(action === "verify" ? "Notion connection verified" : "Notion tasks synced", {
        description: data?.detail,
      });
    }
    setBusy(false);
    load();
  };

  const removeMapping = async (id: string) => {
    await supabase.from("sync_mappings").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Notion Sync"
        description="Set up which Huey entities map to which Notion databases."
        actions={
          <>
            <ConnectionBadge status={status} lastSync={integration?.last_sync_at} />
            <Button size="sm" variant="outline" onClick={() => runNotion("verify")} disabled={busy}>Verify connection</Button>
            <Button size="sm" variant="outline" onClick={() => runNotion("sync")} disabled={busy}><RefreshCw className="h-4 w-4 mr-1.5" />Sync Tasks</Button>
          </>
        }
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="surface p-4 space-y-2">
          <h3 className="font-medium text-sm">Setup checklist</h3>
          <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Create a Notion internal integration and copy the token.</li>
            <li>Add it as <code className="font-mono text-[12px]">NOTION_TOKEN</code> in Project Settings → Secrets.</li>
            <li>Share your Tasks database with the integration.</li>
            <li>Add a tasks mapping below using the Notion data source ID.</li>
            <li>Deploy the <code className="font-mono text-[12px]">notion-sync</code> Edge Function.</li>
            <li>Verify the connection, then sync tasks. Success is reported only after real Notion API responses.</li>
          </ol>
        </div>

        <div className="surface border-gold/40 bg-gold/10 p-4 text-sm">
          <div className="font-medium">Current sync scope: tasks only</div>
          <p className="mt-1 text-muted-foreground">
            The Notion tasks data source must include a title property and a rich-text property named <code className="font-mono">Huey HQ ID</code>. Huey's existing <code className="font-mono">Status</code> and <code className="font-mono">Due Date</code> properties are synchronized when present. Other entity mappings are logged as skipped.
          </p>
        </div>

        <div className="surface p-4">
          <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Plug className="h-4 w-4" />Entity mappings</h3>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Select value={form.entity} onValueChange={(v) => setForm({ ...form, entity: v })}>
              <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Notion data source ID" value={form.target_ref} onChange={(e) => setForm({ ...form, target_ref: e.target.value })} className="flex-1" />
            <Button onClick={addMapping} size="sm"><Plus className="h-4 w-4 mr-1.5" />Save mapping</Button>
          </div>
          {mappings.length === 0 ? (
            <EmptyState icon={Plug} title="No mappings yet" description="Add at least one to enable a targeted sync." />
          ) : (
            <div className="divide-y">
              {mappings.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div><span className="font-medium">{m.entity}</span> <span className="text-muted-foreground">→ {m.target_ref}</span></div>
                  <Button variant="ghost" size="sm" onClick={() => removeMapping(m.id)}>Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface p-4">
          <h3 className="font-medium text-sm mb-3">Audit log</h3>
          {audits.length === 0 ? <div className="text-sm text-muted-foreground">No sync attempts recorded.</div> : (
            <ul className="space-y-2 text-sm">
              {audits.map(a => (
                <li key={a.id} className="flex items-start justify-between gap-3 border-l-2 border-border pl-3">
                  <div>
                    <div className="font-medium">
                      {a.entity ?? "—"} <span className={`text-xs ${a.outcome === "success" ? "text-forest" : a.outcome === "failed" ? "text-destructive" : "text-muted-foreground"}`}>· {a.outcome}</span>
                    </div>
                    {a.detail && <div className="text-xs text-muted-foreground">{a.detail}</div>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{relTime(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
