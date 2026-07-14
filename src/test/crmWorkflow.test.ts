import { describe, expect, it } from "vitest";
import { CRM_WORKFLOW_STAGES, getCrmWorkflowStage, isToday, type WorkflowLead } from "@/lib/crmWorkflow";

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
    expect(isToday("2026-07-14T08:30:00.000Z", now)).toBe(true);
    expect(isToday("2026-07-13T23:59:00.000Z", now)).toBe(false);
  });
});
