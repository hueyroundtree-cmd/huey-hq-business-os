import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insertMock = vi.fn();
  return {
    insert: insertMock,
    from: vi.fn(() => ({ insert: insertMock })),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from },
}));

import { emitOperationEvent } from "@/lib/eventEngine";

describe("emitOperationEvent", () => {
  beforeEach(() => {
    from.mockClear();
    insert.mockClear();
  });

  it("writes a normalized event to operations_events", async () => {
    insert.mockResolvedValue({ error: null });

    await emitOperationEvent({
      userId: "00000000-0000-0000-0000-000000000001",
      eventType: "lead_contacted",
      entityType: "lead",
      entityId: "00000000-0000-0000-0000-000000000002",
      title: "Lead contacted",
      detail: "Follow-up sent",
      metadata: { channel: "email" },
      occurredAt: "2026-07-02T03:00:00.000Z",
    });

    expect(from).toHaveBeenCalledWith("operations_events");
    expect(insert).toHaveBeenCalledWith({
      user_id: "00000000-0000-0000-0000-000000000001",
      event_type: "lead_contacted",
      entity_type: "lead",
      entity_id: "00000000-0000-0000-0000-000000000002",
      title: "Lead contacted",
      detail: "Follow-up sent",
      source: "Huey HQ",
      metadata: { channel: "email" },
      occurred_at: "2026-07-02T03:00:00.000Z",
    });
  });
});
