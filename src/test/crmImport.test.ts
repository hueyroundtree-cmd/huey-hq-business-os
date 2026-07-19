import { dryRunLeadImport, findLeadDuplicate } from "@/lib/crmImport";

describe("CRM lead import dry run", () => {
  it("detects duplicate rows and missing contact details without inserting", () => {
    const csv = [
      "Lead ID,Name,Vehicle,Phone,Email,Source,Listing URL",
      "CL-001,Craigslist Seller,Truck,,seller@example.com,Craigslist,",
      "CL-002,Craigslist Seller,Unknown,,,Craigslist,",
      "CL-003,Craigslist Seller,SUV,,seller@example.com,Craigslist,",
    ].join("\n");

    const report = dryRunLeadImport(csv, []);

    expect(report.totalRows).toBe(3);
    expect(report.readyRows).toBe(2);
    expect(report.duplicateRows).toEqual([4]);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, severity: "warning" }),
      expect.objectContaining({ row: 4, severity: "error" }),
    ]));
    expect(report.drafts[0]).toMatchObject({
      source_record_id: "CL-001",
      status: "New Lead",
      lead_type: "Detailing",
    });
  });

  it("explains duplicate matches used by manual create and bulk import", () => {
    expect(findLeadDuplicate(
      { email: " Seller@Example.com ", phone: "(707) 555-0100" },
      [{ email: "seller@example.com", phone: "7075550100" }],
    )).toEqual({ duplicate: true, reasons: ["email", "phone"] });
  });
});
