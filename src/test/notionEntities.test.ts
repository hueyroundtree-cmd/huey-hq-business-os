import { describe, expect, it } from "vitest";
import { NOTION_ENTITIES, notionEntity } from "@/lib/notionEntities";

describe("Notion entity catalog", () => {
  it("keeps Tasks & Alerts and exposes every requested connection", () => {
    expect(NOTION_ENTITIES.map((entity) => entity.key)).toEqual([
      "tasks",
      "leads",
      "content_items",
      "business_projects",
      "sops",
      "revenue_entries",
      "scripts",
      "daily_checkins",
      "ai_commands",
      "automations",
    ]);
  });

  it("resolves a known entity and rejects unknown routes", () => {
    expect(notionEntity("tasks")?.label).toBe("Tasks & Alerts");
    expect(notionEntity("unknown")).toBeUndefined();
  });

  it("documents a title contract for every data source", () => {
    for (const entity of NOTION_ENTITIES) {
      expect(entity.requiredTitle.length).toBeGreaterThan(0);
    }
  });
});
