import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORE_SETTINGS,
  aggregateDailyProgress,
  buildSnapshotUpsertPayload,
  getCurrentExecutionStreak,
  scoreDailyProgress,
  sumDailyMetrics,
} from "@/lib/progress";

describe("daily progress scoring", () => {
  it("uses the configured 100-point formula without awarding generated leads", () => {
    const score = scoreDailyProgress({
      total_income: 100,
      emails_sent: 10,
      texts_sent: 5,
      calls_completed: 5,
      contact_forms_submitted: 0,
      follow_ups_completed: 5,
      jobs_booked: 1,
      jobs_completed: 0,
      planning_completed: true,
      end_of_day_review_completed: true,
    });

    expect(score).toBe(100);

    const generatedOnly = aggregateDailyProgress({
      revenueEntries: [],
      leads: [{ id: "lead-1", created_at: "2026-07-13T12:00:00Z", status: "New Lead" }],
      activities: [],
      emailMessages: [],
      jobs: [],
      contentItems: [],
      dailyCheckins: [],
    }, "2026-07-13");

    expect(generatedOnly.leads_added).toBe(1);
    expect(generatedOnly.daily_score).toBe(0);
  });

  it("counts Zoho sent email messages as outreach and synced replies as replies", () => {
    const day = aggregateDailyProgress({
      revenueEntries: [{ entry_date: "2026-07-13", stream: "Detailing", amount: 175 }],
      leads: [{ id: "lead-1", created_at: "2026-07-13T12:00:00Z", status: "Contacted" }],
      activities: [{ lead_id: "lead-1", kind: "Call", detail: "", created_at: "2026-07-13T13:00:00Z" }],
      emailMessages: [
        { lead_id: "lead-1", direction: "outbound", status: "sent", sent_at: "2026-07-13T14:00:00Z", created_at: "2026-07-13T14:00:00Z" },
        { lead_id: "lead-1", direction: "inbound", status: "reply_synced", replied_at: "2026-07-13T15:00:00Z", created_at: "2026-07-13T15:00:00Z" },
      ],
      jobs: [],
      contentItems: [],
      dailyCheckins: [{ kind: "plan", check_date: "2026-07-13", created_at: "2026-07-13T08:00:00Z" }],
    }, "2026-07-13");

    expect(day.detailing_income).toBe(175);
    expect(day.emails_sent).toBe(1);
    expect(day.calls_completed).toBe(1);
    expect(day.replies_received).toBe(1);
    expect(day.planning_completed).toBe(true);
  });
});

describe("daily progress history helpers", () => {
  it("builds an upsert payload keyed by user and business date", () => {
    const payload = buildSnapshotUpsertPayload("user-1", {
      business_date: "2026-07-13",
      total_income: 175,
      detailing_income: 175,
      other_income: 0,
      leads_added: 1,
      emails_sent: 1,
      texts_sent: 0,
      calls_completed: 1,
      contact_forms_submitted: 0,
      follow_ups_completed: 1,
      replies_received: 0,
      quotes_sent: 1,
      jobs_booked: 1,
      jobs_completed: 0,
      reviews_requested: 0,
      content_posted: 1,
      planning_completed: true,
      end_of_day_review_completed: true,
      daily_score: 90,
      goal_completion_percentage: 90,
    }, { notes: "Closed cleanly" });

    expect(payload).toMatchObject({
      user_id: "user-1",
      business_date: "2026-07-13",
      total_income: 175,
      notes: "Closed cleanly",
    });
  });

  it("calculates execution streak and summary totals", () => {
    const days = [
      { business_date: "2026-07-11", daily_score: 72, total_income: 50, detailing_income: 50, other_income: 0, leads_added: 1, emails_sent: 0, texts_sent: 0, calls_completed: 0, contact_forms_submitted: 0, follow_ups_completed: 0, replies_received: 0, quotes_sent: 0, jobs_booked: 0, jobs_completed: 0, reviews_requested: 0, content_posted: 0, planning_completed: true, end_of_day_review_completed: true, goal_completion_percentage: 72 },
      { business_date: "2026-07-12", daily_score: 90, total_income: 100, detailing_income: 100, other_income: 0, leads_added: 2, emails_sent: 1, texts_sent: 1, calls_completed: 1, contact_forms_submitted: 1, follow_ups_completed: 2, replies_received: 1, quotes_sent: 1, jobs_booked: 1, jobs_completed: 0, reviews_requested: 0, content_posted: 1, planning_completed: true, end_of_day_review_completed: true, goal_completion_percentage: 90 },
      { business_date: "2026-07-13", daily_score: 75, total_income: 25, detailing_income: 0, other_income: 25, leads_added: 0, emails_sent: 1, texts_sent: 0, calls_completed: 0, contact_forms_submitted: 0, follow_ups_completed: 0, replies_received: 0, quotes_sent: 0, jobs_booked: 0, jobs_completed: 0, reviews_requested: 0, content_posted: 0, planning_completed: true, end_of_day_review_completed: true, goal_completion_percentage: 75 },
    ];

    expect(getCurrentExecutionStreak(days, DEFAULT_SCORE_SETTINGS.minimumScoreForStreak, new Date("2026-07-13T12:00:00Z"))).toBe(3);
    expect(sumDailyMetrics(days)).toMatchObject({
      total_income: 175,
      outreach_completed: 5,
      jobs_booked: 1,
    });
  });
});
