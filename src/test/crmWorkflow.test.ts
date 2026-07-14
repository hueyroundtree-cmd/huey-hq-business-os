import { describe, expect, it } from "vitest";
import {
  CRM_WORKFLOW_STAGES,
  getCrmDailySummary,
  getCrmWorkflowStage,
  isToday,
  matchesCrmDailyKpi,
  type WorkflowLead,
} from "@/lib/crmWorkflow";

const now = new Date("2026-07-14T16:00:00.000Z");
const lead = (overrides: Partial<WorkflowLead>): WorkflowLead => ({
  status: "New Lead",
  email: null,
  outreach_status: null,
  next_follow_up_at: null,
  zoho_last_reply_at: null,
  ...overrides,
});

describe("CRM prospect workflow stages", () => {
  it("keeps Huey's requested workflow order", () => {
    expect(CRM_WORKFLOW_STAGES).toEqual([
      "New Lead",
      "Ready to Email",
      "Contacted",
      "Waiting Follow-Up",
      "Follow-Up Due",
      "Replied",
      "Quoted",
      "Booked",
      "Completed",
      "Review Requested",
      "Closed/Lost",
    ]);
  });

  it("moves completed outreach into Waiting Follow-Up until the due date arrives", () => {
    expect(getCrmWorkflowStage(lead({
      status: "Contacted",
      outreach_status: "Waiting Follow-Up",
      next_follow_up_at: "2026-07-17T16:00:00.000Z",
    }), now)).toBe("Waiting Follow-Up");

    expect(getCrmWorkflowStage(lead({
      status: "Contacted",
      outreach_status: "Waiting Follow-Up",
      next_follow_up_at: "2026-07-14T15:59:00.000Z",
    }), now)).toBe("Follow-Up Due");
  });

  it("maps legacy sent labels to Waiting Follow-Up without changing the live status enum", () => {
    expect(getCrmWorkflowStage(lead({ status: "Contacted", outreach_status: "Email Sent" }), now)).toBe("Waiting Follow-Up");
    expect(getCrmWorkflowStage(lead({ status: "Contacted", outreach_status: "Text Sent" }), now)).toBe("Waiting Follow-Up");
  });

  it("detects same-day activity dates for clickable daily cards", () => {
    expect(isToday("2026-07-14T08:30:00.000Z", "2026-07-14")).toBe(true);
    expect(isToday("2026-07-13T23:59:00.000Z", "2026-07-14")).toBe(false);
  });

  it("counts each contacted lead once even when email and text happened the same business day", () => {
    const leads = [
      lead({
        id: "lead-1",
        status: "Contacted",
        email_sent_at: "2026-07-14T17:00:00.000Z",
        text_sent_at: "2026-07-14T18:00:00.000Z",
      }),
    ];

    expect(getCrmDailySummary(leads, [], "2026-07-14").contacted).toBe(1);
    expect(matchesCrmDailyKpi(leads[0], "contacted_today", [], "2026-07-14")).toBe(true);
  });

  it("uses activity rows as the source for completed follow-ups", () => {
    const leads = [lead({ id: "lead-1", status: "Contacted" })];
    const activities = [{
      lead_id: "lead-1",
      title: "Follow-up completed",
      detail: "Next follow-up scheduled three business days out.",
      occurred_at: "2026-07-14T19:00:00.000Z",
    }];

    expect(getCrmDailySummary(leads, activities, "2026-07-14").followupsCompleted).toBe(1);
    expect(matchesCrmDailyKpi(leads[0], "followups_completed_today", activities, "2026-07-14")).toBe(true);
  });
});
