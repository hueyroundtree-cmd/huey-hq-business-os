import { describe, expect, it } from "vitest";
import { getNotionHealth, type NotionMappingHealth } from "@/lib/dashboard";

const mapping = (lastSync: string): NotionMappingHealth => ({
  entity: "leads",
  status: "Verified Live",
  verified_at: lastSync,
  last_sync_at: lastSync,
  last_error: null,
});

describe("Notion connection freshness", () => {
  it("does not call a months-old sync verified live", () => {
    const result = getNotionHealth(
      [mapping("2026-07-15T12:00:00.000Z")],
      new Date("2026-11-16T20:00:00.000Z"),
    );
    expect(result.status).toBe("Error");
    expect(result.connectedCount).toBe(0);
    expect(result.staleCount).toBe(1);
  });

  it("accepts current run evidence", () => {
    const result = getNotionHealth(
      [mapping("2026-11-16T12:00:00.000Z")],
      new Date("2026-11-16T20:00:00.000Z"),
    );
    expect(result.connectedCount).toBe(1);
    expect(result.staleCount).toBe(0);
  });
});
