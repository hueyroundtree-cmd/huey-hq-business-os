import type { LeadStatus } from "@/lib/crmPipeline";
import { toPacificDateKey, todayPacificISO } from "@/lib/progress";

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
  id?: string;
  status: LeadStatus;
  email?: string | null;
  outreach_status?: string | null;
  next_follow_up_at?: string | null;
  zoho_last_reply_at?: string | null;
  last_contact_at?: string | null;
  contact_date?: string | null;
  email_sent_at?: string | null;
  text_sent_at?: string | null;
  zoho_last_sent_at?: string | null;
  booking_at?: string | null;
  updated_at?: string | null;
};

export type WorkflowActivity = {
  lead_id?: string | null;
  title?: string | null;
  detail?: string | null;
  event_type?: string | null;
  kind?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
};

export type CrmDailyKpi = "contacted_today" | "followups_completed_today" | "replies_today" | "bookings_today";

export type CrmDailySummary = Record<"contacted" | "followupsCompleted" | "replies" | "bookings", number>;

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

export function isToday(value?: string | null, day = todayPacificISO()) {
  return Boolean(value && toPacificDateKey(value) === day);
}

const activityText = (activity: WorkflowActivity) =>
  `${activity.title ?? ""} ${activity.kind ?? ""} ${activity.event_type ?? ""} ${activity.detail ?? ""}`.toLowerCase();

const activityDate = (activity: WorkflowActivity) => activity.occurred_at ?? activity.created_at ?? null;

export function getFollowUpCompletedLeadIds(activities: WorkflowActivity[], day = todayPacificISO()) {
  return new Set(activities
    .filter((activity) => isToday(activityDate(activity), day))
    .filter((activity) => /follow[- ]?up/.test(activityText(activity)))
    .map((activity) => activity.lead_id)
    .filter(Boolean) as string[]);
}

export function leadWasContactedToday(lead: WorkflowLead, day = todayPacificISO()) {
  return [
    lead.last_contact_at,
    lead.contact_date,
    lead.email_sent_at,
    lead.text_sent_at,
    lead.zoho_last_sent_at,
  ].some((date) => isToday(date, day));
}

export function leadRepliedToday(lead: WorkflowLead, day = todayPacificISO()) {
  return isToday(lead.zoho_last_reply_at, day) || (lead.outreach_status === "Replied" && isToday(lead.updated_at, day));
}

export function leadBookedToday(lead: WorkflowLead, day = todayPacificISO()) {
  return (lead.status === "Booked" || lead.outreach_status === "Booked") && [lead.booking_at, lead.updated_at].some((date) => isToday(date, day));
}

export function getCrmDailySummary(leads: WorkflowLead[], activities: WorkflowActivity[], day = todayPacificISO()): CrmDailySummary {
  const followUpCompletedLeadIds = getFollowUpCompletedLeadIds(activities, day);
  return {
    contacted: leads.filter((lead) => leadWasContactedToday(lead, day)).length,
    followupsCompleted: followUpCompletedLeadIds.size,
    replies: leads.filter((lead) => leadRepliedToday(lead, day)).length,
    bookings: leads.filter((lead) => leadBookedToday(lead, day)).length,
  };
}

export function matchesCrmDailyKpi(lead: WorkflowLead, kpi: CrmDailyKpi | "all", activities: WorkflowActivity[], day = todayPacificISO()) {
  if (kpi === "all") return true;
  if (kpi === "contacted_today") return leadWasContactedToday(lead, day);
  if (kpi === "followups_completed_today") return Boolean(lead.id && getFollowUpCompletedLeadIds(activities, day).has(lead.id));
  if (kpi === "replies_today") return leadRepliedToday(lead, day);
  if (kpi === "bookings_today") return leadBookedToday(lead, day);
  return true;
}
