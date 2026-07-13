import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { AlertTriangle, CalendarDays, CheckCircle2, DollarSign, Gauge, History, RefreshCw, Save, Send, Trophy, Users } from "lucide-react";
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
import { money, moneyExact } from "@/lib/format";
import { BUSINESS_UNITS, DEFAULT_BUSINESS_UNIT_ID } from "@/lib/crmPipeline";
import {
  DAILY_TARGETS,
  DEFAULT_BUSINESS_UNIT,
  DEFAULT_SCORE_SETTINGS,
  aggregateDailyProgress,
  addDaysISO,
  bookingConversionRate,
  buildSnapshotUpsertPayload,
  contactRate,
  dateDaysAgoPacific,
  eachDate,
  fromScoreSettingsRow,
  getBestDay,
  getBusinessUnitName,
  getCurrentExecutionStreak,
  scoreDailyProgress,
  snapshotRowToMetrics,
  sumDailyMetrics,
  todayPacificISO,
  type DailyProgressInputs,
  type DailyProgressMetrics,
  type ProgressScoreSettings,
} from "@/lib/progress";

type MetricField =
  | "new_leads"
  | "leads_contacted"
  | "emails_sent"
  | "texts_sent"
  | "calls_made"
  | "replies_received"
  | "estimates_sent"
  | "bookings_created"
  | "appointments_completed"
  | "deposits_collected"
  | "revenue_collected"
  | "reviews_requested"
  | "reviews_received"
  | "followups_completed"
  | "content_posts";

type CorrectionField = MetricField | "planning_completed" | "end_of_day_review_completed" | "notes";
type ManualValue = string | number | boolean | null | undefined;
type SnapshotRow = Record<string, unknown> & { progress_date: string; business_unit?: string; id?: string; finalized_at?: string | null };
type ErrorLike = { message: string };
type DbResult<T extends Record<string, unknown> = Record<string, unknown>> = {
  data: T | T[] | null;
  error: ErrorLike | null;
};
type DynamicQuery<T extends Record<string, unknown> = Record<string, unknown>> = PromiseLike<DbResult<T>> & {
  select: (columns?: string) => DynamicQuery<T>;
  eq: (column: string, value: unknown) => DynamicQuery<T>;
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

const rowsFrom = <T,>(value: unknown): T[] => Array.isArray(value) ? (value as T[]) : [];
const singleRowFrom = <T extends Record<string, unknown>>(value: unknown): T | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as T) : null;
const isErrorLike = (error: ErrorLike | null | undefined): error is ErrorLike => Boolean(error);
const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String((error as ErrorLike).message)
      : "Unknown error";

const metricFields: MetricField[] = [
  "new_leads",
  "leads_contacted",
  "emails_sent",
  "texts_sent",
  "calls_made",
  "replies_received",
  "estimates_sent",
  "bookings_created",
  "appointments_completed",
  "deposits_collected",
  "revenue_collected",
  "reviews_requested",
  "reviews_received",
  "followups_completed",
  "content_posts",
];

const correctionFields: CorrectionField[] = [
  ...metricFields,
  "planning_completed",
  "end_of_day_review_completed",
  "notes",
];

const fieldLabels: Record<MetricField, string> = {
  new_leads: "New leads",
  leads_contacted: "Leads contacted",
  emails_sent: "Emails sent",
  texts_sent: "Texts sent",
  calls_made: "Calls made",
  replies_received: "Replies received",
  estimates_sent: "Estimates sent",
  bookings_created: "Bookings created",
  appointments_completed: "Appointments completed",
  deposits_collected: "Deposits collected",
  revenue_collected: "Revenue collected",
  reviews_requested: "Reviews requested",
  reviews_received: "Reviews received",
  followups_completed: "Follow-ups completed",
  content_posts: "Content posts",
};

const outreachTotal = (day: DailyProgressMetrics) => day.emails_sent + day.texts_sent + day.calls_made;
const pct = (value: number, denominator: number) => denominator > 0 ? Math.round((value / denominator) * 100) : 0;
const targetPct = (value: number, target: number) => target > 0 ? Math.min(100, pct(value, target)) : 0;

export default function Progress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(dateDaysAgoPacific(29));
  const [endDate, setEndDate] = useState(todayPacificISO());
  const [businessUnit, setBusinessUnit] = useState(DEFAULT_BUSINESS_UNIT_ID);
  const [incomeSource, setIncomeSource] = useState("all");
  const [leadSource, setLeadSource] = useState("all");
  const [city, setCity] = useState("all");
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

  const selectedBusinessUnitName = getBusinessUnitName(businessUnit);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const dataStart = dateDaysAgoPacific(89, startDate);
    const activityStart = `${addDaysISO(dataStart, -1)}T00:00:00Z`;

    const [
      revenueRes,
      leadsRes,
      activityRes,
      eventRes,
      emailRes,
      jobsRes,
      contentRes,
      checkinsRes,
      snapshotRes,
      settingsRes,
    ] = await Promise.all([
      supabase.from("revenue_entries").select("id,entry_date,stream,amount,notes").gte("entry_date", dataStart).lte("entry_date", endDate),
      supabase.from("leads").select("id,created_at,updated_at,date_added,status,booking_at,business_unit_id,source,city,contact_method,contact_date,email_sent_at,text_sent_at,last_contact_at,outreach_status,quote_amount,estimated_value,deposit,deposit_status,appointment_status"),
      supabase.from("lead_activities").select("id,lead_id,kind,detail,created_at").gte("created_at", activityStart),
      supabase.from("operations_events").select("id,entity_id,event_type,title,detail,source,occurred_at,created_at").eq("entity_type", "lead").gte("occurred_at", activityStart),
      progressDb.from("crm_email_messages").select("id,lead_id,direction,status,sent_at,replied_at,created_at").gte("created_at", activityStart),
      supabase.from("jobs").select("id,lead_id,status,scheduled_at,created_at,updated_at").gte("created_at", activityStart),
      supabase.from("content_items").select("id,stage,posted_url,created_at,updated_at").gte("created_at", activityStart),
      supabase.from("daily_checkins").select("kind,check_date,created_at,notes").gte("check_date", dataStart).lte("check_date", endDate),
      progressDb.from<SnapshotRow>("daily_performance_snapshots").select("*").eq("business_unit", selectedBusinessUnitName).gte("progress_date", dataStart).lte("progress_date", endDate).order("progress_date", { ascending: false }),
      progressDb.from("daily_performance_score_settings").select("*").maybeSingle(),
    ]);

    const error = [revenueRes, leadsRes, activityRes, eventRes, emailRes, jobsRes, contentRes, checkinsRes, snapshotRes, settingsRes]
      .map((result) => result.error)
      .find(isErrorLike);
    if (error) toast.error("Progress data needs attention", { description: error.message });

    const eventActivities = rowsFrom<Record<string, unknown>>(eventRes.data).map((event) => ({
      id: String(event.id ?? ""),
      lead_id: typeof event.entity_id === "string" ? event.entity_id : null,
      kind: typeof event.event_type === "string" ? event.event_type : null,
      title: typeof event.title === "string" ? event.title : null,
      event_type: typeof event.event_type === "string" ? event.event_type : null,
      detail: typeof event.detail === "string" ? event.detail : null,
      source: typeof event.source === "string" ? event.source : null,
      created_at: String(event.created_at ?? ""),
      occurred_at: typeof event.occurred_at === "string" ? event.occurred_at : null,
    }));

    setInputs({
      revenueEntries: revenueRes.data ?? [],
      leads: leadsRes.data ?? [],
      activities: [...(activityRes.data ?? []), ...eventActivities],
      emailMessages: rowsFrom<DailyProgressInputs["emailMessages"][number]>(emailRes.data),
      jobs: jobsRes.data ?? [],
      contentItems: contentRes.data ?? [],
      dailyCheckins: checkinsRes.data ?? [],
    });
    setSnapshots(Object.fromEntries(rowsFrom<SnapshotRow>(snapshotRes.data).map((row) => [row.progress_date, row])));
    setSettings(fromScoreSettingsRow(singleRowFrom(settingsRes.data)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, startDate, endDate, businessUnit]);

  const filters = useMemo(() => ({ businessUnitId: businessUnit, incomeSource, leadSource, city }), [businessUnit, incomeSource, leadSource, city]);

  const liveDays = useMemo(() =>
    eachDate(startDate, endDate).map((day) => aggregateDailyProgress(inputs, day, settings, filters)),
  [inputs, settings, filters, startDate, endDate]);

  const visibleDays = useMemo(() => {
    const today = todayPacificISO();
    return liveDays.map((day) => {
      const snapshot = snapshots[day.progress_date];
      return snapshot && (day.progress_date < today || snapshot.finalized_at) ? snapshotRowToMetrics(snapshot) : day;
    }).sort((a, b) => b.progress_date.localeCompare(a.progress_date));
  }, [liveDays, snapshots]);

  const today = visibleDays.find((day) => day.progress_date === todayPacificISO())
    ?? aggregateDailyProgress(inputs, todayPacificISO(), settings, filters);
  const yesterday = visibleDays.find((day) => day.progress_date === addDaysISO(todayPacificISO(), -1));
  const past7 = visibleDays.filter((day) => day.progress_date >= dateDaysAgoPacific(6));
  const past30 = visibleDays.filter((day) => day.progress_date >= dateDaysAgoPacific(29));
  const sevenTotals = sumDailyMetrics(past7);
  const monthTotals = sumDailyMetrics(past30);
  const bestDay = getBestDay(past30);
  const streak = getCurrentExecutionStreak(visibleDays, settings.minimumScoreForStreak);
  const chartRows = [...visibleDays].reverse().slice(-30).map((day) => ({
    date: day.progress_date.slice(5),
    contacts: day.leads_contacted,
    emails: day.emails_sent,
    texts: day.texts_sent,
    calls: day.calls_made,
    bookings: day.bookings_created,
    revenue: day.revenue_collected,
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

  const saveSnapshot = async (metrics: DailyProgressMetrics, finalize = false) => {
    if (metrics.finalized_at) throw new Error("This day is finalized and immutable.");
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("Sign in again before saving progress.");
    const payload = buildSnapshotUpsertPayload(uid, metrics, {
      notes: metrics.notes,
      wins: metrics.wins,
      problems: metrics.problems,
      tomorrow_first_actions: metrics.tomorrow_first_actions,
      finalized_at: finalize ? new Date().toISOString() : metrics.finalized_at ?? null,
    });
    const result = await progressDb.from<SnapshotRow>("daily_performance_snapshots")
      .upsert(payload, { onConflict: "user_id,business_unit,progress_date" })
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
    if (selected.finalized_at) {
      toast.error("Finalized historical days are immutable.");
      return;
    }
    try {
      const corrected: DailyProgressMetrics = {
        ...selected,
        ...Object.fromEntries(metricFields.map((field) => [field, Number(manualValues[field] ?? 0)])),
        planning_completed: Boolean(manualValues.planning_completed),
        end_of_day_review_completed: Boolean(manualValues.end_of_day_review_completed),
        notes: String(manualValues.notes ?? ""),
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
          progress_date: selected.progress_date,
          business_unit: selected.business_unit,
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

  return (
    <div>
      <PageHeader
        title="Progress"
        description="Persistent daily progress history from verified CRM, activity, revenue, and content records."
        actions={
          <Button size="sm" onClick={refreshTodaySnapshot} disabled={loading || Boolean(today.finalized_at)}>
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

        <section className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
          <ScoreCard day={today} streak={streak} />
          <TodayGoals day={today} />
          <div className="surface p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarDays className="h-4 w-4" />Yesterday</div>
            {yesterday ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Mini label="Contacts" value={yesterday.leads_contacted} />
                <Mini label="Bookings" value={yesterday.bookings_created} />
                <Mini label="Deposits" value={money(yesterday.deposits_collected)} />
                <Mini label="Revenue" value={money(yesterday.revenue_collected)} />
              </div>
            ) : <p className="mt-3 text-sm text-muted-foreground">Incomplete Historical Data</p>}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Daily score" value={`${today.daily_score}%`} icon={Gauge} />
          <StatCard label="Booking conversion" value={`${bookingConversionRate(today.bookings_created, today.leads_contacted)}%`} icon={Trophy} />
          <StatCard label="Contact rate" value={`${contactRate(today)}%`} icon={Users} />
          <StatCard label="Follow-up completion" value={`${today.followups_completed}`} icon={History} />
          <StatCard label="Incomplete data" value={today.incomplete_historical_data ? "Yes" : "No"} icon={AlertTriangle} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <SummaryCard title="Past 7 Days" days={past7} totals={sevenTotals} />
          <SummaryCard title="Past 30 Days" days={past30} totals={monthTotals} bestDay={bestDay} />
        </section>

        <section className="surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Past 7 days detail</h2>
            {sevenTotals.incomplete_days > 0 && <span className="text-xs text-warning">Incomplete Historical Data</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Date","Leads contacted","Emails","Texts","Calls","Replies","Estimates","Bookings","Deposits","Revenue"].map((header) => (
                    <th key={header} className="px-3 py-2 text-left">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {past7.map((day) => (
                  <tr key={day.progress_date} className="border-t">
                    <td className="px-3 py-2"><button className="font-medium underline underline-offset-2" onClick={() => setSelected(day)}>{day.progress_date}</button></td>
                    <td className="px-3 py-2">{day.leads_contacted}</td>
                    <td className="px-3 py-2">{day.emails_sent}</td>
                    <td className="px-3 py-2">{day.texts_sent}</td>
                    <td className="px-3 py-2">{day.calls_made}</td>
                    <td className="px-3 py-2">{day.replies_received}</td>
                    <td className="px-3 py-2">{day.estimates_sent}</td>
                    <td className="px-3 py-2">{day.bookings_created}</td>
                    <td className="px-3 py-2">{money(day.deposits_collected)}</td>
                    <td className="px-3 py-2">{money(day.revenue_collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="surface p-4">
          <h2 className="mb-3 font-display text-base font-semibold">Outreach and revenue history</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chartRows}>
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(value: unknown, name: unknown) => name === "revenue" ? money(Number(value)) : value} />
                <Legend />
                <Bar dataKey="contacts" fill="hsl(var(--forest))" />
                <Bar dataKey="emails" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="bookings" fill="hsl(var(--gold))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-display text-base font-semibold">Calendar History</h2>
            <p className="text-sm text-muted-foreground">Open any date to see the complete scorecard. Finalized historical days are immutable.</p>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading progress...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {["Date","Unit","Score","Contacts","Emails","Texts","Calls","Follow-ups","Replies","Estimates","Bookings","Completed","Deposits","Revenue","Status"].map((header) => (
                      <th key={header} className="px-3 py-2 text-left">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDays.map((day) => (
                    <tr key={`${day.business_unit}-${day.progress_date}`} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2"><button className="font-medium underline underline-offset-2" onClick={() => setSelected(day)}>{day.progress_date}</button></td>
                      <td className="px-3 py-2">{day.business_unit}</td>
                      <td className="px-3 py-2">{day.daily_score}%</td>
                      <td className="px-3 py-2">{day.leads_contacted}</td>
                      <td className="px-3 py-2">{day.emails_sent}</td>
                      <td className="px-3 py-2">{day.texts_sent}</td>
                      <td className="px-3 py-2">{day.calls_made}</td>
                      <td className="px-3 py-2">{day.followups_completed}</td>
                      <td className="px-3 py-2">{day.replies_received}</td>
                      <td className="px-3 py-2">{day.estimates_sent}</td>
                      <td className="px-3 py-2">{day.bookings_created}</td>
                      <td className="px-3 py-2">{day.appointments_completed}</td>
                      <td className="px-3 py-2">{money(day.deposits_collected)}</td>
                      <td className="px-3 py-2">{money(day.revenue_collected)}</td>
                      <td className="px-3 py-2 text-xs">{day.incomplete_historical_data ? "Incomplete Historical Data" : day.finalized_at ? "Finalized" : "Live/Cache"}</td>
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
            <DialogTitle>{selected?.progress_date} scorecard</DialogTitle>
            <DialogDescription>{selected?.business_unit} daily progress snapshot.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.incomplete_historical_data && <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">Incomplete Historical Data</div>}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Mini label="Score" value={`${selected.daily_score}%`} />
                <Mini label="Revenue" value={moneyExact(selected.revenue_collected)} />
                <Mini label="Deposits" value={moneyExact(selected.deposits_collected)} />
                <Mini label="Bookings" value={selected.bookings_created} />
                <Mini label="Contact rate" value={`${contactRate(selected)}%`} />
                <Mini label="Booking conversion" value={`${bookingConversionRate(selected.bookings_created, selected.leads_contacted)}%`} />
                <Mini label="Follow-ups" value={selected.followups_completed} />
                <Mini label="Reviews" value={`${selected.reviews_requested}/${selected.reviews_received}`} />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {metricFields.map((field) => <Mini key={field} label={fieldLabels[field]} value={field.includes("revenue") || field.includes("deposit") ? money(selected[field]) : selected[field]} />)}
              </div>
              {selected.notes && <div className="rounded-md border p-3 text-sm"><span className="font-medium">Notes:</span> {selected.notes}</div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(selected?.finalized_at)} onClick={() => setManualOpen(true)}>Correct / add note</Button>
            <Button onClick={() => setSelected(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manual correction</DialogTitle>
            <DialogDescription>Use only to fix missing source activity or add context. Finalized days cannot be changed.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-3">
            {metricFields.map((field) => (
              <Field key={field} label={fieldLabels[field]}>
                <Input type="number" step={field.includes("revenue") || field.includes("deposit") ? "0.01" : "1"} value={manualValues[field] ?? 0} onChange={(event) => setManualValues({ ...manualValues, [field]: event.target.value })} />
              </Field>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(manualValues.planning_completed)} onCheckedChange={(value) => setManualValues({ ...manualValues, planning_completed: Boolean(value) })} />Planning complete</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={Boolean(manualValues.end_of_day_review_completed)} onCheckedChange={(value) => setManualValues({ ...manualValues, end_of_day_review_completed: Boolean(value) })} />End-of-day review complete</label>
          </div>
          <Field label="Notes"><Textarea rows={3} value={String(manualValues.notes ?? "")} onChange={(event) => setManualValues({ ...manualValues, notes: event.target.value })} /></Field>
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
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Gauge className="h-4 w-4" />Today's Daily Score</div>
      <div className="mt-3 text-5xl font-semibold tabular-nums">{day.daily_score}%</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background"><div className="h-full bg-gold" style={{ width: `${day.daily_score}%` }} /></div>
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Trophy className="h-4 w-4" />{streak} day execution streak</div>
    </div>
  );
}

function TodayGoals({ day }: { day: DailyProgressMetrics }) {
  const goals = [
    ["New leads", day.new_leads, DAILY_TARGETS.new_leads],
    ["Emails", day.emails_sent, DAILY_TARGETS.emails_sent],
    ["Texts", day.texts_sent, DAILY_TARGETS.texts_sent],
    ["Calls", day.calls_made, DAILY_TARGETS.calls_made],
    ["Estimates", day.estimates_sent, DAILY_TARGETS.estimates_sent],
    ["Bookings", day.bookings_created, DAILY_TARGETS.bookings_created],
    ["Review requests", day.reviews_requested, DAILY_TARGETS.reviews_requested],
  ] as const;
  return (
    <div className="surface p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CheckCircle2 className="h-4 w-4" />Today vs Goal</div>
      <div className="mt-3 space-y-2">
        {goals.map(([label, value, target]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs"><span>{label}</span><span>{value}/{target}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full bg-forest" style={{ width: `${targetPct(value, target)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ title, days, totals, bestDay }: { title: string; days: DailyProgressMetrics[]; totals: ReturnType<typeof sumDailyMetrics>; bestDay?: DailyProgressMetrics | null }) {
  const avg = (value: number) => days.length ? Math.round(value / days.length) : 0;
  return (
    <div className="surface p-4">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Mini label="Revenue total" value={money(totals.revenue_collected)} />
        <Mini label="Deposits" value={money(totals.deposits_collected)} />
        <Mini label="Daily avg contacts" value={avg(totals.leads_contacted)} />
        <Mini label="Daily avg revenue" value={money(days.length ? totals.revenue_collected / days.length : 0)} />
        <Mini label="Leads contacted" value={totals.leads_contacted} />
        <Mini label="Emails" value={totals.emails_sent} />
        <Mini label="Texts" value={totals.texts_sent} />
        <Mini label="Calls" value={totals.calls_made} />
        <Mini label="Replies" value={totals.replies_received} />
        <Mini label="Estimates" value={totals.estimates_sent} />
        <Mini label="Bookings" value={totals.bookings_created} />
        <Mini label="Booking conversion" value={`${bookingConversionRate(totals.bookings_created, totals.leads_contacted)}%`} />
        {bestDay && <Mini label="Best day" value={`${bestDay.progress_date} · ${bestDay.daily_score}%`} />}
        {totals.incomplete_days > 0 && <Mini label="Data quality" value="Incomplete Historical Data" />}
      </div>
    </div>
  );
}
