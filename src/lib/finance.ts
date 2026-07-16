import { addDaysISO } from "@/lib/format";

export const INCOME_LANES = ["Detailing", "Logistics", "Shopify", "Stan Store", "Gig Work", "Content", "Investing", "Other"] as const;
export type IncomeLane = typeof INCOME_LANES[number];

export type RevenueEntryRow = {
  id: string;
  entry_date: string;
  source: string | null;
  stream: string | null;
  income_lane: string | null;
  amount: number | string | null;
  gross_amount: number | string | null;
  available_amount: number | string | null;
  payment_method: string | null;
  proof_url: string | null;
  notes: string | null;
  week_start: string | null;
  month_start: string | null;
};

export type FinanceEntry = {
  id: string;
  date: string;
  source: string;
  grossAmount: number;
  availableAmount: number;
  incomeLane: string;
  week: string;
  month: string;
  proofUrl: string | null;
  notes: string | null;
};

export const FINANCE_SELECT =
  "id,entry_date,source,stream,income_lane,amount,gross_amount,available_amount,payment_method,proof_url,notes,week_start,month_start";

export function weekStartISO(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  return addDaysISO(dateKey, -diff);
}

export function monthStartISO(dateKey: string) {
  return `${dateKey.slice(0, 8)}01`;
}

const numeric = (value: number | string | null | undefined) => Number(value ?? 0);

export function normalizeFinanceEntry(row: RevenueEntryRow): FinanceEntry {
  const availableAmount = numeric(row.available_amount ?? row.amount ?? row.gross_amount);
  const grossAmount = numeric(row.gross_amount ?? row.amount ?? row.available_amount);
  const incomeLane = row.income_lane || row.stream || "Other";
  return {
    id: row.id,
    date: row.entry_date,
    source: row.source || row.payment_method || incomeLane,
    grossAmount,
    availableAmount,
    incomeLane,
    week: row.week_start || weekStartISO(row.entry_date),
    month: row.month_start || monthStartISO(row.entry_date),
    proofUrl: row.proof_url,
    notes: row.notes,
  };
}

export function isGigIncome(entry: FinanceEntry) {
  const value = `${entry.source} ${entry.incomeLane}`.toLowerCase();
  return ["gig work", "doordash", "instacart", "uber", "lyft"].some((needle) => value.includes(needle));
}

export function totalAvailableGigIncome(entries: FinanceEntry[]) {
  return entries.filter(isGigIncome).reduce((sum, entry) => sum + entry.availableAmount, 0);
}
