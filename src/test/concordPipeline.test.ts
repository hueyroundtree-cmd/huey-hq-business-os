import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Concord prospect pipeline import migration", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/20260711200000_import_concord_prospect_pipeline.sql"),
    "utf8",
  );

  it("backs up leads before importing and avoids destructive operations", () => {
    expect(migration).toContain("crm_backup_before_concord_20260711");
    expect(migration).not.toMatch(/\bDELETE\b/i);
    expect(migration).not.toMatch(/\bDROP\b/i);
    expect(migration).not.toMatch(/\bTRUNCATE\b/i);
  });

  it("contains all 20 Concord lead IDs and the existing CRM pipeline defaults", () => {
    const ids = migration.match(/'L-\d{3}'/g) ?? [];
    expect(new Set(ids).size).toBe(20);
    expect(migration).toContain("'Concord Professional Outreach'");
    expect(migration).toContain("'Detailing'");
    expect(migration).toContain("'New Lead'");
    expect(migration).toContain("estimated_value");
  });

  it("deduplicates by email, phone, and business plus contact name", () => {
    expect(migration).toContain("lower(l.email) = lower(p.email)");
    expect(migration).toContain("regexp_replace(COALESCE(l.phone");
    expect(migration).toContain("lower(COALESCE(l.business, '')) = lower(p.business_name)");
    expect(migration).toContain("lower(COALESCE(l.name, '')) = lower(p.contact_name)");
  });
});
