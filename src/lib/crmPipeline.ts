export const LEAD_STATUSES = [
  "New Lead", "Contacted", "Quoted", "Booked", "Completed", "Review Requested", "Closed/Lost",
] as const;

export const LEAD_TYPES = ["Detailing", "Logistics", "Dealer/Fleet"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadType = (typeof LEAD_TYPES)[number];

export type PipelineLead = {
  id: string;
  status: LeadStatus;
  estimated_value: number | null;
  next_follow_up_at: string | null;
};

export const isOpenLead = (lead: PipelineLead) =>
  !["Completed", "Closed/Lost"].includes(lead.status);

export const getOpenPipelineValue = (leads: PipelineLead[]) =>
  leads.filter(isOpenLead).reduce((total, lead) => total + Number(lead.estimated_value ?? 0), 0);

export const getNextFollowUps = <T extends PipelineLead>(leads: T[], limit = 5) =>
  leads
    .filter((lead) => lead.next_follow_up_at && isOpenLead(lead))
    .sort((a, b) => String(a.next_follow_up_at).localeCompare(String(b.next_follow_up_at)))
    .slice(0, limit);
