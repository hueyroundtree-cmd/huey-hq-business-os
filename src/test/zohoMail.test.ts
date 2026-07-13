import { describe, expect, it } from "vitest";
import { ZOHO_PRIMARY_SENDER, ZOHO_SCOPES, duplicateSendMessage } from "@/lib/zohoMail";

describe("Zoho Mail CRM integration contract", () => {
  it("uses Huey's required sender and least-privilege Mail scopes", () => {
    expect(ZOHO_PRIMARY_SENDER).toBe("huey.roundtree@gfldetail.com");
    expect(ZOHO_SCOPES).toEqual(["ZohoMail.accounts.READ", "ZohoMail.messages.CREATE"]);
  });

  it("surfaces duplicate-send warnings with the last sent date", () => {
    expect(duplicateSendMessage({ sent_at: "2026-07-12T12:00:00.000Z", subject: "Intro" })).toContain("Intro");
    expect(duplicateSendMessage(null)).toContain("recent sent email");
  });
});
