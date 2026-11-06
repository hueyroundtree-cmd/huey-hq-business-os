import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGENTS, routeTask, requiresOwnerApproval, type DelegatedTask, type AgentAction } from "@/lib/agentCoordination";

const ACTIONS: AgentAction[] = ["research", "draft", "organize", "internal_update", "client_contact", "publish", "spend", "transfer", "trade", "external_commitment", "change_settings", "delete"];

export default function AgentControlCenter() {
  const [description, setDescription] = useState("");
  const [action, setAction] = useState<AgentAction>("draft");
  const [tasks, setTasks] = useState<DelegatedTask[]>([]);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const addTask = () => {
    const title = description.trim();
    if (!title) return;
    const route = routeTask(title);
    setTasks((current) => [{
      id: crypto.randomUUID(), source: "manual preview", title,
      department: route.department, assignedAgentId: route.agentId,
      status: requiresOwnerApproval(action) ? "awaiting_approval" : "assigned", action,
    }, ...current]);
    setDescription("");
  };
  const approve = (id: string) => setTasks((current) => current.map((task) =>
    task.id === id ? { ...task, approvedByOwner: true, status: "assigned" } : task));
  const markComplete = (id: string) => setTasks((current) => current.map((task) =>
    task.id === id && evidence[id]?.trim() && (!requiresOwnerApproval(task.action) || task.approvedByOwner)
      ? { ...task, evidenceUrl: evidence[id].trim(), status: "verified_complete" } : task));

  return (
    <div>
      <PageHeader title="Agent Control Center" description="Preview routing and approvals. Tasks on this screen are temporary and do not trigger real agent actions." />
      <div className="p-4 md:p-6 space-y-5">
        <div className="surface p-4 space-y-3">
          <h2 className="font-medium">Chief of Staff intake — preview</h2>
          <p className="text-xs text-muted-foreground">No messages are sent, trades placed, content published, or database records written. Tasks disappear on refresh until backend storage is implemented.</p>
          <Label htmlFor="agent-task">Task request</Label>
          <Input id="agent-task" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Example: draft a client follow-up" />
          <Label htmlFor="agent-action">Requested action</Label>
          <select id="agent-action" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={action} onChange={(e) => setAction(e.target.value as AgentAction)}>
            {ACTIONS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}{requiresOwnerApproval(item) ? " — approval required" : ""}</option>)}
          </select>
          <Button onClick={addTask} disabled={!description.trim()}>Preview assignment</Button>
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
          <h2 className="font-medium">Task queue — local preview only</h2>
          {tasks.length === 0 && <p className="text-sm text-muted-foreground">No preview tasks. Add a task above to see routing and approval requirements.</p>}
          {tasks.map((task) => <div key={task.id} className="border rounded-md p-3 space-y-2">
            <div className="font-medium text-sm">{task.title}</div>
            <div className="text-xs text-muted-foreground">Assigned: {AGENTS.find((a) => a.id === task.assignedAgentId)?.name} · {task.department} · {task.status.replaceAll("_", " ")}</div>
            {requiresOwnerApproval(task.action) && !task.approvedByOwner && <Button size="sm" variant="outline" onClick={() => approve(task.id)}>Approve preview action (no execution)</Button>}
            {task.status !== "verified_complete" && <div className="space-y-2">
              <Label htmlFor={`evidence-${task.id}`}>Evidence URL or reference</Label>
              <Input id={`evidence-${task.id}`} value={evidence[task.id] ?? ""} onChange={(e) => setEvidence((current) => ({ ...current, [task.id]: e.target.value }))} placeholder="Verified work reference" />
              <Button size="sm" variant="outline" disabled={!evidence[task.id]?.trim() || (requiresOwnerApproval(task.action) && !task.approvedByOwner)} onClick={() => markComplete(task.id)}>Mark verified (preview)</Button>
            </div>}
          </div>)}
        </div>
      </div>
    </div>
  );
}
