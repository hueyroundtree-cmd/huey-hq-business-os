import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGENTS, routeTask, requiresOwnerApproval, type DelegatedTask, type AgentAction } from "@/lib/agentCoordination";

const ACTIONS: AgentAction[] = ["research", "draft", "organize", "internal_update", "client_contact", "publish", "spend", "transfer", "trade", "external_commitment", "change_settings", "delete"];

export default function AgentControlCenter() {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<AgentAction>("draft");
  const [tasks, setTasks] = useState<DelegatedTask[]>([]);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  // agent_tasks is created by the accompanying migration. Refresh generated Supabase types after deployment.
  const taskDb = supabase as unknown as { from: (table: string) => any };
  const refresh = async () => {
    if (!user) return;
    const result = await taskDb.from("agent_tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    if (result.error) { setError(result.error.message); return; }
    setError(null);
    setTasks((result.data ?? []).map((item: any) => ({
      id: item.id, source: item.source, title: item.title, department: item.department,
      assignedAgentId: item.assigned_agent_id, status: item.status, action: item.action,
      evidenceUrl: item.evidence_url, approvedByOwner: item.approved_by_owner,
    })));
  };
  useEffect(() => { void refresh(); }, [user?.id]);
  const addTask = async () => {
    if (!user || !description.trim()) return;
    const route = routeTask(description.trim());
    const result = await taskDb.from("agent_tasks").insert({
      user_id: user.id, title: description.trim(), source: "manual",
      department: route.department, assigned_agent_id: route.agentId, action,
      status: requiresOwnerApproval(action) ? "awaiting_approval" : "assigned",
    });
    if (result.error) return toast.error(result.error.message);
    setDescription("");
    await refresh();
  };
  const approve = async (id: string) => {
    if (!user) return;
    const result = await taskDb.from("agent_tasks").update({ approved_by_owner: true, status: "assigned" }).eq("id", id).eq("user_id", user.id);
    if (result.error) toast.error(result.error.message);
    else await refresh();
  };
  const submitEvidence = async (id: string) => {
    if (!user || !evidence[id]?.trim()) return;
    const task = tasks.find((item) => item.id === id);
    if (!task || (requiresOwnerApproval(task.action) && !task.approvedByOwner)) return;
    const result = await taskDb.from("agent_tasks").update({ evidence_url: evidence[id].trim(), status: "working" }).eq("id", id).eq("user_id", user.id);
    if (result.error) toast.error(result.error.message);
    else await refresh();
  };

  return (
    <div>
      <PageHeader title="Agent Control Center" description="Manage saved task assignments and approvals. No real agent actions are executed." />
      <div className="p-4 md:p-6 space-y-5">
        <div className="surface p-4 space-y-3">
          <h2 className="font-medium">Chief of Staff intake — preview</h2>
          <p className="text-xs text-muted-foreground">Tasks persist in Supabase. Approval records permission only: no messages, trades, purchases or publishing are executed. Evidence submissions are not independent verification.</p>
          <Label htmlFor="agent-task">Task request</Label>
          <Input id="agent-task" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Example: draft a client follow-up" />
          <Label htmlFor="agent-action">Requested action</Label>
          <select id="agent-action" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(e) => setAction(e.target.value as AgentAction)}>
            {ACTIONS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}{requiresOwnerApproval(item) ? " — approval required" : ""}</option>)}
          </select>
          <Button onClick={addTask} disabled={!description.trim() || !user}>Save assignment</Button>
          {error && <p role="alert" className="text-xs text-destructive">Task storage unavailable: {error}. Apply the migration first.</p>}
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AGENTS.map((agent) => <div className="surface p-4 space-y-1" key={agent.id}>
            <div className="text-sm font-medium">{agent.name}</div>
            <div className="text-xs capitalize text-muted-foreground">{agent.department}</div>
            <p className="text-xs text-muted-foreground">{agent.responsibilities.join(" · ")}</p>
            <div className="text-[11px] text-muted-foreground">Roster definition — runtime connection not verified</div>
          </div>)}
        </div>
        <div className="surface p-4 space-y-3">
          <h2 className="font-medium">Task queue — saved assignments and reported work</h2>
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">No saved assignments yet. Claude report rows appear here once loaded with your signed-in account.</p>}
          {tasks.map((task) => <div key={task.id} className="border rounded-md p-3 space-y-2">
            <div className="font-medium text-sm">{task.title}</div>
            <div className="text-xs text-muted-foreground">Assigned: {AGENTS.find((a) => a.id === task.assignedAgentId)?.name ?? task.assignedAgentId} · {task.department} · {task.status.replaceAll("_", " ")}{task.evidenceUrl ? " · evidence submitted (not independently verified)" : " · no evidence"}</div>
            {requiresOwnerApproval(task.action) && !task.approvedByOwner && <Button size="sm" variant="outline" onClick={() => approve(task.id)}>Record approval (no execution)</Button>}
            {task.status !== "verified_complete" && <div className="space-y-2">
              <Label htmlFor={`evidence-${task.id}`}>Evidence URL or reference</Label>
              <Input id={`evidence-${task.id}`} value={evidence[task.id] ?? ""} onChange={(e) => setEvidence((current) => ({ ...current, [task.id]: e.target.value }))} placeholder="Verified work reference" />
              <Button size="sm" variant="outline" disabled={!evidence[task.id]?.trim() || (requiresOwnerApproval(task.action) && !task.approvedByOwner)} onClick={() => submitEvidence(task.id)}>Submit evidence for review (not verified)</Button>
            </div>}
          </div>)}
        </div>
      </div>
    </div>
  );
}
