import { NOTION_ENTITIES, type NotionEntityKey } from "@/lib/notionEntities";
import type { ConnectionState } from "@/lib/connectionHealth";

export type NotionMappingHealth = {
  entity: NotionEntityKey;
  status: ConnectionState;
  last_sync_at: string | null;
  last_error: string | null;
  verified_at: string | null;
};

export function getNotionHealth(mappings: NotionMappingHealth[]) {
  const connected = mappings.filter(
    (mapping) => mapping.status === "Verified Live" && Boolean(mapping.verified_at),
  );
  const status: ConnectionState =
    mappings.some((mapping) => mapping.status === "Error")
      ? "Error"
      : mappings.length === NOTION_ENTITIES.length &&
          connected.length === NOTION_ENTITIES.length
        ? "Verified Live"
        : "Needs Setup";
  const lastSync =
    mappings
      .map((mapping) => mapping.last_sync_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return { status, connectedCount: connected.length, lastSync };
}

export function getDailyDriverScore(topTaskStates: boolean[], actionStates: boolean[]) {
  const done = [...topTaskStates, ...actionStates].filter(Boolean).length;
  const possible = Math.max(topTaskStates.length, 3) + actionStates.length;
  return {
    done,
    possible,
    percent: possible ? Math.round((done / possible) * 100) : 0,
  };
}

export function buildDailyPlanPayload(
  userId: string,
  checkDate: string,
  summary: Record<string, unknown>,
) {
  return {
    user_id: userId,
    kind: "plan",
    check_date: checkDate,
    summary_json: summary,
  } as const;
}

export function buildDailyPlanSyncRequest(recordId: string) {
  return {
    action: "sync",
    entity: "daily_checkins",
    record_id: recordId,
  } as const;
}
