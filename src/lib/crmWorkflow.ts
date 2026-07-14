import type { LeadStatus } from "@/lib/crmPipeline";

export const CRM_WORKFLOW_STAGES = [
  "New Lead",
  "Ready to Email",
  "Contacted",
  "Waiting Follow-Up",
  "Follow-Up Due",
  "Replied",
  "Quoted",
  "Booked",
  "Completed",
  "Review Requested",
  "Closed/Lost",
] as const;

export type CrmWorkflowStage = (typeof CRM_WORKFLOW_STAGES)[number];

export type WorkflowLead = {
  status: LeadStatus;
  email?: string | null;
  outreach_status?: string | null;
  next_follow_up_at?: string | null;
  zoho_last_reply_at?: string | null;
};

export const WAITING_FOLLOW_UP = "Waiting Follow-Up" as const;

export function getCrmWorkflowStage(lead: WorkflowLead, now = new Date()): CrmWorkflowStage {
  if (lead.status === "Closed/Lost" || lead.outreach_status === "Closed/Lost") return "Closed/Lost";
  if (lead.status === "Completed") return "Completed";
  if (lead.status === "Review Requested") return "Review Requested";
  if (lead.status === "Booked" || lead.outreach_status === "Booked") return "Booked";
  if (lead.status === "Quoted") return "Quoted";
  if (lead.zoho_last_reply_at || lead.outreach_status === "Replied") return "Replied";

  const followUpAt = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) : null;
  if (followUpAt && followUpAt <= now && !["Completed", "Closed/Lost"].includes(lead.status)) return "Follow-Up Due";

  if (
    lead.outreach_status === WAITING_FOLLOW_UP ||
    lead.outreach_status === "Email Sent" ||
    lead.outreach_status === "Text Sent" ||
    Boolean(followUpAt && lead.status === "Contacted")
  ) {
    return "Waiting Follow-Up";
  }

  if (lead.status === "Contacted") return "Contacted";
  if (lead.outreach_status === "Ready to Send" && Boolean(lead.email)) return "Ready to Email";
  return "New Lead";
}

export function isToday(value?: string | null, now = new Date()) {
  if (!value) return false;
  return new Date(value).toDateString() === now.toDateString();
}
