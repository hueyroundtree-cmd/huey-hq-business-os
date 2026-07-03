import { describe, expect, it } from "vitest";
import { latestTimestamp, stateFromEvidence } from "@/lib/connectionHealth";

describe("connection health evidence", () => {
  it("requires both success and a verification timestamp", () => {
    expect(stateFromEvidence({ succeeded: true })).toBe("Needs Setup");
    expect(stateFromEvidence({ succeeded: true, verifiedAt: "2026-07-02T04:00:00Z" })).toBe("Verified Live");
  });

  it("surfaces the latest error ahead of optimistic status", () => {
    expect(stateFromEvidence({
      succeeded: true,
      verifiedAt: "2026-07-02T04:00:00Z",
      error: "Notion rejected the data source",
    })).toBe("Error");
  });

  it("selects the newest verification timestamp", () => {
    expect(latestTimestamp([
      "2026-07-01T04:00:00Z",
      null,
      "2026-07-02T04:00:00Z",
    ])).toBe("2026-07-02T04:00:00Z");
  });
});
