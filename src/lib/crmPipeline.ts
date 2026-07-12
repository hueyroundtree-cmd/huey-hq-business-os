export const LEAD_STATUSES = [
  "New Lead", "Contacted", "Quoted", "Booked", "Completed", "Review Requested", "Closed/Lost",
] as const;

export const LEAD_TYPES = ["Detailing", "Logistics", "Dealer/Fleet"] as const;

export const DEFAULT_BUSINESS_UNIT_ID = "11111111-1111-4111-8111-111111111111";

export const BUSINESS_UNITS = [
  { id: DEFAULT_BUSINESS_UNIT_ID, name: "Great Freight Mobile Detailing" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Great Freight Logistics" },
  { id: "33333333-3333-4333-8333-333333333333", name: "Dispatch" },
  { id: "44444444-4444-4444-8444-444444444444", name: "Content & Brand Deals" },
  { id: "55555555-5555-4555-8555-555555555555", name: "Digital Products" },
  { id: "66666666-6666-4666-8666-666666666666", name: "Shopify" },
  { id: "77777777-7777-4777-8777-777777777777", name: "Stan Store" },
  { id: "88888888-8888-4888-8888-888888888888", name: "Future Trucking" },
  { id: "99999999-9999-4999-8999-999999999999", name: "Consulting" },
] as const;

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
