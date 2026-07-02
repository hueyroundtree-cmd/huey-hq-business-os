import { supabase } from "@/integrations/supabase/client";

type OperationEvent = {
  userId: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  detail?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};

export async function emitOperationEvent(event: OperationEvent) {
  return supabase.from("operations_events").insert({
    user_id: event.userId,
    event_type: event.eventType,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    title: event.title,
    detail: event.detail ?? null,
    source: event.source ?? "Huey HQ",
    metadata: event.metadata ?? {},
    occurred_at: event.occurredAt ?? new Date().toISOString(),
  });
}
