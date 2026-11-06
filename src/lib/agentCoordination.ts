/** Huey HQ agent coordination policy.
 * This module defines routing and permission checks; it does not execute external actions.
 */
export type Department = "executive" | "revenue" | "marketing" | "finance" | "operations" | "technology" | "administration";
export type AgentAction = "research" | "draft" | "organize" | "internal_update" | "client_contact" | "publish" | "spend" | "transfer" | "trade" | "external_commitment" | "change_settings" | "delete";
export type TaskStatus = "inbox" | "assigned" | "working" | "awaiting_approval" | "verified_complete" | "blocked";

export interface AgentDefinition {
  id: string;
  name: string;
  department: Department;
  responsibilities: readonly string[];
  status: "existing" | "planned";
}
export interface DelegatedTask {
  id: string;
  source: string;
  title: string;
  department: Department;
  assignedAgentId: string;
  status: TaskStatus;
  action: AgentAction;
  evidenceUrl?: string;
  approvedByOwner?: boolean;
}

export const AGENTS: readonly AgentDefinition[] = [
  { id: "ceo", name: "CEO / Chief of Staff", department: "executive", responsibilities: ["intake", "prioritization", "delegation", "reporting"], status: "existing" },
  { id: "sales", name: "Sales", department: "revenue", responsibilities: ["lead qualification", "follow-up drafts", "quotes"], status: "existing" },
  { id: "detailing", name: "Detailing", department: "operations", responsibilities: ["service planning", "job readiness", "detailing leads"], status: "existing" },
  { id: "content", name: "Content", department: "marketing", responsibilities: ["short-form scripts", "content planning"], status: "existing" },
  { id: "youtube", name: "YouTube", department: "marketing", responsibilities: ["video planning"], status: "existing" },
  { id: "thumbnail", name: "Thumbnail", department: "marketing", responsibilities: ["creative drafts"], status: "existing" },
  { id: "finance", name: "Finance", department: "finance", responsibilities: ["budgets", "cash tracking", "risk reporting"], status: "existing" },
  { id: "research", name: "Research", department: "finance", responsibilities: ["market research", "source validation"], status: "existing" },
  { id: "operations", name: "Operations", department: "operations", responsibilities: ["shop readiness", "service SOPs"], status: "existing" },
  { id: "logistics", name: "Logistics", department: "operations", responsibilities: ["courier planning", "logistics research"], status: "existing" },
  { id: "accountability", name: "Accountability", department: "administration", responsibilities: ["evidence checks", "daily scorecard"], status: "existing" },
];

export const APPROVAL_REQUIRED: readonly AgentAction[] = [
  "client_contact", "publish", "spend", "transfer", "trade", "external_commitment", "change_settings", "delete",
];

export function requiresOwnerApproval(action: AgentAction): boolean {
  return APPROVAL_REQUIRED.includes(action);
}

/** Classifies requests for draft routing; ambiguous requests go to the Chief of Staff. */
export function routeTask(description: string): { department: Department; agentId: string } {
  const input = description.toLowerCase();
  if (/client|lead|follow.up|quote|booking|customer/.test(input)) return { department: "revenue", agentId: "sales" };
  if (/video|short|youtube|thumbnail|content|post/.test(input)) return { department: "marketing", agentId: "content" };
  if (/stock|bitcoin|option|brokerage|budget|cash|expense|finance|trade/.test(input)) return { department: "finance", agentId: "finance" };
  if (/detail|barber|shop|courier|logistics|vehicle|job/.test(input)) return { department: "operations", agentId: "operations" };
  if (/app|code|github|bug|integration|software/.test(input)) return { department: "technology", agentId: "ceo" };
  if (/calendar|schedule|report|accountability|document/.test(input)) return { department: "administration", agentId: "accountability" };
  return { department: "executive", agentId: "ceo" };
}

/** Prevents false completion and unapproved external actions. */
export function canTransitionTask(task: DelegatedTask, next: TaskStatus): boolean {
  if (next === "verified_complete" && !task.evidenceUrl) return false;
  if (requiresOwnerApproval(task.action) && !task.approvedByOwner) {
    return next !== "verified_complete" && next !== "working";
  }
  return true;
}
