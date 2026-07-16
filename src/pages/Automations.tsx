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
      <div className="p-4 md:p-6">
        {rows.length === 0 ? <EmptyState icon={Zap} title="No automations registered" description="Add the agents, Zapier flows, and cron jobs you actually depend on." action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Register</Button>} />
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
