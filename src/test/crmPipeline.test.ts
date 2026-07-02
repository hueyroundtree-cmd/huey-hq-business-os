import { describe, expect, it } from "vitest";
import { getNextFollowUps, getOpenPipelineValue, type PipelineLead } from "@/lib/crmPipeline";

const lead = (overrides: Partial<PipelineLead>): PipelineLead => ({
  id: "lead", status: "New Lead", estimated_value: 0, next_follow_up_at: null, ...overrides,
});

describe("CRM revenue pipeline", () => {
  it("excludes completed and lost work from open value", () => {
    expect(getOpenPipelineValue([
      lead({ id: "1", estimated_value: 100 }),
      lead({ id: "2", status: "Quoted", estimated_value: 300 }),
      lead({ id: "3", status: "Completed", estimated_value: 500 }),
      lead({ id: "4", status: "Closed/Lost", estimated_value: 900 }),
    ])).toBe(400);
  });

  it("returns five open follow-ups in date order", () => {
    const leads = Array.from({ length: 7 }, (_, index) => lead({
      id: String(index),
      next_follow_up_at: `2026-07-${String(index + 2).padStart(2, "0")}T12:00:00.000Z`,
    }));
    leads[0].status = "Closed/Lost";
    expect(getNextFollowUps(leads).map((item) => item.id)).toEqual(["1", "2", "3", "4", "5"]);
  });
});
