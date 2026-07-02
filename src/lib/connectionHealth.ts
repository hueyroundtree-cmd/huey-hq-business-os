export type ConnectionState =
  | "Verified Live"
  | "Needs Setup"
  | "Error"
  | "Manual Only"
  | "Not Implemented";

export type VerificationEvidence = {
  succeeded: boolean;
  verifiedAt?: string | null;
  error?: string | null;
};

export function stateFromEvidence(evidence: VerificationEvidence): ConnectionState {
  if (evidence.error) return "Error";
  if (evidence.succeeded && evidence.verifiedAt) return "Verified Live";
  return "Needs Setup";
}

export function latestTimestamp(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}
