import { describe, expect, it } from "vitest";
import { normalizeFinanceEntry, totalAvailableGigIncome, type RevenueEntryRow } from "@/lib/finance";

const row = (overrides: Partial<RevenueEntryRow>): RevenueEntryRow => ({
  id: crypto.randomUUID(),
  entry_date: "2026-07-16",
  source: null,
  stream: "Gig Work",
  income_lane: null,
  amount: 0,
  gross_amount: null,
  available_amount: null,
  payment_method: null,
  proof_url: null,
  notes: null,
  week_start: null,
  month_start: null,
  ...overrides,
});

describe("finance entry normalization", () => {
  it("stores and displays the structured finance fields", () => {
    expect(normalizeFinanceEntry(row({
      source: "DoorDash",
      gross_amount: 55,
      available_amount: 55,
      income_lane: "Gig Work",
      week_start: "2026-07-13",
      month_start: "2026-07-01",
      proof_url: "https://example.com/proof",
      notes: "Payout screenshot uploaded.",
    }))).toMatchObject({
      source: "DoorDash",
      date: "2026-07-16",
      grossAmount: 55,
      availableAmount: 55,
      incomeLane: "Gig Work",
      week: "2026-07-13",
      month: "2026-07-01",
      proofUrl: "https://example.com/proof",
      notes: "Payout screenshot uploaded.",
    });
  });

  it("falls back to old revenue amount and stream fields without losing totals", () => {
    expect(normalizeFinanceEntry(row({
      stream: "Detailing",
      amount: 100,
      payment_method: "Square",
    }))).toMatchObject({
      source: "Square",
      grossAmount: 100,
      availableAmount: 100,
      incomeLane: "Detailing",
      week: "2026-07-13",
      month: "2026-07-01",
    });
  });

  it("verifies the current available gig income records total $120.99", () => {
    const entries = [
      normalizeFinanceEntry(row({ source: "DoorDash", gross_amount: 55, available_amount: 55, income_lane: "Gig Work" })),
      normalizeFinanceEntry(row({ source: "Instacart", gross_amount: 65.99, available_amount: 65.99, income_lane: "Gig Work" })),
    ];

    expect(totalAvailableGigIncome(entries)).toBe(120.99);
  });
});
