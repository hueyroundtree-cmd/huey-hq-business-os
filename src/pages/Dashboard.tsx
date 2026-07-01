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
import { Sunrise, Moon, DollarSign, Users, Bell, FileText, Wrench, AlertTriangle, Plug } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, Link } from "react-router-dom";

type Integration = { provider: string; status: "Connected" | "Not Connected" | "Error"; last_sync_at: string | null };

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [revToday, setRevToday] = useState(0);
  const [revWeek, setRevWeek] = useState(0);
  const [revMonth, setRevMonth] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [followUpsDue, setFollowUpsDue] = useState(0);
  const [jobsToday, setJobsToday] = useState(0);
  const [billsDueTotal, setBillsDueTotal] = useState(0);
  const [contentDue, setContentDue] = useState(0);
  const [cash, setCash] = useState<number | null>(null);
  const [morning, setMorning] = useState<any | null>(null);
  const [evening, setEvening] = useState<any | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [topTasks, setTopTasks] = useState<{ id: string; title: string; done: boolean }[]>([]);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const today = todayISO();
    const week = startOfWeekISO();
    const month = startOfMonthISO();

    const [rev, leadsRes, followRes, jobsRes, billsRes, contentRes, checkins, integ, tasks] = await Promise.all([
      supabase.from("revenue_entries").select("amount, entry_date").gte("entry_date", month),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "New Lead"),
      supabase.from("leads").select("id", { count: "exact", head: true }).lte("next_follow_up_at", new Date().toISOString()).not("next_follow_up_at", "is", null).neq("status", "Lost").neq("status", "Completed"),
      supabase.from("jobs").select("id", { count: "exact", head: true }).gte("scheduled_at", `${today}T00:00:00Z`).lt("scheduled_at", `${today}T23:59:59Z`),
      supabase.from("bills").select("amount").eq("paid", false).lte("due_date", today),
      supabase.from("content_items").select("id", { count: "exact", head: true }).in("stage", ["Idea", "Script", "Record", "Edit", "Review"]),
      supabase.from("daily_checkins").select("*").eq("check_date", today).order("created_at", { ascending: false }),
      supabase.from("integrations").select("provider, status, last_sync_at"),
      supabase.from("tasks").select("id, title, done").eq("for_date", today).eq("is_top_priority", true).order("created_at"),
    ]);

    const entries = rev.data ?? [];
    setRevToday(entries.filter((e) => e.entry_date === today).reduce((s, e) => s + Number(e.amount), 0));
    setRevWeek(entries.filter((e) => e.entry_date >= week).reduce((s, e) => s + Number(e.amount), 0));
    setRevMonth(entries.reduce((s, e) => s + Number(e.amount), 0));
    setNewLeads(leadsRes.count ?? 0);
    setFollowUpsDue(followRes.count ?? 0);
    setJobsToday(jobsRes.count ?? 0);
    setBillsDueTotal((billsRes.data ?? []).reduce((s, b) => s + Number(b.amount), 0));
    setContentDue(contentRes.count ?? 0);
    const cs = checkins.data ?? [];
    setMorning(cs.find((c) => c.kind === "morning") ?? null);
    setEvening(cs.find((c) => c.kind === "evening") ?? null);
    setCash(cs.find((c) => c.kind === "morning")?.cash_on_hand ?? null);
    setIntegrations((integ.data as Integration[]) ?? []);
    setTopTasks(tasks.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    if (params.get("startDay")) { setStartOpen(true); params.delete("startDay"); setParams(params, { replace: true }); }
    if (params.get("endDay")) { setEndOpen(true); params.delete("endDay"); setParams(params, { replace: true }); }
  }, [params]);

  const bankConnected = useMemo(() => integrations.some(i => ["Square", "Shopify", "Stan Store"].includes(i.provider) && i.status === "Connected"), [integrations]);
  const notion = useMemo(() => integrations.find(i => i.provider === "Notion"), [integrations]);
  const notionStatus = (notion?.status ?? "Not Connected") as "Connected" | "Not Connected" | "Error";

  const recs = useMemo(() => {
    const list: { title: string; detail: string; to: string }[] = [];
    if (followUpsDue > 0) list.push({ title: `${followUpsDue} follow-up${followUpsDue > 1 ? "s" : ""} overdue`, detail: "Open the CRM to work them.", to: "/crm" });
    if (billsDueTotal > 0) list.push({ title: `${money(billsDueTotal)} in bills due`, detail: "Mark paid once you clear them.", to: "/settings" });
    if (contentDue > 0) list.push({ title: `${contentDue} content item${contentDue > 1 ? "s" : ""} in progress`, detail: "Move something to Posted today.", to: "/content" });
    if (integrations.length === 0) list.push({ title: "Connect a source of truth", detail: "Start with Notion to sync CRM + revenue.", to: "/integrations" });
    return list;
  }, [followUpsDue, billsDueTotal, contentDue, integrations]);

  return (
    <div>
      <PageHeader
        title="CEO Dashboard"
        description={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setStartOpen(true)}><Sunrise className="h-4 w-4 mr-1.5" />Start My Day</Button>
            <Button size="sm" className="bg-forest text-forest-foreground hover:bg-forest/90" onClick={() => setEndOpen(true)}><Moon className="h-4 w-4 mr-1.5" />End My Day</Button>
          </>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        <section className={`surface p-4 border-l-4 ${notionStatus === "Connected" ? "border-l-forest" : notionStatus === "Error" ? "border-l-destructive" : "border-l-gold"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-semibold text-sm">Notion sync status</h2>
                <ConnectionBadge status={notionStatus} lastSync={notion?.last_sync_at} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {notionStatus === "Connected"
                  ? "Notion is connected. Sync claims still require a verified API response and audit record."
                  : notionStatus === "Error"
                    ? "Notion connection needs attention. Open setup to review the latest error."
                    : "Notion not connected yet. Huey HQ is currently using its own secure database."}
              </p>
            </div>
            <Button asChild size="sm" variant={notionStatus === "Connected" ? "outline" : "default"} className="shrink-0">
              <Link to="/integrations/notion">{notionStatus === "Connected" ? "Manage Notion" : "Configure Notion"}</Link>
            </Button>
          </div>
        </section>

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
      <EndDayDialog open={endOpen} onClose={() => setEndOpen(false)} onSaved={load} />
    </div>
  );
}

const PROVIDERS = ["Notion","Google Drive","Google Calendar","Gmail","Zoho Mail","Shopify","Stan Store","Square"];

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

function EndDayDialog({ open, onClose, onSaved }: any) {
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
      summary_json: { snapshot, proof, carry_forward: carry },
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
