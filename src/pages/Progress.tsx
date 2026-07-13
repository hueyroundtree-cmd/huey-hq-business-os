import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { CalendarDays, CheckCircle2, DollarSign, Gauge, History, MessageSquare, RefreshCw, Save, Send, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { money, moneyExact, startOfMonthISO, startOfWeekISO, todayISO } from "@/lib/format";
import { BUSINESS_UNITS } from "@/lib/crmPipeline";
import {
  DEFAULT_SCORE_SETTINGS,
  aggregateDailyProgress,
  buildSnapshotUpsertPayload,
  fromScoreSettingsRow,
  getBestDay,
  getCurrentExecutionStreak,
  scoreDailyProgress,
  snapshotRowToMetrics,
  sumDailyMetrics,
  type DailyProgressInputs,
  type DailyProgressMetrics,
  type ProgressScoreSettings,
} from "@/lib/progress";

const dateDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const eachDate = (start: string, end: string) => {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const outreachTotal = (day: DailyProgressMetrics) =>
  day.emails_sent + day.texts_sent + day.calls_completed + day.contact_forms_submitted;

const pct = (value: number, denominator: number) =>
  denominator > 0 ? Math.round((value / denominator) * 100) : 0;

const metricFields = [
  "total_income",
  "detailing_income",
  "other_income",
  "leads_added",
  "emails_sent",
  "texts_sent",
  "calls_completed",
  "contact_forms_submitted",
  "follow_ups_completed",
  "replies_received",
  "quotes_sent",
  "jobs_booked",
  "jobs_completed",
  "reviews_requested",
  "content_posted",
] as const;

type MetricField = typeof metricFields[number];
type CorrectionField = MetricField | "planning_completed" | "end_of_day_review_completed" | "notes";
type ManualValue = string | number | boolean | null | undefined;
type SnapshotRow = Record<string, unknown> & { business_date: string; id?: string };
type ErrorLike = { message: string };
type DbResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T | T[] | null;
  error: ErrorLike | null;
};
type DynamicQuery<T extends Record<string, unknown> = Record<string, unknown>> = PromiseLike<DbResult<T>> & {
  select: (columns?: string) => DynamicQuery<T>;
  gte: (column: string, value: string) => DynamicQuery<T>;
  lte: (column: string, value: string) => DynamicQuery<T>;
  order: (column: string, options?: { ascending?: boolean }) => DynamicQuery<T>;
  upsert: (payload: unknown, options?: Record<string, unknown>) => DynamicQuery<T>;
  maybeSingle: () => Promise<DbResult<T>>;
  single: () => Promise<DbResult<T>>;
  insert: (payload: unknown) => Promise<DbResult<T>>;
};

const progressDb = supabase as unknown as {
  from: <T extends Record<string, unknown> = Record<string, unknown>>(table: string) => DynamicQuery<T>;
};

const correctionFields: CorrectionField[] = [
  ...metricFields,
  "planning_completed",
  "end_of_day_review_completed",
  "notes",
];

const isErrorLike = (error: ErrorLike | null | undefined): error is ErrorLike => Boolean(error);
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as ErrorLike).message)
      : "Unknown error";
const rowsFrom = <T,>(value: unknown): T[] => Array.isArray(value) ? (value as T[]) : [];
const singleRowFrom = <T extends Record<string, unknown>>(value: unknown): T | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as T) : null;

const fieldLabels: Record<MetricField, string> = {
  total_income: "Total income",
  detailing_income: "Detailing income",
  other_income: "Other income",
  leads_added: "Leads added",
  emails_sent: "Emails sent",
  texts_sent: "Texts sent",
  calls_completed: "Calls completed",
  contact_forms_submitted: "Contact forms submitted",
  follow_ups_completed: "Follow-ups completed",
  replies_received: "Replies received",
  quotes_sent: "Quotes sent",
  jobs_booked: "Jobs booked",
  jobs_completed: "Jobs completed",
  reviews_requested: "Reviews requested",
  content_posted: "Content posted",
};

export default function Progress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dateDaysAgo(29));
  const [endDate, setEndDate] = useState(todayISO());
  const [businessUnit, setBusinessUnit] = useState("all");
  const [incomeSource, setIncomeSource] = useState("all");
  const [leadSource, setLeadSource] = useState("all");
  const [city, setCity] = useState("all");
  const [chartDays, setChartDays] = useState(30);
  const [settings, setSettings] = useState<ProgressScoreSettings>(DEFAULT_SCORE_SETTINGS);
  const [inputs, setInputs] = useState<DailyProgressInputs>({
    revenueEntries: [],
    leads: [],
    activities: [],
    emailMessages: [],
    jobs: [],
    contentItems: [],
    dailyCheckins: [],
  });
  const [snapshots, setSnapshots] = useState<Record<string, SnapshotRow>>({});
  const [selected, setSelected] = useState<DailyProgressMetrics | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");
  const [manualValues, setManualValues] = useState<Record<string, ManualValue>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const monthStart = startOfMonthISO();
    const priorMonthStart = (() => {
      const date = new Date(`${monthStart}T00:00:00`);
      date.setMonth(date.getMonth() - 1);
      return date.toISOString().slice(0, 10);
    })();
    const dataStart = [startDate, dateDaysAgo(89), priorMonthStart].sort()[0];
    const dataEnd = endDate;

    const [
      revenueRes,
      leadsRes,
      activityRes,
      emailRes,
      jobsRes,
      contentRes,
      checkinsRes,
      snapshotRes,
      settingsRes,
    ] = await Promise.all([
      supabase.from("revenue_entries").select("id,entry_date,stream,amount").gte("entry_date", dataStart).lte("entry_date", dataEnd),
      supabase.from("leads").select("id,created_at,updated_at,date_added,status,booking_at,business_unit_id,source,city,contact_method,contact_date,email_sent_at,text_sent_at,last_contact_at,outreach_status,quote_amount,appointment_status").gte("created_at", `${dataStart}T00:00:00Z`),
      supabase.from("lead_activities").select("id,lead_id,kind,detail,created_at").gte("created_at", `${dataStart}T00:00:00Z`),
      progressDb.from("crm_email_messages").select("id,lead_id,direction,status,sent_at,replied_at,created_at").gte("created_at", `${dataStart}T00:00:00Z`),
      supabase.from("jobs").select("id,status,scheduled_at,created_at,updated_at").gte("created_at", `${dataStart}T00:00:00Z`),
      supabase.from("content_items").select("id,stage,posted_url,created_at,updated_at").gte("created_at", `${dataStart}T00:00:00Z`),
      supabase.from("daily_checkins").select("kind,check_date,created_at,notes").gte("check_date", dataStart).lte("check_date", dataEnd),
      progressDb.from<SnapshotRow>("daily_performance_snapshots").select("*").gte("business_date", dataStart).lte("business_date", dataEnd).order("business_date", { ascending: false }),
      progressDb.from("daily_performance_score_settings").select("*").maybeSingle(),
    ]);

    const error = [revenueRes, leadsRes, activityRes, emailRes, jobsRes, contentRes, checkinsRes, snapshotRes, settingsRes]
      .map((result) => result.error)
      .find(isErrorLike);
    if (error) toast.error("Progress data needs attention", { description: error.message });

    setInputs({
      revenueEntries: revenueRes.data ?? [],
      leads: leadsRes.data ?? [],
      activities: activityRes.data ?? [],
      emailMessages: rowsFrom<DailyProgressInputs["emailMessages"][number]>(emailRes.data),
      jobs: jobsRes.data ?? [],
      contentItems: contentRes.data ?? [],
      dailyCheckins: checkinsRes.data ?? [],
    });
    setSnapshots(Object.fromEntries(rowsFrom<SnapshotRow>(snapshotRes.data).map((row) => [row.business_date, row])));
    setSettings(fromScoreSettingsRow(singleRowFrom(settingsRes.data)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, startDate, endDate]);

  const filters = useMemo(() => ({ businessUnitId: businessUnit, incomeSource, leadSource, city }), [businessUnit, incomeSource, leadSource, city]);

  const liveDays = useMemo(() =>
    eachDate(startDate, endDate).map((day) => aggregateDailyProgress(inputs, day, settings, filters)),
  [inputs, settings, filters, startDate, endDate]);

  const visibleDays = useMemo(() => {
    const today = todayISO();
    return liveDays.map((day) => {
      const snapshot = snapshots[day.business_date];
      return snapshot && day.business_date < today ? snapshotRowToMetrics(snapshot) : day;
    }).sort((a, b) => b.business_date.localeCompare(a.business_date));
  }, [liveDays, snapshots]);

  const today = visibleDays.find((day) => day.business_date === todayISO())
    ?? aggregateDailyProgress(inputs, todayISO(), settings, filters);
  const weekDays = visibleDays.filter((day) => day.business_date >= startOfWeekISO());
  const monthDays = visibleDays.filter((day) => day.business_date >= startOfMonthISO());
  const weekly = sumDailyMetrics(weekDays);
  const monthly = sumDailyMetrics(monthDays);
  const bestDay = getBestDay(visibleDays);
  const streak = getCurrentExecutionStreak(visibleDays, settings.minimumScoreForStreak);
  const chartRows = [...visibleDays].reverse().slice(-chartDays).map((day) => ({
    date: day.business_date.slice(5),
    income: day.total_income,
    score: day.daily_score,
    outreach: outreachTotal(day),
    bookings: day.jobs_booked,
    leads: day.leads_added,
    contacted: outreachTotal(day),
  }));

  const incomeSources = useMemo(() => Array.from(new Set(inputs.revenueEntries.map((entry) => entry.stream))).filter(Boolean), [inputs.revenueEntries]);
  const leadSources = useMemo(() => Array.from(new Set(inputs.leads.map((lead) => lead.source).filter(Boolean))) as string[], [inputs.leads]);
  const cities = useMemo(() => Array.from(new Set(inputs.leads.map((lead) => lead.city).filter(Boolean))) as string[], [inputs.leads]);

  useEffect(() => {
    if (!selected) return;
    setManualValues({
      ...Object.fromEntries(metricFields.map((field) => [field, selected[field]])),
      planning_completed: selected.planning_completed,
      end_of_day_review_completed: selected.end_of_day_review_completed,
      notes: selected.notes ?? "",
    });
  }, [selected]);

  const selectedActivities = useMemo(() => {
    if (!selected) return [];
    const day = selected.business_date;
    const activityRows = inputs.activities
      .filter((activity) => (activity.created_at ?? "").slice(0, 10) === day)
      .map((activity) => ({
        id: activity.id ?? `${activity.created_at}-${activity.kind}`,
        at: activity.created_at ?? "",
        label: activity.kind ?? "Activity",
        detail: activity.detail ?? "",
      }));
    const emailRows = inputs.emailMessages
      .filter((email) => ((email.sent_at ?? email.replied_at ?? email.created_at) ?? "").slice(0, 10) === day)
      .map((email) => ({
        id: email.id ?? `${email.created_at}-${email.status}`,
        at: email.sent_at ?? email.replied_at ?? email.created_at,
        label: `${email.direction} email - ${email.status}`,
        detail: "",
      }));
    return [...activityRows, ...emailRows].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  }, [selected, inputs]);

  const saveSnapshot = async (metrics: DailyProgressMetrics, finalize = false) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("Sign in again before saving progress.");
    const payload = buildSnapshotUpsertPayload(uid, metrics, {
      notes: metrics.notes,
      wins: metrics.wins,
      problems: metrics.problems,
      tomorrow_first_actions: metrics.tomorrow_first_actions,
      finalized_at: finalize ? new Date().toISOString() : null,
    });
    const result = await progressDb.from<SnapshotRow>("daily_performance_snapshots")
      .upsert(payload, { onConflict: "user_id,business_date" })
      .select("*")
      .single();
    if (result.error) throw result.error;
    const saved = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!saved) throw new Error("Snapshot save returned no row.");
    return saved;
  };

  const refreshTodaySnapshot = async () => {
    try {
      await saveSnapshot(today);
      toast.success("Today's progress snapshot updated");
      await load();
    } catch (error: unknown) {
      toast.error("Snapshot update failed", { description: errorMessage(error) });
    }
  };

  const saveManualCorrections = async () => {
    if (!selected) return;
    try {
      const corrected: DailyProgressMetrics = {
        ...selected,
        ...Object.fromEntries(metricFields.map((field) => [field, Number(manualValues[field] ?? 0)])),
        planning_completed: Boolean(manualValues.planning_completed),
        end_of_day_review_completed: Boolean(manualValues.end_of_day_review_completed),
        notes: manualValues.notes ?? "",
      };
      corrected.daily_score = scoreDailyProgress(corrected, settings);
      corrected.goal_completion_percentage = corrected.daily_score;
      const saved = await saveSnapshot(corrected);

      const changed = correctionFields.filter((field) =>
        JSON.stringify(selected[field] ?? "") !== JSON.stringify(corrected[field] ?? ""),
      );

      if (changed.length) {
        const { data: auth } = await supabase.auth.getUser();
        const correctionUserId = auth.user?.id;
        if (!correctionUserId) throw new Error("Sign in again before saving corrections.");
        const rows = changed.map((field) => ({
          user_id: correctionUserId,
          snapshot_id: saved.id,
          business_date: selected.business_date,
          field_name: field,
          previous_value: selected[field] ?? null,
          new_value: corrected[field] ?? null,
          reason: correctionReason || "Manual correction from Progress page",
        }));
        const correctionResult = await progressDb.from("daily_performance_manual_corrections").insert(rows);
        if (correctionResult.error) throw correctionResult.error;
      }

      toast.success("Manual correction saved");
      setManualOpen(false);
      setCorrectionReason("");
      await load();
      setSelected(corrected);
    } catch (error: unknown) {
      toast.error("Manual correction failed", { description: errorMessage(error) });
    }
  };

  const currentMonth = startOfMonthISO().slice(0, 7);
  const previousMonth = (() => {
    const date = new Date(`${startOfMonthISO()}T00:00:00`);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  })();
  const currentMonthIncome = visibleDays.filter((day) => day.business_date.startsWith(currentMonth)).reduce((sum, day) => sum + day.total_income, 0);
  const previousMonthIncome = visibleDays.filter((day) => day.business_date.startsWith(previousMonth)).reduce((sum, day) => sum + day.total_income, 0);
  const leadWins = inputs.leads.filter((lead) => ["Booked", "Completed"].includes(lead.status ?? ""));
  const bestLeadSource = topGroup(leadWins.map((lead) => lead.source).filter(Boolean) as string[]);
  const bestCity = topGroup(leadWins.map((lead) => lead.city).filter(Boolean) as string[]);

  return (
    <div>
      <PageHeader
        title="Progress"
        description="Daily performance history for income, outreach, bookings, and execution."
        actions={
          <Button size="sm" onClick={refreshTodaySnapshot} disabled={loading}>
            <RefreshCw className="mr-1.5 h-4 w-4" />Update today
          </Button>
        }
      />

      <div className="space-y-6 p-4 md:p-6">
        <section className="surface p-4">
          <div className="grid gap-3 md:grid-cols-6">
            <Field label="Start"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="End"><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
            <Field label="Business unit">
              <Select value={businessUnit} onValueChange={setBusinessUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All units</SelectItem>
                  {BUSINESS_UNITS.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Income source">
              <Select value={incomeSource} onValueChange={setIncomeSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {incomeSources.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lead source">
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {leadSources.map((source) => <SelectItem key={source} value={source}>{source}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="City">
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cities</SelectItem>
                  {cities.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr]">
          <ScoreCard day={today} streak={streak} />
          <div className="surface p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><DollarSign className="h-4 w-4" />Today's income</div>
            <div className="mt-3 text-4xl font-semibold">{money(today.total_income)}</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Mini label="Detailing" value={money(today.detailing_income)} />
              <Mini label="Gig / other" value={money(today.other_income)} />
            </div>
          </div>
          <div className="surface p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Send className="h-4 w-4" />Today's outreach</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Mini label="Emails" value={today.emails_sent} />
              <Mini label="Texts" value={today.texts_sent} />
              <Mini label="Calls" value={today.calls_completed} />
              <Mini label="Forms" value={today.contact_forms_submitted} />
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="New leads" value={today.leads_added} icon={Users} />
          <StatCard label="Follow-ups" value={today.follow_ups_completed} icon={History} />
          <StatCard label="Replies" value={today.replies_received} icon={MessageSquare} />
          <StatCard label="Quotes sent" value={today.quotes_sent} icon={Send} />
          <StatCard label="Booked / completed" value={`${today.jobs_booked}/${today.jobs_completed}`} icon={CheckCircle2} />
        </section>

        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Daily checklist</h2>
            <Button size="sm" variant="outline" onClick={() => { setSelected(today); setManualOpen(true); }}>
              <Save className="mr-1.5 h-3.5 w-3.5" />Correct today
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Checklist label="Planning complete" checked={today.planning_completed} />
            <Checklist label="End-of-day review complete" checked={today.end_of_day_review_completed} />
            <Checklist label="Income-producing activity" checked={today.total_income > 0} />
            <Checklist label="Actual outreach completed" checked={outreachTotal(today) > 0} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="surface p-4">
            <h2 className="font-display text-base font-semibold">Weekly performance</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Mini label="Weekly income" value={money(weekly.total_income)} />
              <Mini label="Weekly goal" value={money(settings.weeklyIncomeGoal)} />
              <Mini label="Average daily income" value={money(weekDays.length ? weekly.total_income / weekDays.length : 0)} />
              <Mini label="Total leads" value={weekly.leads_added} />
              <Mini label="Total outreach" value={weekly.outreach_completed} />
              <Mini label="Follow-ups" value={weekly.follow_ups_completed} />
              <Mini label="Replies" value={weekly.replies_received} />
              <Mini label="Quotes" value={weekly.quotes_sent} />
              <Mini label="Bookings" value={weekly.jobs_booked} />
              <Mini label="Completed jobs" value={weekly.jobs_completed} />
              <Mini label="Booking rate" value={`${pct(weekly.jobs_booked, weekly.outreach_completed)}%`} />
              <Mini label="Response rate" value={`${pct(weekly.replies_received, weekly.outreach_completed)}%`} />
              <Mini label="Current streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
              <Mini label="Best day" value={bestDay?.business_date ?? "-"} />
              <Mini label="Weekly score" value={`${weekDays.length ? Math.round(weekly.daily_score_total / weekDays.length) : 0}%`} />
            </div>
          </div>

          <div className="surface p-4">
            <h2 className="font-display text-base font-semibold">Monthly performance</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Mini label="MTD income" value={money(monthly.total_income)} />
              <Mini label="Monthly goal progress" value={`${pct(monthly.total_income, settings.monthlyIncomeGoal)}%`} />
              <Mini label="Detailing income" value={money(monthly.detailing_income)} />
              <Mini label="Other income" value={money(monthly.other_income)} />
              <Mini label="Outreach totals" value={monthly.outreach_completed} />
              <Mini label="Bookings" value={monthly.jobs_booked} />
              <Mini label="Completed jobs" value={monthly.jobs_completed} />
              <Mini label="Reviews requested" value={monthly.reviews_requested} />
              <Mini label="Best lead source" value={bestLeadSource ?? "-"} />
              <Mini label="Best city" value={bestCity ?? "-"} />
              <Mini label="MoM comparison" value={previousMonthIncome ? `${money(currentMonthIncome - previousMonthIncome)} vs prior` : "Need prior month"} />
            </div>
          </div>
        </section>

        <section className="surface p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-base font-semibold">Charts</h2>
            <div className="flex gap-2">
              {[7, 30, 90].map((days) => (
                <Button key={days} size="sm" variant={chartDays === days ? "default" : "outline"} onClick={() => setChartDays(days)}>{days}d</Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Chart title="Daily income">
              <LineChart data={chartRows}><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><Tooltip formatter={(value: unknown) => money(Number(value))} /><Line type="monotone" dataKey="income" stroke="hsl(var(--gold))" strokeWidth={2} /></LineChart>
            </Chart>
            <Chart title="Daily score history">
              <LineChart data={chartRows}><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="score" stroke="hsl(var(--forest))" strokeWidth={2} /></LineChart>
            </Chart>
            <Chart title="Outreach versus bookings">
              <BarChart data={chartRows}><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Legend /><Bar dataKey="outreach" fill="hsl(var(--forest))" /><Bar dataKey="bookings" fill="hsl(var(--gold))" /></BarChart>
            </Chart>
            <Chart title="Leads added versus contacted">
              <BarChart data={chartRows}><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><Tooltip /><Legend /><Bar dataKey="leads" fill="hsl(var(--muted-foreground))" /><Bar dataKey="contacted" fill="hsl(var(--gold))" /></BarChart>
            </Chart>
            <Chart title="Revenue by source">
              <BarChart data={incomeSources.map((source) => ({
                source,
                amount: inputs.revenueEntries.filter((entry) => entry.stream === source).reduce((sum, entry) => sum + Number(entry.amount), 0),
              }))}><XAxis dataKey="source" fontSize={10} /><YAxis fontSize={10} /><Tooltip formatter={(value: unknown) => money(Number(value))} /><Bar dataKey="amount" fill="hsl(var(--gold))" /></BarChart>
            </Chart>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-display text-base font-semibold">Past days</h2>
            <p className="text-sm text-muted-foreground">Open any day to inspect full activity, preserve history, or apply a correction.</p>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading progress...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {["Date","Total income","Detailing","Other","Leads","Emails","Texts","Calls","Follow-ups","Replies","Quotes","Bookings","Completed","Reviews","Score","Notes"].map((header) => (
                      <th key={header} className="px-3 py-2 text-left">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDays.map((day) => (
                    <tr key={day.business_date} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2"><button className="font-medium underline underline-offset-2" onClick={() => setSelected(day)}>{day.business_date}</button></td>
                      <td className="px-3 py-2">{money(day.total_income)}</td>
                      <td className="px-3 py-2">{money(day.detailing_income)}</td>
                      <td className="px-3 py-2">{money(day.other_income)}</td>
                      <td className="px-3 py-2">{day.leads_added}</td>
                      <td className="px-3 py-2">{day.emails_sent}</td>
                      <td className="px-3 py-2">{day.texts_sent}</td>
                      <td className="px-3 py-2">{day.calls_completed}</td>
                      <td className="px-3 py-2">{day.follow_ups_completed}</td>
                      <td className="px-3 py-2">{day.replies_received}</td>
                      <td className="px-3 py-2">{day.quotes_sent}</td>
                      <td className="px-3 py-2">{day.jobs_booked}</td>
                      <td className="px-3 py-2">{day.jobs_completed}</td>
                      <td className="px-3 py-2">{day.reviews_requested}</td>
                      <td className="px-3 py-2">{day.daily_score}%</td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-muted-foreground">{day.notes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.business_date} activity</DialogTitle>
            <DialogDescription>Live data plus any saved snapshot or manual corrections.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Mini label="Score" value={`${selected.daily_score}%`} />
                <Mini label="Income" value={moneyExact(selected.total_income)} />
                <Mini label="Outreach" value={outreachTotal(selected)} />
                <Mini label="Bookings" value={selected.jobs_booked} />
              </div>
              <div className="rounded-md border p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</div>
                {selectedActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity rows found for this day.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedActivities.map((activity) => (
                      <div key={activity.id} className="rounded border bg-background p-2">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="font-medium">{activity.label}</span>
                          <span className="text-xs text-muted-foreground">{new Date(activity.at).toLocaleString()}</span>
                        </div>
                        {activity.detail && <p className="mt-1 text-xs text-muted-foreground">{activity.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selected.notes && <div className="rounded-md border p-3 text-sm"><span className="font-medium">Notes:</span> {selected.notes}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(true)}>Correct / add note</Button>
            <Button onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual correction</DialogTitle>
            <DialogDescription>Use this only to fix missing activity or add context. Every changed field is written to the correction audit trail.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            {metricFields.map((field) => (
              <Field key={field} label={fieldLabels[field]}>
                <Input type="number" step={field.includes("income") ? "0.01" : "1"} value={manualValues[field] ?? 0} onChange={(event) => setManualValues({ ...manualValues, [field]: event.target.value })} />
              </Field>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(manualValues.planning_completed)} onCheckedChange={(value) => setManualValues({ ...manualValues, planning_completed: Boolean(value) })} />Planning complete</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(manualValues.end_of_day_review_completed)} onCheckedChange={(value) => setManualValues({ ...manualValues, end_of_day_review_completed: Boolean(value) })} />End-of-day review complete</label>
          </div>
          <Field label="Notes"><Textarea rows={3} value={manualValues.notes ?? ""} onChange={(event) => setManualValues({ ...manualValues, notes: event.target.value })} /></Field>
          <Field label="Correction reason"><Input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Example: Missing phone call logged late" /></Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Cancel</Button>
            <Button onClick={saveManualCorrections}>Save correction</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function topGroup(values: string[]) {
  const counts = values.reduce<Record<string, number>>((map, value) => {
    map[value] = (map[value] ?? 0) + 1;
    return map;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md border bg-background p-2"><div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-semibold tabular-nums">{value}</div></div>;
}

function StatCard({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: typeof Users }) {
  return <div className="stat-card"><div className="flex items-center justify-between"><span className="stat-label">{label}</span><Icon className="h-4 w-4 text-muted-foreground" /></div><div className="stat-value">{value}</div></div>;
}

function ScoreCard({ day, streak }: { day: DailyProgressMetrics; streak: number }) {
  return (
    <div className="surface border-gold/40 bg-gold/5 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Gauge className="h-4 w-4" />Today's score</div>
      <div className="mt-3 text-5xl font-semibold tabular-nums">{day.daily_score}%</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background"><div className="h-full bg-gold" style={{ width: `${day.daily_score}%` }} /></div>
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Trophy className="h-4 w-4" />{streak} day execution streak</div>
    </div>
  );
}

function Checklist({ label, checked }: { label: string; checked: boolean }) {
  return <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm">{checked ? <CheckCircle2 className="h-4 w-4 text-forest" /> : <CalendarDays className="h-4 w-4 text-muted-foreground" />}<span>{label}</span></div>;
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="h-56">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
