import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const PROVIDERS: { key: string; blurb: string; docs: string[] }[] = [
  { key: "Notion", blurb: "Verified sync for ten Huey HQ operating areas.", docs: ["Reads: only data sources you share.", "Writes: duplicate-safe rows using Huey HQ ID."] },
  { key: "Google Drive", blurb: "Attach receipts, thumbnails, SOPs from Drive.", docs: ["Read files/folders you allow.", "Write only when you upload from Huey."] },
  { key: "Google Calendar", blurb: "Push jobs and bookings to your calendar.", docs: ["Read events on selected calendars.", "Write jobs as events."] },
  { key: "Gmail", blurb: "Send follow-ups via Gmail from your account.", docs: ["Read: none.", "Write: send drafts you approve."] },
  { key: "Zoho Mail", blurb: "Alternative to Gmail.", docs: ["Send follow-ups via Zoho."] },
  { key: "Shopify", blurb: "Pull orders into Revenue.", docs: ["Read orders & payouts.", "No writes."] },
  { key: "Stan Store", blurb: "Pull sales into Revenue.", docs: ["Read sales.", "No writes."] },
  { key: "Square", blurb: "Pull payments into Revenue.", docs: ["Read transactions & payouts.", "No writes."] },
  { key: "Google Business Profile", blurb: "Track reviews and messages.", docs: ["Read reviews.", "No writes yet."] },
];

type Integration = { id?: string; provider: string; status: "Not Connected" | "Connected" | "Error"; last_sync_at: string | null; last_error: string | null; config: any };

export default function Integrations() {
  const [rows, setRows] = useState<Record<string, Integration>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ token: string; db_id: string; page_id: string; notes: string }>({ token: "", db_id: "", page_id: "", notes: "" });

  const load = async () => {
    const { data } = await supabase.from("integrations").select("*");
    const map: Record<string, Integration> = {};
    (data ?? []).forEach((r: any) => (map[r.provider] = r));
    setRows(map);
  };
  useEffect(() => { load(); }, []);

  const openSetup = (provider: string) => {
    setOpen(provider);
    const existing = rows[provider];
    setDetail({
      token: "",
      db_id: existing?.config?.database_id ?? "",
      page_id: existing?.config?.page_id ?? "",
      notes: existing?.config?.notes ?? "",
    });
  };

  const saveConfig = async () => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const provider = open!;
    const existing = rows[provider];
    const cfg: any = { database_id: detail.db_id || null, page_id: detail.page_id || null, notes: detail.notes || null };
    // Never store secrets client-side. If the user provided a token, tell them how to add it as a secret server-side.
    if (detail.token) cfg.token_status = "pending_secret";
    const payload = {
      user_id: uid, provider,
      status: "Not Connected" as const,
      config: cfg,
    };
    const res = existing?.id
      ? await supabase.from("integrations").update({ config: cfg }).eq("id", existing.id)
      : await supabase.from("integrations").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Configuration saved. Status stays Not Connected until an authorized backend token is added.");
    setOpen(null); load();
  };

  return (
    <div>
      <PageHeader title="Integration Center" description="Nothing is connected until you finish authorization. Nothing is faked." />
      <div className="p-4 md:p-6 space-y-4">
        <div className="surface p-3 border-warning/30 bg-warning/5 text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            Tokens for third-party services are stored server-side as project secrets, never in your browser. This first release provides a secure setup screen and configuration checklist. Live OAuth handshakes will be added service-by-service; until then, each integration stays honestly labeled Not Connected.
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {PROVIDERS.map(p => {
            const rec = rows[p.key];
            const status = (rec?.status ?? "Not Connected") as "Connected" | "Not Connected" | "Error";
            return (
              <div key={p.key} className="surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{p.key}</div>
                    <div className="text-xs text-muted-foreground">{p.blurb}</div>
                  </div>
                  <ConnectionBadge status={status} lastSync={rec?.last_sync_at} />
                </div>
                <ul className="mt-3 text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                  {p.docs.map(d => <li key={d}>{d}</li>)}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openSetup(p.key)}>Configure</Button>
                  {p.key === "Notion" && <Link to="/integrations/notion" className="text-xs underline underline-offset-2 self-center">Manage Notion connections</Link>}
                </div>
                {rec?.last_error && <div className="mt-2 text-[11px] text-destructive">Last error: {rec.last_error}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {open}</DialogTitle>
            <DialogDescription>Saves your mapping. Tokens must be added to project secrets by an admin — never entered in the browser.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {open === "Notion" && (
              <>
                <div><Label className="text-xs">Notion Database ID (CRM)</Label><Input value={detail.db_id} onChange={(e) => setDetail({ ...detail, db_id: e.target.value })} /></div>
                <div><Label className="text-xs">Notion Page ID (workspace root)</Label><Input value={detail.page_id} onChange={(e) => setDetail({ ...detail, page_id: e.target.value })} /></div>
              </>
            )}
            <div><Label className="text-xs">Notes for this integration</Label><Textarea rows={2} value={detail.notes} onChange={(e) => setDetail({ ...detail, notes: e.target.value })} /></div>
            <div className="text-[11px] text-muted-foreground border-l-2 border-border pl-2">
              Secret token setup: add <code className="font-mono">{open?.toUpperCase().split(" ").join("_")}_TOKEN</code> in Project Settings → Secrets. Status flips to Connected only after a live API response.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={saveConfig}>Save configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
