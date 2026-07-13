export const DETAILING_BUSINESS_UNIT_ID = "11111111-1111-4111-8111-111111111111";

export type ProgressScoreSettings = {
  incomeActivityPoints: number;
  outreachPoints: number;
  followUpPoints: number;
  bookingPoints: number;
  planningPoints: number;
  incomeTargetAmount: number;
  outreachTarget: number;
  followUpTarget: number;
  bookingTarget: number;
  weeklyIncomeGoal: number;
  monthlyIncomeGoal: number;
  minimumScoreForStreak: number;
};

export const DEFAULT_SCORE_SETTINGS: ProgressScoreSettings = {
  incomeActivityPoints: 25,
  outreachPoints: 25,
  followUpPoints: 20,
  bookingPoints: 20,
  planningPoints: 10,
  incomeTargetAmount: 1,
  outreachTarget: 20,
  followUpTarget: 5,
  bookingTarget: 1,
  weeklyIncomeGoal: 1000,
  monthlyIncomeGoal: 4000,
  minimumScoreForStreak: 70,
};

export type ProgressFilters = {
  businessUnitId?: string;
  incomeSource?: string;
  leadSource?: string;
  city?: string;
};

export type RevenueEntry = {
  id?: string;
  entry_date: string;
  stream: string;
  amount: number | string;
};

export type ProgressLead = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  date_added?: string | null;
  status?: string | null;
  booking_at?: string | null;
  business_unit_id?: string | null;
  source?: string | null;
  city?: string | null;
  contact_method?: string | null;
  contact_date?: string | null;
  email_sent_at?: string | null;
  text_sent_at?: string | null;
  last_contact_at?: string | null;
  outreach_status?: string | null;
  quote_amount?: number | string | null;
  appointment_status?: string | null;
};

export type ProgressActivity = {
  id?: string;
  lead_id?: string | null;
  kind?: string | null;
  title?: string | null;
  event_type?: string | null;
  detail?: string | null;
  created_at: string;
  occurred_at?: string | null;
};

export type ProgressEmailMessage = {
  id?: string;
  lead_id?: string | null;
  direction: string;
  status: string;
  sent_at?: string | null;
  replied_at?: string | null;
  created_at: string;
};

export type ProgressJob = {
  id?: string;
  status: string;
  scheduled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type ProgressContentItem = {
  id?: string;
  stage: string;
  posted_url?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type ProgressDailyCheckin = {
  kind: string;
  check_date: string;
  created_at: string;
  notes?: string | null;
};

export type DailyProgressInputs = {
  revenueEntries: RevenueEntry[];
  leads: ProgressLead[];
  activities: ProgressActivity[];
  emailMessages: ProgressEmailMessage[];
  jobs: ProgressJob[];
  contentItems: ProgressContentItem[];
  dailyCheckins: ProgressDailyCheckin[];
};

export type DailyProgressMetrics = {
  business_date: string;
  total_income: number;
  detailing_income: number;
  other_income: number;
  leads_added: number;
  emails_sent: number;
  texts_sent: number;
  calls_completed: number;
  contact_forms_submitted: number;
  follow_ups_completed: number;
  replies_received: number;
  quotes_sent: number;
  jobs_booked: number;
  jobs_completed: number;
  reviews_requested: number;
  content_posted: number;
  planning_completed: boolean;
  end_of_day_review_completed: boolean;
  daily_score: number;
  goal_completion_percentage: number;
  notes?: string | null;
  wins?: string | null;
  problems?: string | null;
  tomorrow_first_actions?: string[];
  source_breakdown?: Record<string, unknown>;
};

export const toDateKey = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const sameDate = (value: string | null | undefined, day: string) => toDateKey(value) === day;

const normal = (value?: string | null) => (value ?? "").toLowerCase();

const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);

const isDetailingRevenue = (entry: Pick<RevenueEntry, "stream">) =>
  normal(entry.stream).includes("detailing");

const matchesLeadFilters = (lead: ProgressLead, filters: ProgressFilters = {}) => {
  if (filters.businessUnitId && filters.businessUnitId !== "all" && lead.business_unit_id !== filters.businessUnitId) return false;
  if (filters.leadSource && filters.leadSource !== "all" && lead.source !== filters.leadSource) return false;
  if (filters.city && filters.city !== "all" && lead.city !== filters.city) return false;
  return true;
};

const matchesIncomeFilters = (entry: RevenueEntry, filters: ProgressFilters = {}) => {
  if (filters.incomeSource && filters.incomeSource !== "all" && entry.stream !== filters.incomeSource) return false;
  if (filters.businessUnitId && filters.businessUnitId !== "all") {
    const isDetailingUnit = filters.businessUnitId === DETAILING_BUSINESS_UNIT_ID;
    if (isDetailingUnit && !isDetailingRevenue(entry)) return false;
    if (!isDetailingUnit && isDetailingRevenue(entry)) return false;
  }
  return true;
};

const activityText = (activity: ProgressActivity) =>
  normal([activity.kind, activity.title, activity.event_type, activity.detail].filter(Boolean).join(" "));

const countActivities = (activities: ProgressActivity[], day: string, predicate: (text: string) => boolean) =>
  activities.filter((activity) => sameDate(activity.occurred_at ?? activity.created_at, day) && predicate(activityText(activity))).length;

const countUniqueLeadDates = (
  leads: ProgressLead[],
  day: string,
  dateSelector: (lead: ProgressLead) => string | null | undefined,
) => new Set(leads.filter((lead) => sameDate(dateSelector(lead), day)).map((lead) => lead.id)).size;

export function scoreDailyProgress(metrics: Pick<DailyProgressMetrics,
  "total_income" |
  "emails_sent" |
  "texts_sent" |
  "calls_completed" |
  "contact_forms_submitted" |
  "follow_ups_completed" |
  "jobs_booked" |
  "jobs_completed" |
  "planning_completed" |
  "end_of_day_review_completed"
>, settings: ProgressScoreSettings = DEFAULT_SCORE_SETTINGS) {
  const incomeRatio = settings.incomeTargetAmount <= 0
    ? metrics.total_income > 0 ? 1 : 0
    : Math.min(1, metrics.total_income / settings.incomeTargetAmount);
  const outreachCompleted = metrics.emails_sent + metrics.texts_sent + metrics.calls_completed + metrics.contact_forms_submitted;
  const outreachRatio = settings.outreachTarget <= 0 ? outreachCompleted > 0 ? 1 : 0 : Math.min(1, outreachCompleted / settings.outreachTarget);
  const followUpRatio = settings.followUpTarget <= 0 ? metrics.follow_ups_completed > 0 ? 1 : 0 : Math.min(1, metrics.follow_ups_completed / settings.followUpTarget);
  const bookingActivity = metrics.jobs_booked + metrics.jobs_completed;
  const bookingRatio = settings.bookingTarget <= 0 ? bookingActivity > 0 ? 1 : 0 : Math.min(1, bookingActivity / settings.bookingTarget);
  const planningRatio = (Number(metrics.planning_completed) + Number(metrics.end_of_day_review_completed)) / 2;

  const score = Math.round(
    incomeRatio * settings.incomeActivityPoints +
    outreachRatio * settings.outreachPoints +
    followUpRatio * settings.followUpPoints +
    bookingRatio * settings.bookingPoints +
    planningRatio * settings.planningPoints,
  );

  return Math.max(0, Math.min(100, score));
}

export function aggregateDailyProgress(
  inputs: DailyProgressInputs,
  businessDate: string,
  settings: ProgressScoreSettings = DEFAULT_SCORE_SETTINGS,
  filters: ProgressFilters = {},
): DailyProgressMetrics {
  const revenue = inputs.revenueEntries.filter((entry) => entry.entry_date === businessDate && matchesIncomeFilters(entry, filters));
  const leads = inputs.leads.filter((lead) => matchesLeadFilters(lead, filters));
  const leadIds = new Set(leads.map((lead) => lead.id));
  const activities = inputs.activities.filter((activity) => !activity.lead_id || leadIds.has(activity.lead_id));
  const emails = inputs.emailMessages.filter((email) => !email.lead_id || leadIds.has(email.lead_id));

  const totalIncome = revenue.reduce((sum, entry) => sum + numberValue(entry.amount), 0);
  const detailingIncome = revenue.filter(isDetailingRevenue).reduce((sum, entry) => sum + numberValue(entry.amount), 0);
  const emailMessageSentCount = emails.filter((email) =>
    email.direction === "outbound" &&
    email.status === "sent" &&
    sameDate(email.sent_at ?? email.created_at, businessDate)
  ).length;
  const manualEmailActivities = countActivities(activities, businessDate, (text) =>
    text.includes("email") && !text.includes("zoho email sent")
  );

  const metrics: DailyProgressMetrics = {
    business_date: businessDate,
    total_income: totalIncome,
    detailing_income: detailingIncome,
    other_income: Math.max(0, totalIncome - detailingIncome),
    leads_added: leads.filter((lead) => sameDate(lead.date_added ?? lead.created_at, businessDate)).length,
    emails_sent: emailMessageSentCount + manualEmailActivities,
    texts_sent: countActivities(activities, businessDate, (text) => text.includes("text") || text.includes("sms")) +
      countUniqueLeadDates(leads, businessDate, (lead) => lead.text_sent_at),
    calls_completed: countActivities(activities, businessDate, (text) => text.includes("call") || text.includes("voicemail")),
    contact_forms_submitted: countActivities(activities, businessDate, (text) => text.includes("contact form") || text.includes("form submitted")),
    follow_ups_completed: countActivities(activities, businessDate, (text) => text.includes("follow")),
    replies_received: emails.filter((email) =>
      (email.direction === "inbound" || email.status === "reply_synced") &&
      sameDate(email.replied_at ?? email.created_at, businessDate)
    ).length + countActivities(activities, businessDate, (text) => text.includes("reply") || text.includes("replied")),
    quotes_sent: countActivities(activities, businessDate, (text) => text.includes("quote")) +
      leads.filter((lead) => Boolean(lead.quote_amount) && sameDate(lead.updated_at, businessDate)).length,
    jobs_booked: countActivities(activities, businessDate, (text) => text.includes("booked") || text.includes("booking")) +
      leads.filter((lead) => lead.status === "Booked" && sameDate(lead.booking_at ?? lead.updated_at, businessDate)).length,
    jobs_completed: countActivities(activities, businessDate, (text) => text.includes("completed")) +
      inputs.jobs.filter((job) => job.status === "Completed" && sameDate(job.updated_at ?? job.scheduled_at ?? job.created_at, businessDate)).length +
      leads.filter((lead) => lead.status === "Completed" && sameDate(lead.updated_at, businessDate)).length,
    reviews_requested: countActivities(activities, businessDate, (text) => text.includes("review")) +
      leads.filter((lead) => lead.status === "Review Requested" && sameDate(lead.updated_at, businessDate)).length,
    content_posted: inputs.contentItems.filter((item) =>
      item.stage === "Posted" && sameDate(item.updated_at ?? item.created_at, businessDate)
    ).length,
    planning_completed: inputs.dailyCheckins.some((checkin) =>
      checkin.check_date === businessDate && ["morning", "plan"].includes(checkin.kind)
    ),
    end_of_day_review_completed: inputs.dailyCheckins.some((checkin) =>
      checkin.check_date === businessDate && checkin.kind === "evening"
    ),
    daily_score: 0,
    goal_completion_percentage: 0,
    source_breakdown: {
      income_by_source: revenue.reduce<Record<string, number>>((map, entry) => {
        map[entry.stream] = (map[entry.stream] ?? 0) + numberValue(entry.amount);
        return map;
      }, {}),
    },
  };

  metrics.daily_score = scoreDailyProgress(metrics, settings);
  metrics.goal_completion_percentage = metrics.daily_score;
  return metrics;
}

export function fromScoreSettingsRow(row: Record<string, unknown> | null | undefined): ProgressScoreSettings {
  if (!row) return DEFAULT_SCORE_SETTINGS;
  return {
    incomeActivityPoints: Number(row.income_activity_points ?? DEFAULT_SCORE_SETTINGS.incomeActivityPoints),
    outreachPoints: Number(row.outreach_points ?? DEFAULT_SCORE_SETTINGS.outreachPoints),
    followUpPoints: Number(row.follow_up_points ?? DEFAULT_SCORE_SETTINGS.followUpPoints),
    bookingPoints: Number(row.booking_points ?? DEFAULT_SCORE_SETTINGS.bookingPoints),
    planningPoints: Number(row.planning_points ?? DEFAULT_SCORE_SETTINGS.planningPoints),
    incomeTargetAmount: Number(row.income_target_amount ?? DEFAULT_SCORE_SETTINGS.incomeTargetAmount),
    outreachTarget: Number(row.outreach_target ?? DEFAULT_SCORE_SETTINGS.outreachTarget),
    followUpTarget: Number(row.follow_up_target ?? DEFAULT_SCORE_SETTINGS.followUpTarget),
    bookingTarget: Number(row.booking_target ?? DEFAULT_SCORE_SETTINGS.bookingTarget),
    weeklyIncomeGoal: Number(row.weekly_income_goal ?? DEFAULT_SCORE_SETTINGS.weeklyIncomeGoal),
    monthlyIncomeGoal: Number(row.monthly_income_goal ?? DEFAULT_SCORE_SETTINGS.monthlyIncomeGoal),
    minimumScoreForStreak: Number(row.minimum_score_for_streak ?? DEFAULT_SCORE_SETTINGS.minimumScoreForStreak),
  };
}

export function snapshotRowToMetrics(row: Record<string, unknown>): DailyProgressMetrics {
  return {
    business_date: String(row.business_date ?? ""),
    total_income: numberValue(row.total_income),
    detailing_income: numberValue(row.detailing_income),
    other_income: numberValue(row.other_income),
    leads_added: Number(row.leads_added ?? 0),
    emails_sent: Number(row.emails_sent ?? 0),
    texts_sent: Number(row.texts_sent ?? 0),
    calls_completed: Number(row.calls_completed ?? 0),
    contact_forms_submitted: Number(row.contact_forms_submitted ?? 0),
    follow_ups_completed: Number(row.follow_ups_completed ?? 0),
    replies_received: Number(row.replies_received ?? 0),
    quotes_sent: Number(row.quotes_sent ?? 0),
    jobs_booked: Number(row.jobs_booked ?? 0),
    jobs_completed: Number(row.jobs_completed ?? 0),
    reviews_requested: Number(row.reviews_requested ?? 0),
    content_posted: Number(row.content_posted ?? 0),
    planning_completed: Boolean(row.planning_completed),
    end_of_day_review_completed: Boolean(row.end_of_day_review_completed),
    daily_score: Number(row.daily_score ?? 0),
    goal_completion_percentage: Number(row.goal_completion_percentage ?? row.daily_score ?? 0),
    notes: typeof row.notes === "string" ? row.notes : null,
    wins: typeof row.wins === "string" ? row.wins : null,
    problems: typeof row.problems === "string" ? row.problems : null,
    tomorrow_first_actions: Array.isArray(row.tomorrow_first_actions) ? row.tomorrow_first_actions.map(String) : [],
    source_breakdown: row.source_breakdown && typeof row.source_breakdown === "object" ? row.source_breakdown as Record<string, unknown> : {},
  };
}

export function buildSnapshotUpsertPayload(
  userId: string,
  metrics: DailyProgressMetrics,
  extras: Partial<Pick<DailyProgressMetrics, "notes" | "wins" | "problems" | "tomorrow_first_actions">> & {
    finalized_at?: string | null;
  } = {},
) {
  return {
    user_id: userId,
    business_date: metrics.business_date,
    total_income: metrics.total_income,
    detailing_income: metrics.detailing_income,
    other_income: metrics.other_income,
    leads_added: metrics.leads_added,
    emails_sent: metrics.emails_sent,
    texts_sent: metrics.texts_sent,
    calls_completed: metrics.calls_completed,
    contact_forms_submitted: metrics.contact_forms_submitted,
    follow_ups_completed: metrics.follow_ups_completed,
    replies_received: metrics.replies_received,
    quotes_sent: metrics.quotes_sent,
    jobs_booked: metrics.jobs_booked,
    jobs_completed: metrics.jobs_completed,
    reviews_requested: metrics.reviews_requested,
    content_posted: metrics.content_posted,
    planning_completed: metrics.planning_completed,
    end_of_day_review_completed: metrics.end_of_day_review_completed,
    daily_score: metrics.daily_score,
    goal_completion_percentage: metrics.goal_completion_percentage,
    notes: extras.notes ?? metrics.notes ?? null,
    wins: extras.wins ?? metrics.wins ?? null,
    problems: extras.problems ?? metrics.problems ?? null,
    tomorrow_first_actions: extras.tomorrow_first_actions ?? metrics.tomorrow_first_actions ?? [],
    source_breakdown: metrics.source_breakdown ?? {},
    finalized_at: extras.finalized_at ?? null,
  };
}

export function getCurrentExecutionStreak(days: Pick<DailyProgressMetrics, "business_date" | "daily_score">[], minimumScore = 70, today = new Date()) {
  const byDate = new Map(days.map((day) => [day.business_date, day.daily_score]));
  let streak = 0;
  const cursor = new Date(today);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    const score = byDate.get(key);
    if (score === undefined || score < minimumScore) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getBestDay(days: DailyProgressMetrics[]) {
  return [...days].sort((a, b) =>
    b.daily_score - a.daily_score ||
    b.total_income - a.total_income ||
    a.business_date.localeCompare(b.business_date)
  )[0] ?? null;
}

export function sumDailyMetrics(days: DailyProgressMetrics[]) {
  return days.reduce((sum, day) => ({
    total_income: sum.total_income + day.total_income,
    detailing_income: sum.detailing_income + day.detailing_income,
    other_income: sum.other_income + day.other_income,
    leads_added: sum.leads_added + day.leads_added,
    outreach_completed: sum.outreach_completed + day.emails_sent + day.texts_sent + day.calls_completed + day.contact_forms_submitted,
    follow_ups_completed: sum.follow_ups_completed + day.follow_ups_completed,
    replies_received: sum.replies_received + day.replies_received,
    quotes_sent: sum.quotes_sent + day.quotes_sent,
    jobs_booked: sum.jobs_booked + day.jobs_booked,
    jobs_completed: sum.jobs_completed + day.jobs_completed,
    reviews_requested: sum.reviews_requested + day.reviews_requested,
    daily_score_total: sum.daily_score_total + day.daily_score,
  }), {
    total_income: 0,
    detailing_income: 0,
    other_income: 0,
    leads_added: 0,
    outreach_completed: 0,
    follow_ups_completed: 0,
    replies_received: 0,
    quotes_sent: 0,
    jobs_booked: 0,
    jobs_completed: 0,
    reviews_requested: 0,
    daily_score_total: 0,
  });
}
