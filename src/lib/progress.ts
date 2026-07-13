import { BUSINESS_UNITS, DEFAULT_BUSINESS_UNIT_ID } from "@/lib/crmPipeline";

export const PACIFIC_TIME_ZONE = "America/Los_Angeles";
export const DETAILING_BUSINESS_UNIT_ID = DEFAULT_BUSINESS_UNIT_ID;
export const DEFAULT_BUSINESS_UNIT = BUSINESS_UNITS.find((unit) => unit.id === DEFAULT_BUSINESS_UNIT_ID)?.name ?? "Great Freight Mobile Detailing";
export const ALL_BUSINESS_UNITS = "All Business Units";

const pacificDateParts = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const toPacificDateKey = (value?: string | Date | null) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(pacificDateParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const todayPacificISO = () => toPacificDateKey(new Date());

export const addDaysISO = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const dateDaysAgoPacific = (days: number, from = todayPacificISO()) => addDaysISO(from, -days);

export const startOfWeekPacificISO = (from = todayPacificISO()) => {
  const date = new Date(`${from}T12:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
};

export const startOfMonthPacificISO = (from = todayPacificISO()) => `${from.slice(0, 8)}01`;

export const eachDate = (start: string, end: string) => {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return days;
};

export const getBusinessUnitName = (businessUnitId?: string | null) =>
  BUSINESS_UNITS.find((unit) => unit.id === businessUnitId)?.name ?? DEFAULT_BUSINESS_UNIT;

export const getBusinessUnitId = (businessUnitName?: string | null) =>
  BUSINESS_UNITS.find((unit) => unit.name === businessUnitName)?.id ?? DEFAULT_BUSINESS_UNIT_ID;

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

export const DAILY_TARGETS = {
  new_leads: 30,
  emails_sent: 20,
  texts_sent: 10,
  calls_made: 5,
  estimates_sent: 2,
  bookings_created: 1,
  reviews_requested: 1,
} as const;

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
  notes?: string | null;
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
  estimated_value?: number | string | null;
  deposit?: number | string | null;
  deposit_status?: string | null;
  appointment_status?: string | null;
};

export type ProgressActivity = {
  id?: string;
  lead_id?: string | null;
  kind?: string | null;
  title?: string | null;
  event_type?: string | null;
  detail?: string | null;
  source?: string | null;
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
  lead_id?: string | null;
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
  progress_date: string;
  business_unit: string;
  new_leads: number;
  leads_contacted: number;
  emails_sent: number;
  texts_sent: number;
  calls_made: number;
  replies_received: number;
  estimates_sent: number;
  bookings_created: number;
  appointments_completed: number;
  deposits_collected: number;
  revenue_collected: number;
  reviews_requested: number;
  reviews_received: number;
  followups_completed: number;
  content_posts: number;
  planning_completed: boolean;
  end_of_day_review_completed: boolean;
  daily_score: number;
  goal_completion_percentage: number;
  notes?: string | null;
  wins?: string | null;
  problems?: string | null;
  tomorrow_first_actions?: string[];
  source_breakdown?: Record<string, unknown>;
  incomplete_historical_data?: boolean;
  finalized_at?: string | null;
};

const normal = (value?: string | null) => (value ?? "").toLowerCase();
const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);
const hasMoney = (value: number | string | null | undefined) => Number(value ?? 0) > 0;
const samePacificDate = (value: string | null | undefined, day: string) => toPacificDateKey(value) === day;

const isDetailingRevenue = (entry: Pick<RevenueEntry, "stream">) =>
  normal(entry.stream).includes("detailing");

const streamBusinessUnit = (stream: string) => {
  const value = normal(stream);
  if (value.includes("logistics")) return "Great Freight Logistics";
  if (value.includes("shopify")) return "Shopify";
  if (value.includes("stan")) return "Stan Store";
  if (value.includes("content")) return "Content & Brand Deals";
  return DEFAULT_BUSINESS_UNIT;
};

const matchesLeadFilters = (lead: ProgressLead, filters: ProgressFilters = {}) => {
  if (filters.businessUnitId && filters.businessUnitId !== "all" && lead.business_unit_id !== filters.businessUnitId) return false;
  if (filters.leadSource && filters.leadSource !== "all" && lead.source !== filters.leadSource) return false;
  if (filters.city && filters.city !== "all" && lead.city !== filters.city) return false;
  return true;
};

const matchesIncomeFilters = (entry: RevenueEntry, filters: ProgressFilters = {}) => {
  if (filters.incomeSource && filters.incomeSource !== "all" && entry.stream !== filters.incomeSource) return false;
  if (filters.businessUnitId && filters.businessUnitId !== "all") {
    return streamBusinessUnit(entry.stream) === getBusinessUnitName(filters.businessUnitId);
  }
  return true;
};

const activityText = (activity: ProgressActivity) =>
  normal([activity.kind, activity.title, activity.event_type, activity.detail].filter(Boolean).join(" "));

const activityDate = (activity: ProgressActivity) => activity.occurred_at ?? activity.created_at;

const countActivities = (activities: ProgressActivity[], day: string, predicate: (text: string) => boolean) =>
  activities.filter((activity) => samePacificDate(activityDate(activity), day) && predicate(activityText(activity))).length;

const uniqueLeadCount = (leadIds: (string | null | undefined)[]) =>
  new Set(leadIds.filter(Boolean) as string[]).size;

const uniqueLeadDates = (
  leads: ProgressLead[],
  day: string,
  dateSelector: (lead: ProgressLead) => string | null | undefined,
) => uniqueLeadCount(leads.filter((lead) => samePacificDate(dateSelector(lead), day)).map((lead) => lead.id));

const isVerifiedDeposit = (lead: ProgressLead) => {
  const status = normal(lead.deposit_status);
  return hasMoney(lead.deposit) && ["paid", "collected", "received", "complete", "completed"].some((word) => status.includes(word));
};

export function scoreDailyProgress(metrics: Pick<DailyProgressMetrics,
  "revenue_collected" |
  "emails_sent" |
  "texts_sent" |
  "calls_made" |
  "followups_completed" |
  "bookings_created" |
  "appointments_completed" |
  "planning_completed" |
  "end_of_day_review_completed"
>, settings: ProgressScoreSettings = DEFAULT_SCORE_SETTINGS) {
  const incomeRatio = settings.incomeTargetAmount <= 0
    ? metrics.revenue_collected > 0 ? 1 : 0
    : Math.min(1, metrics.revenue_collected / settings.incomeTargetAmount);
  const outreachCompleted = metrics.emails_sent + metrics.texts_sent + metrics.calls_made;
  const outreachRatio = settings.outreachTarget <= 0 ? outreachCompleted > 0 ? 1 : 0 : Math.min(1, outreachCompleted / settings.outreachTarget);
  const followUpRatio = settings.followUpTarget <= 0 ? metrics.followups_completed > 0 ? 1 : 0 : Math.min(1, metrics.followups_completed / settings.followUpTarget);
  const bookingActivity = metrics.bookings_created + metrics.appointments_completed;
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
  progressDate: string,
  settings: ProgressScoreSettings = DEFAULT_SCORE_SETTINGS,
  filters: ProgressFilters = {},
): DailyProgressMetrics {
  const businessUnit = filters.businessUnitId && filters.businessUnitId !== "all"
    ? getBusinessUnitName(filters.businessUnitId)
    : ALL_BUSINESS_UNITS;
  const revenue = inputs.revenueEntries.filter((entry) => entry.entry_date === progressDate && matchesIncomeFilters(entry, filters));
  const leads = inputs.leads.filter((lead) => matchesLeadFilters(lead, filters));
  const leadIds = new Set(leads.map((lead) => lead.id));
  const activities = inputs.activities.filter((activity) => !activity.lead_id || leadIds.has(activity.lead_id));
  const emails = inputs.emailMessages.filter((email) => !email.lead_id || leadIds.has(email.lead_id));

  const sentEmails = emails.filter((email) =>
    email.direction === "outbound" &&
    email.status === "sent" &&
    samePacificDate(email.sent_at ?? email.created_at, progressDate)
  );
  const manualEmailActivities = activities.filter((activity) =>
    samePacificDate(activityDate(activity), progressDate) &&
    activityText(activity).includes("email") &&
    !activityText(activity).includes("zoho email sent")
  );

  const contactActivityLeadIds = activities
    .filter((activity) => samePacificDate(activityDate(activity), progressDate))
    .filter((activity) => /contact|email|text|sms|call|voicemail|reply|follow/.test(activityText(activity)))
    .map((activity) => activity.lead_id);

  const emailLeadIds = sentEmails.map((email) => email.lead_id);
  const leadContactDates = leads
    .filter((lead) =>
      samePacificDate(lead.last_contact_at, progressDate) ||
      samePacificDate(lead.contact_date, progressDate) ||
      samePacificDate(lead.email_sent_at, progressDate) ||
      samePacificDate(lead.text_sent_at, progressDate)
    )
    .map((lead) => lead.id);

  const totalRevenue = revenue.reduce((sum, entry) => sum + numberValue(entry.amount), 0);
  const verifiedDeposits = leads.filter((lead) => isVerifiedDeposit(lead) && samePacificDate(lead.updated_at ?? lead.created_at, progressDate));
  const openDepositRows = leads.filter((lead) => hasMoney(lead.deposit) && !isVerifiedDeposit(lead));
  const reviewReceivedRows = activities.filter((activity) =>
    samePacificDate(activityDate(activity), progressDate) &&
    /review received|review posted|review completed/.test(activityText(activity))
  );

  const metrics: DailyProgressMetrics = {
    progress_date: progressDate,
    business_unit: businessUnit,
    new_leads: leads.filter((lead) => samePacificDate(lead.date_added ?? lead.created_at, progressDate)).length,
    leads_contacted: uniqueLeadCount([...contactActivityLeadIds, ...emailLeadIds, ...leadContactDates]),
    emails_sent: sentEmails.length + manualEmailActivities.length,
    texts_sent: countActivities(activities, progressDate, (text) => text.includes("text") || text.includes("sms")) +
      uniqueLeadDates(leads, progressDate, (lead) => lead.text_sent_at),
    calls_made: countActivities(activities, progressDate, (text) => text.includes("call") || text.includes("voicemail")),
    replies_received: emails.filter((email) =>
      (email.direction === "inbound" || email.status === "reply_synced") &&
      samePacificDate(email.replied_at ?? email.created_at, progressDate)
    ).length + countActivities(activities, progressDate, (text) => text.includes("reply") || text.includes("replied")),
    estimates_sent: countActivities(activities, progressDate, (text) => text.includes("quote") || text.includes("estimate")) +
      leads.filter((lead) => (hasMoney(lead.quote_amount) || hasMoney(lead.estimated_value)) && samePacificDate(lead.updated_at, progressDate)).length,
    bookings_created: countActivities(activities, progressDate, (text) => text.includes("booked") || text.includes("booking")) +
      leads.filter((lead) => lead.status === "Booked" && samePacificDate(lead.booking_at ?? lead.updated_at, progressDate)).length,
    appointments_completed: countActivities(activities, progressDate, (text) => text.includes("completed")) +
      inputs.jobs.filter((job) => job.status === "Completed" && (!job.lead_id || leadIds.has(job.lead_id)) && samePacificDate(job.updated_at ?? job.scheduled_at ?? job.created_at, progressDate)).length +
      leads.filter((lead) => lead.status === "Completed" && samePacificDate(lead.updated_at, progressDate)).length,
    deposits_collected: verifiedDeposits.reduce((sum, lead) => sum + numberValue(lead.deposit), 0),
    revenue_collected: totalRevenue,
    reviews_requested: countActivities(activities, progressDate, (text) => text.includes("review request") || text.includes("review requested")) +
      leads.filter((lead) => lead.status === "Review Requested" && samePacificDate(lead.updated_at, progressDate)).length,
    reviews_received: reviewReceivedRows.length,
    followups_completed: countActivities(activities, progressDate, (text) => text.includes("follow")),
    content_posts: inputs.contentItems.filter((item) =>
      item.stage === "Posted" && samePacificDate(item.updated_at ?? item.created_at, progressDate)
    ).length,
    planning_completed: inputs.dailyCheckins.some((checkin) =>
      checkin.check_date === progressDate && ["morning", "plan"].includes(checkin.kind)
    ),
    end_of_day_review_completed: inputs.dailyCheckins.some((checkin) =>
      checkin.check_date === progressDate && checkin.kind === "evening"
    ),
    daily_score: 0,
    goal_completion_percentage: 0,
    incomplete_historical_data: openDepositRows.length > 0 || reviewReceivedRows.length === 0,
    source_breakdown: {
      revenue_by_source: revenue.reduce<Record<string, number>>((map, entry) => {
        map[entry.stream] = (map[entry.stream] ?? 0) + numberValue(entry.amount);
        return map;
      }, {}),
      deposits_source: "leads.deposit where deposit_status indicates paid/collected/received",
      incomplete_reasons: [
        openDepositRows.length > 0 ? "Some leads have deposit values without verified collected status." : null,
        reviewReceivedRows.length === 0 ? "Reviews received need explicit review-received activity rows to be proven." : null,
      ].filter(Boolean),
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
  const revenue = numberValue(row.revenue_collected ?? row.total_income);
  return {
    progress_date: String(row.progress_date ?? row.business_date ?? ""),
    business_unit: String(row.business_unit ?? DEFAULT_BUSINESS_UNIT),
    new_leads: Number(row.new_leads ?? row.leads_added ?? 0),
    leads_contacted: Number(row.leads_contacted ?? 0),
    emails_sent: Number(row.emails_sent ?? 0),
    texts_sent: Number(row.texts_sent ?? 0),
    calls_made: Number(row.calls_made ?? row.calls_completed ?? 0),
    replies_received: Number(row.replies_received ?? 0),
    estimates_sent: Number(row.estimates_sent ?? row.quotes_sent ?? 0),
    bookings_created: Number(row.bookings_created ?? row.jobs_booked ?? 0),
    appointments_completed: Number(row.appointments_completed ?? row.jobs_completed ?? 0),
    deposits_collected: numberValue(row.deposits_collected),
    revenue_collected: revenue,
    reviews_requested: Number(row.reviews_requested ?? 0),
    reviews_received: Number(row.reviews_received ?? 0),
    followups_completed: Number(row.followups_completed ?? row.follow_ups_completed ?? 0),
    content_posts: Number(row.content_posts ?? row.content_posted ?? 0),
    planning_completed: Boolean(row.planning_completed),
    end_of_day_review_completed: Boolean(row.end_of_day_review_completed),
    daily_score: Number(row.daily_score ?? 0),
    goal_completion_percentage: Number(row.goal_completion_percentage ?? row.daily_score ?? 0),
    notes: typeof row.notes === "string" ? row.notes : null,
    wins: typeof row.wins === "string" ? row.wins : null,
    problems: typeof row.problems === "string" ? row.problems : null,
    tomorrow_first_actions: Array.isArray(row.tomorrow_first_actions) ? row.tomorrow_first_actions.map(String) : [],
    source_breakdown: row.source_breakdown && typeof row.source_breakdown === "object" ? row.source_breakdown as Record<string, unknown> : {},
    incomplete_historical_data: Boolean(row.incomplete_historical_data),
    finalized_at: typeof row.finalized_at === "string" ? row.finalized_at : null,
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
    progress_date: metrics.progress_date,
    business_unit: metrics.business_unit,
    new_leads: metrics.new_leads,
    leads_contacted: metrics.leads_contacted,
    emails_sent: metrics.emails_sent,
    texts_sent: metrics.texts_sent,
    calls_made: metrics.calls_made,
    replies_received: metrics.replies_received,
    estimates_sent: metrics.estimates_sent,
    bookings_created: metrics.bookings_created,
    appointments_completed: metrics.appointments_completed,
    deposits_collected: metrics.deposits_collected,
    revenue_collected: metrics.revenue_collected,
    reviews_requested: metrics.reviews_requested,
    reviews_received: metrics.reviews_received,
    followups_completed: metrics.followups_completed,
    content_posts: metrics.content_posts,
    planning_completed: metrics.planning_completed,
    end_of_day_review_completed: metrics.end_of_day_review_completed,
    daily_score: metrics.daily_score,
    goal_completion_percentage: metrics.goal_completion_percentage,
    notes: extras.notes ?? metrics.notes ?? null,
    wins: extras.wins ?? metrics.wins ?? null,
    problems: extras.problems ?? metrics.problems ?? null,
    tomorrow_first_actions: extras.tomorrow_first_actions ?? metrics.tomorrow_first_actions ?? [],
    source_breakdown: metrics.source_breakdown ?? {},
    incomplete_historical_data: Boolean(metrics.incomplete_historical_data),
    finalized_at: extras.finalized_at ?? metrics.finalized_at ?? null,
  };
}

export function getCurrentExecutionStreak(days: Pick<DailyProgressMetrics, "progress_date" | "daily_score">[], minimumScore = 70, today = new Date()) {
  const byDate = new Map(days.map((day) => [day.progress_date, day.daily_score]));
  let streak = 0;
  let cursor = toPacificDateKey(today);
  for (;;) {
    const score = byDate.get(cursor);
    if (score === undefined || score < minimumScore) break;
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

export function getBestDay(days: DailyProgressMetrics[]) {
  return [...days].sort((a, b) =>
    b.daily_score - a.daily_score ||
    b.revenue_collected - a.revenue_collected ||
    a.progress_date.localeCompare(b.progress_date)
  )[0] ?? null;
}

export function sumDailyMetrics(days: DailyProgressMetrics[]) {
  return days.reduce((sum, day) => ({
    revenue_collected: sum.revenue_collected + day.revenue_collected,
    deposits_collected: sum.deposits_collected + day.deposits_collected,
    new_leads: sum.new_leads + day.new_leads,
    leads_contacted: sum.leads_contacted + day.leads_contacted,
    emails_sent: sum.emails_sent + day.emails_sent,
    texts_sent: sum.texts_sent + day.texts_sent,
    calls_made: sum.calls_made + day.calls_made,
    outreach_completed: sum.outreach_completed + day.emails_sent + day.texts_sent + day.calls_made,
    followups_completed: sum.followups_completed + day.followups_completed,
    replies_received: sum.replies_received + day.replies_received,
    estimates_sent: sum.estimates_sent + day.estimates_sent,
    bookings_created: sum.bookings_created + day.bookings_created,
    appointments_completed: sum.appointments_completed + day.appointments_completed,
    reviews_requested: sum.reviews_requested + day.reviews_requested,
    reviews_received: sum.reviews_received + day.reviews_received,
    content_posts: sum.content_posts + day.content_posts,
    daily_score_total: sum.daily_score_total + day.daily_score,
    incomplete_days: sum.incomplete_days + Number(Boolean(day.incomplete_historical_data)),
  }), {
    revenue_collected: 0,
    deposits_collected: 0,
    new_leads: 0,
    leads_contacted: 0,
    emails_sent: 0,
    texts_sent: 0,
    calls_made: 0,
    outreach_completed: 0,
    followups_completed: 0,
    replies_received: 0,
    estimates_sent: 0,
    bookings_created: 0,
    appointments_completed: 0,
    reviews_requested: 0,
    reviews_received: 0,
    content_posts: 0,
    daily_score_total: 0,
    incomplete_days: 0,
  });
}

export const contactRate = (day: Pick<DailyProgressMetrics, "leads_contacted" | "new_leads">) =>
  day.new_leads > 0 ? Math.round((day.leads_contacted / day.new_leads) * 100) : 0;

export const bookingConversionRate = (bookings: number, contacts: number) =>
  contacts > 0 ? Math.round((bookings / contacts) * 100) : 0;
