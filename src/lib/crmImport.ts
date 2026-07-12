import { DEFAULT_BUSINESS_UNIT_ID, type LeadStatus, type LeadType } from "@/lib/crmPipeline";

export type ImportLeadDraft = {
  crm_id: string | null;
  name: string;
  business: string | null;
  vehicle: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  source_record_id: string | null;
  source_url: string | null;
  lead_type: LeadType;
  business_unit_id: string;
  status: LeadStatus;
  notes: string | null;
};

export type ImportDryRunIssue = {
  row: number;
  severity: "error" | "warning";
  message: string;
};

export type ImportDryRunReport = {
  totalRows: number;
  readyRows: number;
  duplicateRows: number[];
  issues: ImportDryRunIssue[];
  drafts: ImportLeadDraft[];
};

const splitCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const read = (row: Record<string, string>, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value?.trim()) return value.trim();
  }
  return "";
};

const blankToNull = (value: string) => value.trim() ? value.trim() : null;

export function parseLeadCsv(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

export function dryRunLeadImport(csv: string, existing: Array<Partial<ImportLeadDraft>>): ImportDryRunReport {
  const rows = parseLeadCsv(csv);
  const existingKeys = new Set(
    existing.flatMap((lead) => [
      lead.crm_id ? `crm:${lead.crm_id.toLowerCase()}` : "",
      lead.source_record_id ? `source:${lead.source_record_id.toLowerCase()}` : "",
      lead.email ? `email:${lead.email.toLowerCase()}` : "",
      lead.phone ? `phone:${lead.phone.replace(/\D/g, "")}` : "",
    ].filter(Boolean)),
  );
  const seenKeys = new Set<string>();
  const duplicateRows: number[] = [];
  const issues: ImportDryRunIssue[] = [];

  const drafts = rows.map((row, index): ImportLeadDraft => {
    const rowNumber = index + 2;
    const crmId = blankToNull(read(row, ["crm_id", "crm", "id"]));
    const sourceRecordId = blankToNull(read(row, ["source_record_id", "source_id", "lead_id"]));
    const email = blankToNull(read(row, ["email", "email_address"]));
    const phone = blankToNull(read(row, ["phone", "phone_number"]));
    const vehicle = blankToNull(read(row, ["vehicle", "car", "lead"]));
    const business = blankToNull(read(row, ["business", "company"]));
    const name = read(row, ["name", "customer", "lead_name"]) || business || vehicle || sourceRecordId || crmId || "Unknown";
    const keys = [
      crmId ? `crm:${crmId.toLowerCase()}` : "",
      sourceRecordId ? `source:${sourceRecordId.toLowerCase()}` : "",
      email ? `email:${email.toLowerCase()}` : "",
      phone ? `phone:${phone.replace(/\D/g, "")}` : "",
    ].filter(Boolean);

    if (!phone && !email && !read(row, ["source_url", "url"])) {
      issues.push({ row: rowNumber, severity: "warning", message: "Missing phone, email, and source URL; contact may require manual platform lookup." });
    }
    if (!vehicle && !business) {
      issues.push({ row: rowNumber, severity: "warning", message: "Missing vehicle/business detail." });
    }
    if (keys.some((key) => existingKeys.has(key) || seenKeys.has(key))) {
      duplicateRows.push(rowNumber);
      issues.push({ row: rowNumber, severity: "error", message: "Potential duplicate by CRM ID, source record ID, phone, or email." });
    }
    keys.forEach((key) => seenKeys.add(key));

    return {
      crm_id: crmId,
      name,
      business,
      vehicle,
      phone,
      email,
      source: read(row, ["source"]) || "Craigslist",
      source_record_id: sourceRecordId,
      source_url: blankToNull(read(row, ["source_url", "url"])),
      lead_type: "Detailing",
      business_unit_id: DEFAULT_BUSINESS_UNIT_ID,
      status: "New Lead",
      notes: blankToNull(read(row, ["notes", "note"])),
    };
  });

  const duplicateSet = new Set(duplicateRows);
  return {
    totalRows: drafts.length,
    readyRows: drafts.filter((_, index) => !duplicateSet.has(index + 2)).length,
    duplicateRows,
    issues,
    drafts,
  };
}
