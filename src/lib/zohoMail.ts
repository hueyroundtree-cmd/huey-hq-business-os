export const ZOHO_PRIMARY_SENDER = "huey.roundtree@gfldetail.com";
export const ZOHO_SCOPES = ["ZohoMail.accounts.READ", "ZohoMail.messages.CREATE"] as const;
export const ZOHO_EDGE_FUNCTION = "zoho-mail";

export type ZohoConnectionStatus = {
  status: "Verified Live" | "Needs Setup" | "Error" | "Manual Only" | "Not Implemented";
  connectedAddress: string | null;
  accountId: string | null;
  lastSync: string | null;
  lastError: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  sender: string;
  scopes: readonly string[];
};

export type ZohoEmailComposerPayload = {
  leadId: string;
  toAddress: string;
  subject: string;
  body: string;
  fromAddress?: string;
  confirmDuplicate?: boolean;
};

export function defaultZohoText(firstName = "there") {
  return [
    `Hi ${firstName},`,
    "",
    "This is Huey with Great Freight Mobile Detailing. I wanted to introduce our mobile detailing service for busy professionals and local businesses.",
    "",
    "We come directly to your office or home, and services start at $100.",
    "",
    "You can learn more at https://gfldetail.com.",
    "",
    "Thank you,",
    "Huey Roundtree III",
    "Great Freight Mobile Detailing",
    "(323) 989-4510",
  ].join("\n");
}

export function duplicateSendMessage(lastSent?: { sent_at?: string; subject?: string } | null) {
  if (!lastSent?.sent_at) return "This lead already has a recent sent email. Confirm before sending again.";
  return `This lead already received "${lastSent.subject ?? "an email"}" on ${new Date(lastSent.sent_at).toLocaleDateString()}. Confirm before sending again.`;
}

async function invokeZoho<T>(body: Record<string, unknown>): Promise<T> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke(ZOHO_EDGE_FUNCTION, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function getZohoStatus() {
  return invokeZoho<ZohoConnectionStatus>({ action: "status" });
}

export async function getZohoAuthorizeUrl() {
  return invokeZoho<{ url: string; redirectUri: string; scopes: string[]; sender: string }>({ action: "authorize-url" });
}

export async function disconnectZoho() {
  return invokeZoho<{ ok: boolean; status: string }>({ action: "disconnect" });
}

export async function saveZohoDraft(payload: ZohoEmailComposerPayload) {
  return invokeZoho<{ ok: boolean; email: unknown; zohoMessageId: string | null }>({
    action: "save-draft",
    fromAddress: ZOHO_PRIMARY_SENDER,
    ...payload,
  });
}

export async function sendZohoEmail(payload: ZohoEmailComposerPayload) {
  return invokeZoho<{ ok?: boolean; duplicateWarning?: boolean; message?: string; lastSent?: { sent_at?: string; subject?: string }; email?: unknown; zohoMessageId?: string | null }>({
    action: "send-email",
    fromAddress: ZOHO_PRIMARY_SENDER,
    ...payload,
  });
}

export async function syncZohoReplyManually(payload: {
  leadId: string;
  fromAddress?: string | null;
  subject?: string | null;
  body?: string | null;
  repliedAt?: string | null;
}) {
  return invokeZoho<{ ok: boolean; repliedAt: string }>({ action: "sync-reply-manual", ...payload });
}
