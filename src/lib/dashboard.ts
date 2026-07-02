import { NOTION_ENTITIES, type NotionEntityKey } from "@/lib/notionEntities";

export type NotionMappingHealth = {
  entity: NotionEntityKey;
  status: "Connected" | "Not Connected" | "Error";
  last_sync_at: string | null;
  last_error: string | null;
  verified_at: string | null;
};

export function getNotionHealth(mappings: NotionMappingHealth[]) {
  const connected = mappings.filter(
    (mapping) => mapping.status === "Connected" && Boolean(mapping.verified_at),
  );
  const status: "Connected" | "Not Connected" | "Error" =
    mappings.some((mapping) => mapping.status === "Error")
      ? "Error"
      : mappings.length === NOTION_ENTITIES.length &&
          connected.length === NOTION_ENTITIES.length
        ? "Connected"
        : "Not Connected";
  const lastSync =
    mappings
      .map((mapping) => mapping.last_sync_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return { status, connectedCount: connected.length, lastSync };
}
