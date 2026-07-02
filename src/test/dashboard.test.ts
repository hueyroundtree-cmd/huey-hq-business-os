import { describe, expect, it } from "vitest";
import {
  buildDailyPlanPayload,
  getDailyDriverScore,
  getNotionHealth,
  type NotionMappingHealth,
} from "@/lib/dashboard";
import { NOTION_ENTITIES } from "@/lib/notionEntities";

const mapping = (
  entity: NotionMappingHealth["entity"],
  overrides: Partial<NotionMappingHealth> = {},
): NotionMappingHealth => ({
  entity,
  status: "Connected",
  last_sync_at: "2026-07-01T12:00:00.000Z",
  last_error: null,
  verified_at: "2026-07-01T11:59:00.000Z",
  ...overrides,
});

describe("CEO Dashboard Notion health", () => {
  it("reports Connected only when every area has live verification", () => {
    const mappings = NOTION_ENTITIES.map((entity) => mapping(entity.key));
    expect(getNotionHealth(mappings)).toMatchObject({
      status: "Connected",
      connectedCount: 10,
    });
  });

  it("does not treat a placeholder status as a connection", () => {
    const mappings = NOTION_ENTITIES.map((entity) => mapping(entity.key));
    mappings[4] = mapping(mappings[4].entity, { verified_at: null });
    expect(getNotionHealth(mappings)).toMatchObject({
      status: "Not Connected",
      connectedCount: 9,
    });
  });

  it("surfaces a mapping error above partial connection state", () => {
    const mappings = [mapping("tasks", { status: "Error", last_error: "Unauthorized" })];
    expect(getNotionHealth(mappings).status).toBe("Error");
  });
});

describe("Daily Driver scorecard", () => {
  it("scores three top tasks and five action lanes", () => {
    expect(getDailyDriverScore(
      [true, true, false],
      [true, true, true, false, false],
    )).toEqual({ done: 5, possible: 8, percent: 63 });
  });

  it("keeps three priority slots in the denominator before priorities are entered", () => {
    expect(getDailyDriverScore([], [true, false, false, false, false]))
      .toEqual({ done: 1, possible: 8, percent: 13 });
  });
});

describe("Daily Driver plan persistence", () => {
  it("builds the complete authenticated daily_checkins payload", () => {
    expect(buildDailyPlanPayload(
      "00000000-0000-0000-0000-000000000001",
      "2026-07-02",
      { actions: {}, completed: {} },
    )).toEqual({
      user_id: "00000000-0000-0000-0000-000000000001",
      kind: "plan",
      check_date: "2026-07-02",
      summary_json: { actions: {}, completed: {} },
    });
  });
});
