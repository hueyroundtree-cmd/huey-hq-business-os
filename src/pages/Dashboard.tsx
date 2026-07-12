import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { money, todayISO, startOfWeekISO, startOfMonthISO, relTime } from "@/lib/format";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import {
  Sunrise, Moon, DollarSign, Users, Bell, FileText, Wrench, AlertTriangle,
  Plug, FolderKanban, BookOpenCheck, ScrollText, Bot, Workflow, CheckCircle2,
  CalendarDays, Video, Target, Sparkles, Plus, Gauge,
  Dumbbell, GraduationCap, Send, CloudUpload, CalendarPlus, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, Link } from "react-router-dom";
import { NOTION_ENTITIES, type NotionEntityKey } from "@/lib/notionEntities";
import {
  buildDailyPlanPayload,
  buildDailyPlanSyncRequest,
  getDailyDriverScore,
  getNotionHealth,
  type NotionMappingHealth,
} from "@/lib/dashboard";
import { getNextFollowUps, getOpenPipelineValue, type LeadStatus } from "@/lib/crmPipeline";

type Integration = { provider: string; status: "Connected" | "Not Connected" | "Error"; last_sync_at: string | null };

type AreaSummary = {
  key: NotionEntityKey;
  label: string;
  value: string;
  detail: string;
  to: string;
  icon: typeof FileText;
};

type FollowUpLead = {
  id: string;
  name: string;
  business: string | null;
  status: LeadStatus;
  estimated_value: number | null;
  next_follow_up_at: string | null;
};

type DailyActionKey = "money" | "content" | "outreach" | "skill" | "health";
type DailyPlan = {
  actions: Record<DailyActionKey, string>;
  completed: Record<DailyActionKey, boolean>;
};

const EMPTY_PLAN: DailyPlan = {
  actions: { money: "", content: "", outreach: "", skill: "", health: "" },
  completed: { money: false, content: false, outreach: false, skill: false, health: false },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [revToday, setRevToday] = useState(0);
  const [revWeek, setRevWeek] = useState(0);
  const [revMonth, setRevMonth] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [contactedToday, setContactedToday] = useState(0);
  const [appointmentsScheduled, setAppointmentsScheduled] = useState(0);
  const [followUpsDue, setFollowUpsDue] = useState(0);
  const [jobsToday, setJobsToday] = useState(0);
  const [billsDueTotal, setBillsDueTotal] = useState(0);
  const [contentDue, setContentDue] = useState(0);
  const [cash, setCash] = useState<number | null>(null);
  const [morning, setMorning] = useState<any | null>(null);
  const [evening, setEvening] = useState<any | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [notionMappings, setNotionMappings] = useState<NotionMappingHealth[]>([]);
  const [areaSummaries, setAreaSummaries] = useState<AreaSummary[]>([]);
  const [topTasks, setTopTasks] = useState<{ id: string; title: string; done: boolean }[]>([]);
  const [dailyPlanRecord, setDailyPlanRecord] = useState<any | null>(null);
  const [pipelineLeads, setPipelineLeads] = useState<FollowUpLead[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  const [syncingPlan, setSyncingPlan] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const today = todayISO();
    const week = startOfWeekISO();
    const month = startOfMonthISO();

    setLoadError(null);
    const [
      rev, leadsRes, followRes, jobsRes, billsRes, contentRes, checkins, integ, tasks,
      mappingsRes, projectsRes, sopsRes, scriptsRes, commandsRes, automationsRes, pipelineRes,
      contactedTodayRes, appointmentsRes,
    ] = await Promise.all([
      supabase.from("revenue_entries").select("amount, entry_date").gte("entry_date", month),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "New Lead"),
      supabase.from("leads").select("id", { count: "exact", head: true }).lte("next_follow_up_at", new Date().toISOString()).not("next_follow_up_at", "is", null).neq("status", "Closed/Lost").neq("status", "Completed"),
      supabase.from("jobs").select("id", { count: "exact", head: true }).gte("scheduled_at", `${today}T00:00:00Z`).lt("scheduled_at", `${today}T23:59:59Z`),
      supabase.from("bills").select("amount").eq("paid", false).lte("due_date", today),
      supabase.from("content_items").select("id", { count: "exact", head: true }).in("stage", ["Idea", "Script", "Record", "Edit", "Review"]),
      supabase.from("daily_checkins").select("*").eq("check_date", today).order("created_at", { ascending: false }),
      supabase.from("integrations").select("provider, status, last_sync_at"),
      supabase.from("tasks").select("id, title, done").eq("for_date", today).eq("is_top_priority", true).order("created_at"),
      (supabase.from("sync_mappings") as any).select("entity, status, last_sync_at, last_error, verified_at").eq("provider", "Notion"),
      (supabase.from("business_projects") as any).select("id, status, due_date"),
      supabase.from("knowledge_docs").select("id", { count: "exact", head: true }).eq("category", "SOPs"),
      supabase.from("scripts").select("id", { count: "exact", head: true }),
      (supabase.from("ai_commands") as any).select("id", { count: "exact", head: true }).eq("active", true),
      supabase.from("automations").select("id, status"),
      supabase.from("leads").select("id,name,business,status,estimated_value,next_follow_up_at"),
      supabase.from("lead_activities").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00Z`),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "Booked"),
    ]);

    const responses = [
      rev, leadsRes, followRes, jobsRes, billsRes, contentRes, checkins, integ, tasks,
      mappingsRes, projectsRes, sopsRes, scriptsRes, commandsRes, automationsRes, pipelineRes,
      contactedTodayRes, appointmentsRes,
    ];
    const firstError = responses.find((response) => response.error)?.error;
    if (firstError) setLoadError(firstError.message);

    const entries = rev.data ?? [];
    setRevToday(entries.filter((e) => e.entry_date === today).reduce((s, e) => s + Number(e.amount), 0));
    setRevWeek(entries.filter((e) => e.entry_date >= week).reduce((s, e) => s + Number(e.amount), 0));
    setRevMonth(entries.reduce((s, e) => s + Number(e.amount), 0));
    setNewLeads(leadsRes.count ?? 0);
    setContactedToday(contactedTodayRes.count ?? 0);
    setAppointmentsScheduled(appointmentsRes.count ?? 0);
    setFollowUpsDue(followRes.count ?? 0);
    setJobsToday(jobsRes.count ?? 0);
    setBillsDueTotal((billsRes.data ?? []).reduce((s, b) => s + Number(b.amount), 0));
    setContentDue(contentRes.count ?? 0);
    const cs = checkins.data ?? [];
    setMorning(cs.find((c) => c.kind === "morning") ?? null);
    setEvening(cs.find((c) => c.kind === "evening") ?? null);
    setDailyPlanRecord(cs.find((c) => c.kind === "plan") ?? null);
    setPipelineLeads((pipelineRes.data as FollowUpLead[]) ?? []);
    setCash(cs.find((c) => c.kind === "morning")?.cash_on_hand ?? null);
    setIntegrations((integ.data as Integration[]) ?? []);
    setTopTasks(tasks.data ?? []);
    const mappings = (mappingsRes.data ?? []) as NotionMappingHealth[];
    setNotionMappings(mappings);

    const projects = (projectsRes.data ?? []) as { status: string; due_date: string | null }[];
    const activeProjects = projects.filter((project) => !["Completed", "Cancelled", "Done"].includes(project.status)).length;
    const automationRows = automationsRes.data ?? [];
    const automationErrors = automationRows.filter((automation) => automation.status === "Error").length;
    const taskDone = (tasks.data ?? []).filter((task) => task.done).length;
    const checkinKinds = new Set(cs.map((checkin) => checkin.kind));
    setAreaSummaries([
      { key: "tasks", label: "Tasks & Alerts", value: `${taskDone}/${tasks.data?.length ?? 0}`, detail: "top priorities complete today", to: "/", icon: CheckCircle2 },
      { key: "leads", label: "CRM / Leads", value: String((leadsRes.count ?? 0) + (followRes.count ?? 0)), detail: `${leadsRes.count ?? 0} new, ${followRes.count ?? 0} follow-ups due`, to: "/crm", icon: Users },
      { key: "content_items", label: "Content Calendar", value: String(contentRes.count ?? 0), detail: "items currently in production", to: "/content", icon: FileText },
      { key: "business_projects", label: "Business Projects", value: String(activeProjects), detail: "active projects", to: "/integrations/notion/business_projects", icon: FolderKanban },
      { key: "sops", label: "SOP Library", value: String(sopsRes.count ?? 0), detail: "procedures in the Knowledge Vault", to: "/vault", icon: BookOpenCheck },
      { key: "revenue_entries", label: "Finance / Money", value: money(revMonth), detail: "revenue logged this month", to: "/revenue", icon: DollarSign },
      { key: "scripts", label: "Sales Scripts", value: String(scriptsRes.count ?? 0), detail: "scripts ready to use", to: "/scripts", icon: ScrollText },
      { key: "daily_checkins", label: "Daily Driver", value: `${checkinKinds.size}/2`, detail: "morning and evening check-ins today", to: "/", icon: Sunrise },
      { key: "ai_commands", label: "AI Commands", value: String(commandsRes.count ?? 0), detail: "active approved commands", to: "/integrations/notion/ai_commands", icon: Bot },
      { key: "automations", label: "Automations", value: String(automationRows.length), detail: automationErrors ? `${automationErrors} need attention` : "tracked agents and workflows", to: "/automations", icon: Workflow },
    ]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (params.get("startDay")) { setStartOpen(true); params.delete("startDay"); setParams(params, { replace: true }); }
    if (params.get("endDay")) { setEndOpen(true); params.delete("endDay"); setParams(params, { replace: true }); }
  }, [params]);

  const bankConnected = useMemo(() => integrations.some(i => ["Square", "Shopify", "Stan Store"].includes(i.provider) && i.status === "Connected"), [integrations]);
  const notionHealth = useMemo(() => getNotionHealth(notionMappings), [notionMappings]);
  const notionStatus = notionHealth.status;
  const lastNotionSync = notionHealth.lastSync;
  const connectedNotionAreas = notionHealth.connectedCount;

  const recs = useMemo(() => {
    const list: { title: string; detail: string; to: string }[] = [];
    if (followUpsDue > 0) list.push({ title: `${followUpsDue} follow-up${followUpsDue > 1 ? "s" : ""} overdue`, detail: "Open the CRM to work them.", to: "/crm" });
    if (billsDueTotal > 0) list.push({ title: `${money(billsDueTotal)} in bills due`, detail: "Mark paid once you clear them.", to: "/settings" });
    if (contentDue > 0) list.push({ title: `${contentDue} content item${contentDue > 1 ? "s" : ""} in progress`, detail: "Move something to Posted today.", to: "/content" });
    if (integrations.length === 0) list.push({ title: "Connect a source of truth", detail: "Start with Notion to sync CRM + revenue.", to: "/integrations" });
    return list;
  }, [followUpsDue, billsDueTotal, contentDue, integrations]);

  const missionControl = useMemo(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const completedTop = topTasks.filter((task) => task.done).length;
    const topTaskScore = topTasks.length ? (completedTop / topTasks.length) * 45 : 0;
    const score = Math.min(100, Math.round(
      topTaskScore +
      (morning ? 15 : 0) +
      (evening ? 15 : 0) +
      (revToday > 0 ? 10 : 0) +
      (jobsToday > 0 ? 5 : 0) +
      (newLeads > 0 ? 5 : 0) +
      (contactedToday > 0 ? 5 : 0) +
      (contentDue > 0 ? 5 : 0)
    ));
    const grade =
      score >= 90 ? "Excellent work." :
      score >= 70 ? "Strong progress." :
      score >= 40 ? "Momentum is building." :
      "Start with today's first verified action.";
    const calendar = integrations.find((item) => item.provider === "Google Calendar");
    return { greeting, score, grade, calendarConnected: calendar?.status === "Connected" };
  }, [topTasks, morning, evening, revToday, jobsToday, newLeads, contactedToday, contentDue, integrations]);

  const dailyPlan = useMemo<DailyPlan>(() => {
    const summary = dailyPlanRecord?.summary_json as Partial<DailyPlan> | null;
    return {
      actions: { ...EMPTY_PLAN.actions, ...(summary?.actions ?? {}) },
      completed: { ...EMPTY_PLAN.completed, ...(summary?.completed ?? {}) },
    };
  }, [dailyPlanRecord]);

  const dailyScore = useMemo(() => {
    return getDailyDriverScore(
      topTasks.map((task) => task.done),
      Object.values(dailyPlan.completed),
    );
  }, [topTasks, dailyPlan]);

  const openPipelineValue = useMemo(() => getOpenPipelineValue(pipelineLeads), [pipelineLeads]);
  const nextFollowUps = useMemo(() => getNextFollowUps(pipelineLeads), [pipelineLeads]);

  const savePlan = async (plan: DailyPlan, date = todayISO()) => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error("Sign in again before saving the Daily Driver.");
    const existing = date === todayISO() ? dailyPlanRecord : null;
    const payload = buildDailyPlanPayload(uid, date, plan as unknown as Record<string, unknown>);
    const result = existing
      ? await supabase.from("daily_checkins").update(payload).eq("id", existing.id)
      : await supabase.from("daily_checkins").insert(payload);
    if (result.error) throw result.error;
  };

  const toggleDailyAction = async (key: DailyActionKey, checked: boolean) => {
    if (!dailyPlanRecord) {
      toast.error("Create today's plan before completing actions.");
      return;
    }
    try {
      await savePlan({ ...dailyPlan, completed: { ...dailyPlan.completed, [key]: checked } });
      await load();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const pushPlanToNotion = async () => {
    const mapping = notionMappings.find((item) => item.entity === "daily_checkins");
    if (mapping?.status !== "Connected" || !mapping.verified_at) {
      toast.error("Daily Driver Notion sync is not verified yet.", {
        description: "Open Manage sync, verify Daily Driver, then try again.",
      });
      return;
    }
    if (!dailyPlanRecord) {
      toast.error("Create today's plan before pushing it to Notion.");
      return;
    }
    setSyncingPlan(true);
    const { data, error } = await supabase.functions.invoke("notion-sync", {
      body: buildDailyPlanSyncRequest(dailyPlanRecord.id),
    });
    if (error || !data?.synced) {
      let detail = data?.record_errors?.[0]?.error ?? data?.error ?? error?.message ?? "No verified sync result returned.";
      const response = (error as any)?.context;
      if (response?.json) {
        try {
          const payload = await response.clone().json();
          detail = payload?.record_errors?.[0]?.error ?? payload?.error ?? detail;
        } catch {
          // Keep the best available error when the response body is not JSON.
        }
      }
      toast.error("Notion sync failed", { description: detail });
    } else {
      toast.success("Today's plan pushed to Notion", {
        description: `${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.failed ?? 0} failed.`,
      });
      await load();
    }
    setSyncingPlan(false);
  };

  return (
    <div>
      <PageHeader
        title="Mission Control"
        description={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setStartOpen(true)}><Sunrise className="h-4 w-4 mr-1.5" />Start My Day</Button>
            <Button size="sm" className="bg-forest text-forest-foreground hover:bg-forest/90" onClick={() => setEndOpen(true)}><Moon className="h-4 w-4 mr-1.5" />End My Day</Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        <section className="surface overflow-hidden">
          <div className="grid bg-gradient-to-br from-foreground via-foreground to-forest text-background lg:grid-cols-[1fr_260px]">
            <div className="p-5 md:p-7">
              <div className="flex items-center gap-2 text-gold">
                <Target className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Command Center</span>
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold md:text-3xl">
                {missionControl.greeting}, Huey
              </h1>
              <p className="mt-1 text-sm text-background/65">
                Your live operating picture, priorities and next actions.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MissionMetric label="Revenue Today" value={money(revToday)} icon={DollarSign} />
                <MissionMetric label="Cash Available" value={cash === null ? "Verify" : money(cash)} icon={DollarSign} />
                <MissionMetric label="Jobs" value={String(jobsToday)} icon={Wrench} />
                <MissionMetric label="Leads" value={String(newLeads)} icon={Users} />
                <MissionMetric label="Appointments" value={String(appointmentsScheduled)} icon={CalendarPlus} />
                <MissionMetric label="Calendar" value={missionControl.calendarConnected ? "Connected" : "Not connected"} icon={CalendarDays} />
                <MissionMetric label="Follow Ups" value={String(followUpsDue)} icon={Bell} />
                <MissionMetric label="Contacts Today" value={String(contactedToday)} icon={Send} />
                <MissionMetric label="Videos" value={String(contentDue)} icon={Video} />
                <MissionMetric label="Top 3 Done" value={`${topTasks.filter((task) => task.done).length}/${topTasks.length || 3}`} icon={CheckCircle2} />
              </div>
            </div>

            <div className="flex flex-col justify-center border-t border-background/15 bg-background/5 p-5 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-background/60">
                <Gauge className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Today's Score</span>
              </div>
              <div className="mt-2 text-5xl font-semibold tabular-nums">{missionControl.score}%</div>
              <p className="mt-2 text-sm text-background/70">{missionControl.grade}</p>
              <p className="mt-3 text-[11px] text-background/45">Calculated from verified Huey HQ activity.</p>
            </div>
          </div>

          <div className="grid gap-4 border-t p-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-gold" />
                <h2 className="font-display text-sm font-semibold">AI Briefing</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                {recs[0]?.title ?? "No urgent verified alerts. Use the next action to create revenue or publish proof."}
                {recs[0]?.detail ? ` ${recs[0].detail}` : ""}
              </p>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setStartOpen(true)}><Sunrise className="mr-1.5 h-3.5 w-3.5" />Start My Day</Button>
                <Button size="sm" variant="outline" asChild><Link to="/crm?new=1"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Lead</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/crm?new=1">Book Job</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/revenue?new=1">Log Revenue</Link></Button>
                <Button size="sm" variant="outline" asChild><Link to="/content?new=1">Create Content</Link></Button>
                <Button size="sm" onClick={() => setEndOpen(true)}><Moon className="mr-1.5 h-3.5 w-3.5" />End My Day</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="surface p-4 md:p-5">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sunrise className="h-4 w-4 text-gold" />
                <h2 className="font-display text-base font-semibold">Daily Driver</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">One plan for money, visibility, growth, and health.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />{dailyPlanRecord ? "Edit today's plan" : "Create today's plan"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setTomorrowOpen(true)}>
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />Create tomorrow's plan
              </Button>
              <Button size="sm" onClick={pushPlanToNotion} disabled={syncingPlan}>
                <CloudUpload className="mr-1.5 h-3.5 w-3.5" />{syncingPlan ? "Syncing..." : "Push to Notion"}
              </Button>
            </div>
          </div>

          <div className="grid gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_220px]">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's Top 3</h3>
              {topTasks.length === 0 ? (
                <button className="text-left text-sm text-muted-foreground underline underline-offset-2" onClick={() => setStartOpen(true)}>
                  Start My Day to set your priorities.
                </button>
              ) : (
                <ul className="space-y-2">
                  {topTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2">
                      <Checkbox
                        checked={task.done}
                        onCheckedChange={async (value) => {
                          await supabase.from("tasks").update({ done: !!value }).eq("id", task.id);
                          load();
                        }}
                      />
                      <span className={`text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action lanes</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <DailyAction icon={DollarSign} label="Money action" value={dailyPlan.actions.money} checked={dailyPlan.completed.money} onChecked={(v) => toggleDailyAction("money", v)} />
                <DailyAction icon={Video} label="Content action" value={dailyPlan.actions.content} checked={dailyPlan.completed.content} onChecked={(v) => toggleDailyAction("content", v)} />
                <DailyAction icon={Send} label="Outreach action" value={dailyPlan.actions.outreach} checked={dailyPlan.completed.outreach} onChecked={(v) => toggleDailyAction("outreach", v)} />
                <DailyAction icon={GraduationCap} label="Skill action" value={dailyPlan.actions.skill} checked={dailyPlan.completed.skill} onChecked={(v) => toggleDailyAction("skill", v)} />
                <DailyAction icon={Dumbbell} label="Health action" value={dailyPlan.actions.health} checked={dailyPlan.completed.health} onChecked={(v) => toggleDailyAction("health", v)} />
              </div>
            </div>

            <div className="border-t pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Daily scorecard</h3>
              <div className="mt-2 text-4xl font-semibold tabular-nums">{dailyScore.percent}%</div>
              <p className="mt-1 text-sm text-muted-foreground">{dailyScore.done} of {dailyScore.possible} commitments complete</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-forest transition-all" style={{ width: `${dailyScore.percent}%` }} />
              </div>
              <Button className="mt-5 w-full" variant="outline" onClick={() => setEndOpen(true)}>
                <Moon className="mr-1.5 h-3.5 w-3.5" />End-of-day review
              </Button>
            </div>
          </div>
        </section>

        <section className="surface p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gold" />
                <h2 className="font-display text-base font-semibold">CRM Revenue Pipeline</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Open opportunities and the next five follow-ups from the shared CRM.</p>
            </div>
            <Button size="sm" variant="outline" asChild><Link to="/crm">Open CRM</Link></Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="border-b pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open pipeline value</div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{money(openPipelineValue)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {pipelineLeads.filter((lead) => !["Completed", "Closed/Lost"].includes(lead.status)).length} open leads
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next 5 follow-ups</h3>
              {nextFollowUps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No follow-ups are scheduled.</p>
              ) : (
                <div className="divide-y">
                  {nextFollowUps.map((lead) => {
                    const overdue = Boolean(lead.next_follow_up_at && lead.next_follow_up_at < new Date().toISOString());
                    return (
                      <Link key={lead.id} to="/crm" className="flex items-center justify-between gap-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{lead.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{lead.business ?? lead.status}</div>
                        </div>
                        <div className={`shrink-0 text-xs ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                          {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : ""}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={`surface p-4 border-l-4 ${notionStatus === "Connected" ? "border-l-forest" : notionStatus === "Error" ? "border-l-destructive" : "border-l-gold"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-semibold text-sm">Notion sync status</h2>
                <ConnectionBadge status={notionStatus} lastSync={lastNotionSync} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {notionStatus === "Connected"
                  ? `All ${NOTION_ENTITIES.length} Notion areas have a verified live connection.`
                  : notionStatus === "Error"
                    ? "Notion connection needs attention. Open setup to review the latest error."
                    : `${connectedNotionAreas} of ${NOTION_ENTITIES.length} Notion areas are verified. Unconfigured areas remain clearly marked.`}
              </p>
            </div>
            <Button asChild size="sm" variant={notionStatus === "Connected" ? "outline" : "default"} className="shrink-0">
              <Link to="/integrations/notion">{notionStatus === "Connected" ? "Manage Notion" : "Configure Notion"}</Link>
            </Button>
          </div>
        </section>

        {loadError && (
          <section className="surface border-destructive/40 p-4 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <div className="font-medium">Some live dashboard data could not load</div>
                <div className="text-muted-foreground">{loadError}</div>
              </div>
            </div>
          </section>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat label="Cash on hand" value={cash === null ? "—" : money(cash)} hint={bankConnected ? "" : "Verify in Start My Day"} icon={DollarSign} accent />
          <Stat label="Revenue today" value={money(revToday)} icon={DollarSign} />
          <Stat label="This week" value={money(revWeek)} icon={DollarSign} />
          <Stat label="This month" value={money(revMonth)} icon={DollarSign} />
          <Stat label="Bills due" value={money(billsDueTotal)} icon={AlertTriangle} warn={billsDueTotal > 0} />
          <Stat label="Jobs today" value={String(jobsToday)} icon={Wrench} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="New leads" value={String(newLeads)} icon={Users} />
          <Stat label="Follow-ups due" value={String(followUpsDue)} icon={Bell} warn={followUpsDue > 0} />
          <Stat label="Content in flight" value={String(contentDue)} icon={FileText} />
          <Stat label="Morning check-in" value={morning ? "Done" : "Not yet"} hint={morning ? relTime(morning.created_at) : "Start My Day to log"} icon={Sunrise} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Recs */}
          <div className="surface p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-sm">AI recommendations</h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">AI provider not connected · data-derived</span>
            </div>
            {recs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing urgent from your data right now. Great time to prospect or ship content.</p>
            ) : (
              <ul className="space-y-2">
                {recs.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 border-l-2 border-gold pl-3 py-1">
                    <div>
                      <div className="text-sm font-medium">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.detail}</div>
                    </div>
                    <Link to={r.to} className="text-xs font-medium underline underline-offset-2">Open</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Today's top 3 */}
          <div className="surface p-4">
            <h2 className="font-display font-semibold text-sm mb-3">Today's Top 3</h2>
            {topTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Set them in Start My Day.</p>
            ) : (
              <ul className="space-y-2">
                {topTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={async (v) => {
                        await supabase.from("tasks").update({ done: !!v }).eq("id", t.id);
                        load();
                      }}
                    />
                    <span className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-semibold">Operating system</h2>
              <p className="text-xs text-muted-foreground">Live Huey HQ records with per-area Notion verification.</p>
            </div>
            <Link to="/integrations/notion" className="shrink-0 text-xs underline underline-offset-2">Manage sync</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {areaSummaries.map((area) => {
              const mapping = notionMappings.find((item) => item.entity === area.key);
              const status = mapping?.status === "Connected" && mapping.verified_at
                ? "Connected"
                : mapping?.status === "Error"
                  ? "Error"
                  : "Not Connected";
              const Icon = area.icon;
              return (
                <Link key={area.key} to={area.to} className="surface group min-h-36 p-4 transition-colors hover:border-gold/50">
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="h-4 w-4 text-gold" />
                    <ConnectionBadge status={status} lastSync={mapping?.last_sync_at} />
                  </div>
                  <div className="mt-4 text-2xl font-semibold tabular-nums">{loading ? "..." : area.value}</div>
                  <div className="mt-1 text-sm font-medium">{area.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{area.detail}</div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Connection health */}
        <div className="surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-sm flex items-center gap-2"><Plug className="h-4 w-4" />System connections</h2>
            <Link to="/integrations" className="text-xs underline underline-offset-2">Manage</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {PROVIDERS.map((p) => {
              const rec = integrations.find(i => i.provider === p);
              const status = (rec?.status ?? "Not Connected") as "Connected" | "Not Connected" | "Error";
              return (
                <div key={p} className="flex items-center justify-between gap-2 rounded-md border bg-background p-2 text-sm">
                  <span className="truncate">{p}</span>
                  <ConnectionBadge status={status} lastSync={rec?.last_sync_at} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <StartDayDialog open={startOpen} onClose={() => setStartOpen(false)} onSaved={load}
        counts={{ jobsToday, followUpsDue, billsDueTotal, contentDue, newLeads }}
        bankConnected={bankConnected} />
      <EndDayDialog
        open={endOpen}
        onClose={() => setEndOpen(false)}
        onSaved={load}
        dailyDriver={{ score: dailyScore, plan: dailyPlan }}
      />
      <PlanDialog
        open={planOpen}
        title="Today's Daily Driver"
        initial={dailyPlan}
        onClose={() => setPlanOpen(false)}
        onSave={async (plan) => {
          await savePlan(plan);
          toast.success("Today's plan saved");
          setPlanOpen(false);
          await load();
        }}
      />
      <TomorrowPlanDialog open={tomorrowOpen} onClose={() => setTomorrowOpen(false)} onSaved={load} />
    </div>
  );
}

const PROVIDERS = ["Notion","Google Drive","Google Calendar","Gmail","Zoho Mail","Shopify","Stan Store","Square"];

function MissionMetric({ label, value, icon: Icon }: any) {
  return (
    <div className="rounded-md border border-background/15 bg-background/5 p-2.5">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-background/50">
        <span>{label}</span>
        <Icon className="h-3 w-3" />
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function DailyAction({ icon: Icon, label, value, checked, onChecked }: any) {
  return (
    <label className="flex min-h-20 cursor-pointer items-start gap-3 rounded-md border bg-background p-3">
      <Checkbox checked={checked} disabled={!value} onCheckedChange={(next) => onChecked(!!next)} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />{label}
        </div>
        <p className={`mt-1 text-sm ${checked ? "line-through text-muted-foreground" : ""}`}>
          {value || "Not planned yet"}
        </p>
      </div>
    </label>
  );
}

function PlanDialog({ open, title, initial, onClose, onSave }: {
  open: boolean;
  title: string;
  initial: DailyPlan;
  onClose: () => void;
  onSave: (plan: DailyPlan) => Promise<void>;
}) {
  const [plan, setPlan] = useState<DailyPlan>(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setPlan(initial); }, [open, initial]);
  const fields: { key: DailyActionKey; label: string }[] = [
    { key: "money", label: "Money action" },
    { key: "content", label: "Content action" },
    { key: "outreach", label: "Outreach action" },
    { key: "skill", label: "Skill action" },
    { key: "health", label: "Health action" },
  ];
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Keep each action specific enough to verify before closing the day.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <Input
                value={plan.actions[field.key]}
                onChange={(event) => setPlan({
                  ...plan,
                  actions: { ...plan.actions, [field.key]: event.target.value },
                })}
                placeholder={`Define today's ${field.label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={async () => {
            setBusy(true);
            try {
              await onSave(plan);
            } catch (error: unknown) {
              toast.error("Daily Driver save failed", {
                description: error instanceof Error ? error.message : "Unknown save error",
              });
            }
            setBusy(false);
          }} disabled={busy}>{busy ? "Saving..." : "Save plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TomorrowPlanDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [plan, setPlan] = useState<DailyPlan>(EMPTY_PLAN);
  const [priorities, setPriorities] = useState(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create tomorrow's plan</DialogTitle>
          <DialogDescription>{tomorrow.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tomorrow's Top 3</Label>
            {priorities.map((priority, index) => (
              <Input key={index} value={priority} onChange={(event) => {
                const next = [...priorities]; next[index] = event.target.value; setPriorities(next);
              }} placeholder={`Priority ${index + 1}`} />
            ))}
          </div>
          {(Object.keys(plan.actions) as DailyActionKey[]).map((key) => (
            <div key={key}>
              <Label>{key.charAt(0).toUpperCase() + key.slice(1)} action</Label>
              <Input value={plan.actions[key]} onChange={(event) => setPlan({
                ...plan, actions: { ...plan.actions, [key]: event.target.value },
              })} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            const { data: auth } = await supabase.auth.getUser();
            const uid = auth.user?.id;
            if (!uid) { toast.error("Sign in again before saving."); setBusy(false); return; }
            const tasks = priorities.filter(Boolean).map((title) => ({
              user_id: uid, title, is_top_priority: true, for_date: tomorrowISO,
            }));
            const [planResult, taskResult] = await Promise.all([
              supabase.from("daily_checkins").insert({
                user_id: uid, kind: "plan", check_date: tomorrowISO, summary_json: plan as any,
              }),
              tasks.length ? supabase.from("tasks").insert(tasks) : Promise.resolve({ error: null }),
            ]);
            const error = planResult.error ?? taskResult.error;
            if (error) toast.error(error.message);
            else {
              toast.success("Tomorrow's plan created");
              setPlan(EMPTY_PLAN); setPriorities(["", "", ""]); onClose(); onSaved();
            }
            setBusy(false);
          }}>{busy ? "Creating..." : "Create tomorrow's plan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, hint, icon: Icon, accent, warn }: any) {
  return (
    <div className={`stat-card ${accent ? "border-gold/40" : ""} ${warn ? "border-warning/40" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StartDayDialog({ open, onClose, onSaved, counts, bankConnected }: any) {
  const [cash, setCash] = useState<string>("");
  const [t1, setT1] = useState(""); const [t2, setT2] = useState(""); const [t3, setT3] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    const summary = { counts, top: [t1, t2, t3].filter(Boolean) };
    const { error } = await supabase.from("daily_checkins").insert({
      user_id: uid, kind: "morning",
      cash_on_hand: cash ? Number(cash) : null,
      summary_json: summary, notes,
    });
    if (!error) {
      const tops = [t1, t2, t3].filter(Boolean);
      if (tops.length) {
        await supabase.from("tasks").insert(tops.map(title => ({ user_id: uid, title, is_top_priority: true })));
      }
      toast.success("Morning check-in saved");
      onClose(); onSaved();
    } else toast.error(error.message);
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start My Day</DialogTitle>
          <DialogDescription>{new Date().toLocaleString()}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!bankConnected && (
            <div>
              <Label>Cash on hand</Label>
              <Input type="number" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="No bank source connected — enter manually" />
            </div>
          )}
          <div className="text-sm grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Jobs today: <span className="text-foreground font-medium">{counts.jobsToday}</span></div>
            <div>Follow-ups due: <span className="text-foreground font-medium">{counts.followUpsDue}</span></div>
            <div>Bills due: <span className="text-foreground font-medium">{money(counts.billsDueTotal)}</span></div>
            <div>Content in flight: <span className="text-foreground font-medium">{counts.contentDue}</span></div>
            <div>New leads: <span className="text-foreground font-medium">{counts.newLeads}</span></div>
          </div>
          <div className="space-y-2">
            <Label>Today's Top 3</Label>
            <Input value={t1} onChange={(e) => setT1(e.target.value)} placeholder="Priority 1" />
            <Input value={t2} onChange={(e) => setT2(e.target.value)} placeholder="Priority 2" />
            <Input value={t3} onChange={(e) => setT3(e.target.value)} placeholder="Priority 3" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save check-in"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndDayDialog({ open, onClose, onSaved, dailyDriver }: any) {
  const [wins, setWins] = useState("");
  const [proof, setProof] = useState("");
  const [carry, setCarry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const today = todayISO();
      const [rev, tasks, leadsContacted] = await Promise.all([
        supabase.from("revenue_entries").select("amount").eq("entry_date", today),
        supabase.from("tasks").select("id, title, done, is_top_priority").eq("for_date", today),
        supabase.from("lead_activities").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00Z`),
      ]);
      setSnapshot({
        revenue: (rev.data ?? []).reduce((s, r) => s + Number(r.amount), 0),
        completedTasks: (tasks.data ?? []).filter(t => t.done).length,
        totalTasks: (tasks.data ?? []).length,
        incompleteTop: (tasks.data ?? []).filter(t => t.is_top_priority && !t.done),
        leadsContacted: leadsContacted.count ?? 0,
      });
    })();
  }, [open]);

  const save = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const { error } = await supabase.from("daily_checkins").insert({
      user_id: uid, kind: "evening", notes: wins,
      summary_json: { snapshot, proof, carry_forward: carry, daily_driver: dailyDriver },
    });
    if (!error && carry && snapshot?.incompleteTop?.length) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const iso = tomorrow.toISOString().slice(0, 10);
      await supabase.from("tasks").insert(snapshot.incompleteTop.map((t: any) => ({
        user_id: uid, title: t.title, is_top_priority: true, for_date: iso,
      })));
    }
    if (error) toast.error(error.message);
    else { toast.success("Evening review saved"); onClose(); onSaved(); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>End My Day</DialogTitle>
          <DialogDescription>Review, log proof, then close the day.</DialogDescription>
        </DialogHeader>
        {snapshot && (
          <div className="text-sm grid grid-cols-2 gap-2 text-muted-foreground">
            <div>Revenue logged: <span className="text-foreground font-medium">{money(snapshot.revenue)}</span></div>
            <div>Tasks: <span className="text-foreground font-medium">{snapshot.completedTasks}/{snapshot.totalTasks}</span></div>
            <div>Leads contacted: <span className="text-foreground font-medium">{snapshot.leadsContacted}</span></div>
            <div>Top priorities not done: <span className="text-foreground font-medium">{snapshot.incompleteTop?.length ?? 0}</span></div>
            <div>Daily Driver score: <span className="text-foreground font-medium">{dailyDriver?.score?.percent ?? 0}%</span></div>
            <div>Action lanes: <span className="text-foreground font-medium">
              {Object.values(dailyDriver?.plan?.completed ?? {}).filter(Boolean).length}/5
            </span></div>
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>Wins & completed work</Label>
            <Textarea value={wins} onChange={(e) => setWins(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Proof (links or notes)</Label>
            <Textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={2} placeholder="Receipts, message screenshots, posted URLs…" />
          </div>
          {snapshot?.incompleteTop?.length > 0 && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={carry} onCheckedChange={(v) => setCarry(!!v)} />
              Carry {snapshot.incompleteTop.length} incomplete priorit{snapshot.incompleteTop.length === 1 ? "y" : "ies"} to tomorrow
            </label>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Close the day"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
