import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_UNIT,
  DEFAULT_SCORE_SETTINGS,
  aggregateDailyProgress,
  buildSnapshotUpsertPayload,
  getCurrentExecutionStreak,
  scoreDailyProgress,
  sumDailyMetrics,
  toPacificDateKey,
} from "@/lib/progress";

describe("daily progress scoring", () => {
  it("uses the configured 100-point formula without awarding generated leads", () => {
    const score = scoreDailyProgress({
      revenue_collected: 100,
      emails_sent: 10,
      texts_sent: 5,
      calls_made: 5,
      followups_completed: 5,
      bookings_created: 1,
      appointments_completed: 0,
      planning_completed: true,
      end_of_day_review_completed: true,
    });

    expect(score).toBe(100);

    const generatedOnly = aggregateDailyProgress({
      revenueEntries: [],
      leads: [{ id: "lead-1", created_at: "2026-07-13T19:00:00Z", status: "New Lead" }],
      activities: [],
      emailMessages: [],
      jobs: [],
      contentItems: [],
      dailyCheckins: [],
    }, "2026-07-13");

    expect(generatedOnly.new_leads).toBe(1);
    expect(generatedOnly.daily_score).toBe(0);
  });

  it("counts Zoho sent email messages as outreach and synced replies as replies", () => {
    const day = aggregateDailyProgress({
      revenueEntries: [{ entry_date: "2026-07-13", stream: "Detailing", amount: 175 }],
      leads: [{ id: "lead-1", created_at: "2026-07-13T19:00:00Z", status: "Contacted", business_unit_id: "11111111-1111-4111-8111-111111111111" }],
      activities: [{ lead_id: "lead-1", kind: "Call", detail: "", created_at: "2026-07-13T20:00:00Z" }],
      emailMessages: [
        { lead_id: "lead-1", direction: "outbound", status: "sent", sent_at: "2026-07-13T21:00:00Z", created_at: "2026-07-13T21:00:00Z" },
        { lead_id: "lead-1", direction: "inbound", status: "reply_synced", replied_at: "2026-07-13T22:00:00Z", created_at: "2026-07-13T22:00:00Z" },
      ],
      jobs: [],
      contentItems: [],
      dailyCheckins: [{ kind: "plan", check_date: "2026-07-13", created_at: "2026-07-13T15:00:00Z" }],
    }, "2026-07-13", DEFAULT_SCORE_SETTINGS, { businessUnitId: "11111111-1111-4111-8111-111111111111" });

    expect(day.business_unit).toBe(DEFAULT_BUSINESS_UNIT);
    expect(day.revenue_collected).toBe(175);
    expect(day.emails_sent).toBe(1);
    expect(day.calls_made).toBe(1);
    expect(day.replies_received).toBe(1);
    expect(day.planning_completed).toBe(true);
  });

  it("uses America/Los_Angeles day boundaries for timestamped activity", () => {
    expect(toPacificDateKey("2026-07-14T06:59:00Z")).toBe("2026-07-13");
    expect(toPacificDateKey("2026-07-14T07:01:00Z")).toBe("2026-07-14");
  });
});

describe("daily progress history helpers", () => {
  it("builds an upsert payload keyed by user, business unit, and progress date", () => {
    const payload = buildSnapshotUpsertPayload("user-1", {
      progress_date: "2026-07-13",
      business_unit: DEFAULT_BUSINESS_UNIT,
      new_leads: 1,
      leads_contacted: 1,
      emails_sent: 1,
      texts_sent: 0,
      calls_made: 1,
      replies_received: 0,
      estimates_sent: 1,
      bookings_created: 1,
      appointments_completed: 0,
      deposits_collected: 20,
      revenue_collected: 175,
      reviews_requested: 0,
      reviews_received: 0,
      followups_completed: 1,
      content_posts: 1,
      planning_completed: true,
      end_of_day_review_completed: true,
      daily_score: 90,
      goal_completion_percentage: 90,
    }, { notes: "Closed cleanly" });

    expect(payload).toMatchObject({
      user_id: "user-1",
      progress_date: "2026-07-13",
      business_unit: DEFAULT_BUSINESS_UNIT,
      revenue_collected: 175,
      notes: "Closed cleanly",
    });
  });

  it("calculates execution streak and summary totals", () => {
    const days = [
      { progress_date: "2026-07-11", business_unit: DEFAULT_BUSINESS_UNIT, daily_score: 72, revenue_collected: 50, deposits_collected: 0, new_leads: 1, leads_contacted: 1, emails_sent: 0, texts_sent: 0, calls_made: 0, replies_received: 0, estimates_sent: 0, bookings_created: 0, appointments_completed: 0, reviews_requested: 0, reviews_received: 0, followups_completed: 0, content_posts: 0, planning_completed: true, end_of_day_review_completed: true, goal_completion_percentage: 72 },
      { progress_date: "2026-07-12", business_unit: DEFAULT_BUSINESS_UNIT, daily_score: 90, revenue_collected: 100, deposits_collected: 20, new_leads: 2, leads_contacted: 2, emails_sent: 1, texts_sent: 1, calls_made: 1, replies_received: 1, estimates_sent: 1, bookings_created: 1, appointments_completed: 0, reviews_requested: 0, reviews_received: 0, followups_completed: 2, content_posts: 1, planning_completed: true, end_of_day_review_completed: true, goal_completion_percentage: 90 },
      { progress_date: "2026-07-13", business_unit: DEFAULT_BUSINESS_UNIT, daily_score: 75, revenue_collected: 25, deposits_collected: 0, new_leads: 0, leads_contacted: 1, emails_sent: 1, texts_sent: 0, calls_made: 0, replies_received: 0, estimates_sent: 0, bookings_created: 0, appointments_completed: 0, reviews_requested: 0, reviews_received: 0, followups_completed: 0, content_posts: 0, planning_completed: true, end_of_day_review_completed: true, goal_completion_percentage: 75 },
    ];

    expect(getCurrentExecutionStreak(days, DEFAULT_SCORE_SETTINGS.minimumScoreForStreak, new Date("2026-07-13T19:00:00Z"))).toBe(3);
    expect(sumDailyMetrics(days)).toMatchObject({
      revenue_collected: 175,
      outreach_completed: 4,
      bookings_created: 1,
      deposits_collected: 20,
    });
  });
});
