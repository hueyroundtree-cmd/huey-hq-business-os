// Canonical Daily Driver / CEO Dashboard Notion page.
// Update this constant and the matching Supabase sync_mappings row if Huey moves
// the Daily Driver page; do not hardcode alternate Daily Driver page IDs.
export const DAILY_DRIVER_NOTION_PAGE_ID = "37f0c11a-8316-810c-bc3d-c6b7679c1244";

export const NOTION_ENTITIES = [
  {
    key: "tasks",
    label: "Tasks & Alerts",
    description: "Daily priorities, due dates, proof, and completion state.",
    requiredTitle: "Task",
  },
  {
    key: "leads",
    label: "CRM / Leads",
    description: "Prospects, quotes, bookings, deposits, and follow-ups.",
    requiredTitle: "Name",
  },
  {
    key: "content_items",
    label: "Content Calendar",
    description: "Ideas, hooks, scripts, scheduled dates, and published links.",
    requiredTitle: "Title",
  },
  {
    key: "business_projects",
    label: "Business Projects",
    description: "Projects, owners, priorities, due dates, and next actions.",
    requiredTitle: "Project",
  },
  {
    key: "sops",
    label: "SOP Library",
    description: "Repeatable procedures stored in the Knowledge Vault.",
    requiredTitle: "Title",
  },
  {
    key: "revenue_entries",
    label: "Finance / Money Tracker",
    description: "Verified income records, payment methods, proof, and notes.",
    requiredTitle: "Entry",
  },
  {
    key: "scripts",
    label: "Sales Scripts",
    description: "Great Freight outreach, booking, follow-up, and review scripts.",
    requiredTitle: "Title",
  },
  {
    key: "daily_checkins",
    label: "Daily Driver / CEO Dashboard",
    description: "Morning and evening check-ins, cash snapshots, and notes.",
    requiredTitle: "Check-In",
  },
  {
    key: "ai_commands",
    label: "AI Commands",
    description: "Approved commands organized by executive department.",
    requiredTitle: "Title",
  },
  {
    key: "automations",
    label: "System Status / Automations",
    description: "Agent triggers, run times, status, and proof.",
    requiredTitle: "Agent Name",
  },
] as const;

export type NotionEntityKey = (typeof NOTION_ENTITIES)[number]["key"];

export const notionEntity = (key?: string) =>
  NOTION_ENTITIES.find((entity) => entity.key === key);
