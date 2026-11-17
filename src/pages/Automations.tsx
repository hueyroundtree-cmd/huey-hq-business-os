import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { toast } from "sonner";
import { Zap, Plus } from "lucide-react";
import { relTime } from "@/lib/format";

const STATUSES = ["Not Connected","Active","Paused","Error"] as const;
type Auto = { id: string; agent_name: string; owner: string | null; trigger: string | null; platform: string | null; last_run_at: string | null; next_run_at: string | null; status: typeof STATUSES[number]; proof: string | null };

const REQUIRED_SYSTEMS = [
  { name: "Daily Notion refresh", owner: "Operations", trigger: "Daily · Pacific time", status: "Needs Setup" },
  { name: "Lead follow-up reminders", owner: "Sales", trigger: "Manual review before outreach", status: "Manual Only" },
  { name: "Revenue proof check", owner: "Finance", trigger: "After revenue is logged", status: "Manual Only" },
  { name: "Morning operating briefing", owner: "CEO", trigger: "Start My Day", status: "Manual Only" },
];

export default function Automations() {
  const [rows, setRows] = useState<Auto[]>([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ agent_name: "", owner: "", trigger: "", platform: "", status: "Not Connected" });

  const load = async () => {
    const { data } = await supabase.from("automations").select("*").order("updated_at", { ascending: false });
    setRows((data as Auto[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!f.agent_name) return toast.error("Agent name required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const { error } = await supabase.from("automations").insert({ ...f, user_id: uid });
    if (error) return toast.error(error.message);
    toast.success("Registered");
    setOpen(false); setF({ agent_name: "", owner: "", trigger: "", platform: "", status: "Not Connected" }); load();
  };

  return (
    <div>
      <PageHeader title="Automation Monitor" description="Register the agents you rely on. Runs must be proven, never fabricated."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Register</Button>} />
      <div className="p-4 md:p-6 space-y-4">
        {rows.length === 0 && (
          <div className="surface border-gold/40 bg-gold/10 p-4">
            <div className="font-medium">Automation registry recovered</div>
            <p className="mt-1 text-sm text-muted-foreground">These required systems are visible now, but none are labeled live without current run proof.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {REQUIRED_SYSTEMS.map((system) => (
                <div key={system.name} className="rounded-md border border-border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-sm font-medium">{system.name}</div><div className="text-xs text-muted-foreground">{system.owner} · {system.trigger}</div></div>
                    <ConnectionBadge status={system.status as "Needs Setup" | "Manual Only"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {rows.length === 0 ? <EmptyState icon={Zap} title="No live automations registered" description="Register a workflow only after its owner, trigger, permissions and run proof are known." action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Register</Button>} />
          : (
            <div className="surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="text-left px-3 py-2">Agent</th><th className="text-left px-3 py-2">Platform</th><th className="text-left px-3 py-2">Trigger</th><th className="text-left px-3 py-2">Last run</th><th className="text-left px-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.agent_name}</div>
                        {r.owner && <div className="text-xs text-muted-foreground">{r.owner}</div>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.platform ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.trigger ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.last_run_at ? relTime(r.last_run_at) : "never"}</td>
                      <td className="px-3 py-2"><ConnectionBadge status={r.status === "Active" ? "Verified Live" : r.status === "Error" ? "Error" : "Needs Setup"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Register automation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Agent name</Label><Input value={f.agent_name} onChange={(e) => setF({ ...f, agent_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Owner</Label><Input value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></div>
              <div><Label className="text-xs">Platform</Label><Input value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} placeholder="Zapier, n8n…" /></div>
            </div>
            <div><Label className="text-xs">Trigger</Label><Input value={f.trigger} onChange={(e) => setF({ ...f, trigger: e.target.value })} placeholder="Cron, webhook…" /></div>
            <div><Label className="text-xs">Status</Label>
              <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Register</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
