import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { DollarSign, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { addDaysISO, money, moneyExact, startOfMonthISO, startOfWeekISO, todayISO } from "@/lib/format";
import { useSearchParams } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { emitOperationEvent } from "@/lib/eventEngine";
import { BUSINESS_UNITS } from "@/lib/crmPipeline";

const STREAMS = ["Detailing","Logistics","Shopify","Stan Store","Gig Work","Content","Investing","Other"] as const;
type Stream = typeof STREAMS[number];

type Entry = { id: string; entry_date: string; stream: string; amount: number; payment_method: string | null; proof_url: string | null; notes: string | null };
type RevenueForm = { entry_date: string; stream: Stream; amount: string; payment_method: string; proof_url: string; notes: string };
type LeadRevenueContext = {
  id: string;
  source: string | null;
  status: string | null;
  business_unit_id: string | null;
  estimated_value: number | null;
  quote_amount: number | null;
  deposit: number | null;
  deposit_status: string | null;
};

const previousMonthRange = () => {
  const thisMonth = startOfMonthISO();
  const start = new Date(`${thisMonth}T12:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 1);
  const previousStart = start.toISOString().slice(0, 10);
  const previousEnd = addDaysISO(thisMonth, -1);
  return { previousStart, previousEnd };
};

const previousWeekRange = () => {
  const thisWeek = startOfWeekISO();
  return { previousStart: addDaysISO(thisWeek, -7), previousEnd: addDaysISO(thisWeek, -1) };
};

const unitName = (id?: string | null) => BUSINESS_UNITS.find((unit) => unit.id === id)?.name ?? "Great Freight Mobile Detailing";
const streamBusinessUnit = (stream: string) => {
  const value = stream.toLowerCase();
  if (value.includes("logistics")) return "Great Freight Logistics";
  if (value.includes("shopify")) return "Shopify";
  if (value.includes("stan")) return "Stan Store";
  if (value.includes("content")) return "Content & Brand Deals";
  return "Great Freight Mobile Detailing";
};
const depositVerified = (lead: LeadRevenueContext) => {
  const status = (lead.deposit_status ?? "").toLowerCase();
  return Number(lead.deposit ?? 0) > 0 && ["paid", "collected", "received", "complete", "completed"].some((word) => status.includes(word));
};

export default function Revenue() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [leads, setLeads] = useState<LeadRevenueContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamFilter, setStreamFilter] = useState<"all" | Stream>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RevenueForm>({ entry_date: todayISO(), stream: "Detailing", amount: "", payment_method: "", proof_url: "", notes: "" });
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const [{ data }, leadsResult] = await Promise.all([
      supabase.from("revenue_entries").select("*").order("entry_date", { ascending: false }),
      supabase.from("leads").select("id,source,status,business_unit_id,estimated_value,quote_amount,deposit,deposit_status"),
    ]);
    setEntries((data as Entry[]) ?? []);
    setLeads((leadsResult.data as LeadRevenueContext[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (params.get("new")) { setOpen(true); params.delete("new"); setParams(params, { replace: true }); } }, [params]);

  const filtered = useMemo(() => streamFilter === "all" ? entries : entries.filter(e => e.stream === streamFilter), [entries, streamFilter]);

  const totals = useMemo(() => {
    const t = todayISO(), w = startOfWeekISO(), m = startOfMonthISO();
    const yesterday = addDaysISO(t, -1);
    const { previousStart: lastWeekStart, previousEnd: lastWeekEnd } = previousWeekRange();
    const { previousStart: lastMonthStart, previousEnd: lastMonthEnd } = previousMonthRange();
    const sumRange = (start: string, end?: string) => entries
      .filter(e => e.entry_date >= start && (!end || e.entry_date <= end))
      .reduce((s, e) => s + Number(e.amount), 0);
    const thisMonth = sumRange(m);
    const lastMonth = sumRange(lastMonthStart, lastMonthEnd);
    const deposits = leads.filter(depositVerified).reduce((s, lead) => s + Number(lead.deposit ?? 0), 0);
    const outstandingDeposits = leads.filter((lead) => Number(lead.deposit ?? 0) > 0 && !depositVerified(lead)).reduce((s, lead) => s + Number(lead.deposit ?? 0), 0);
    const outstandingEstimates = leads
      .filter((lead) => !["Completed", "Closed/Lost"].includes(lead.status ?? ""))
      .reduce((s, lead) => s + Number(lead.estimated_value ?? lead.quote_amount ?? 0), 0);
    return {
      today: entries.filter(e => e.entry_date === t).reduce((s, e) => s + Number(e.amount), 0),
      yesterday: entries.filter(e => e.entry_date === yesterday).reduce((s, e) => s + Number(e.amount), 0),
      week: sumRange(w),
      lastWeek: sumRange(lastWeekStart, lastWeekEnd),
      month: thisMonth,
      lastMonth,
      deposits,
      revenueCollected: entries.reduce((s, e) => s + Number(e.amount), 0),
      outstandingEstimates,
      outstandingDeposits,
      averageTicket: entries.length ? entries.reduce((s, e) => s + Number(e.amount), 0) / entries.length : 0,
      monthlyGrowthPct: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
    };
  }, [entries, leads]);

  const byStream = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => map.set(e.stream, (map.get(e.stream) ?? 0) + Number(e.amount)));
    return Array.from(map, ([stream, amount]) => ({ stream, amount }));
  }, [entries]);

  const byBusinessUnit = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const unit = streamBusinessUnit(e.stream);
      map.set(unit, (map.get(unit) ?? 0) + Number(e.amount));
    });
    return Array.from(map, ([businessUnit, amount]) => ({ businessUnit, amount }));
  }, [entries]);

  const estimatesByUnit = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((lead) => {
      const unit = unitName(lead.business_unit_id);
      map.set(unit, (map.get(unit) ?? 0) + Number(lead.estimated_value ?? lead.quote_amount ?? 0));
    });
    return Array.from(map, ([businessUnit, amount]) => ({ businessUnit, amount }));
  }, [leads]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const k = e.entry_date.slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + Number(e.amount));
    });
    return Array.from(map, ([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
  }, [entries]);

  const save = async () => {
    if (!form.amount) return toast.error("Amount is required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return toast.error("Sign in again before logging revenue.");
    const { data: saved, error } = await supabase.from("revenue_entries").insert({
      user_id: uid,
      entry_date: form.entry_date,
      stream: form.stream,
      amount: Number(form.amount),
      payment_method: form.payment_method || null,
      proof_url: form.proof_url || null,
      notes: form.notes || null,
    }).select("*").single();
    if (error) return toast.error(error.message);
    if (!saved) return toast.error("Revenue saved without a returned row.");
    const event = await emitOperationEvent({
      userId: uid,
      eventType: "payment_received",
      entityType: "revenue",
      entityId: saved.id,
      title: "Payment received",
      detail: `${moneyExact(Number(saved.amount))} logged for ${saved.stream}.`,
      source: "Revenue Center",
      metadata: { stream: saved.stream, proof_url: saved.proof_url },
    });
    if (event.error) toast.warning(`Revenue saved; timeline needs attention: ${event.error.message}`);
    toast.success("Revenue logged");
    setOpen(false);
    setForm({ entry_date: todayISO(), stream: "Detailing", amount: "", payment_method: "", proof_url: "", notes: "" });
    load();
  };

  return (
    <div>
      <PageHeader
        title="Revenue Center"
        description="Log every dollar. Attach proof."
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Log Revenue</Button>}
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatBox label="Today" value={money(totals.today)} />
          <StatBox label="Yesterday" value={money(totals.yesterday)} />
          <StatBox label="This week" value={money(totals.week)} />
          <StatBox label="Last week" value={money(totals.lastWeek)} />
          <StatBox label="This month" value={money(totals.month)} />
          <StatBox label="Last month" value={money(totals.lastMonth)} />
          <StatBox label="Deposits" value={money(totals.deposits)} />
          <StatBox label="Revenue collected" value={money(totals.revenueCollected)} />
          <StatBox label="Outstanding estimates" value={money(totals.outstandingEstimates)} />
          <StatBox label="Outstanding deposits" value={money(totals.outstandingDeposits)} />
          <StatBox label="Average ticket" value={money(totals.averageTicket)} />
          <StatBox label="Monthly growth" value={totals.monthlyGrowthPct === null ? "Incomplete Historical Data" : `${totals.monthlyGrowthPct}%`} />
        </div>

        {entries.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="surface p-4">
              <h3 className="text-sm font-semibold mb-3">Last 6 months</h3>
              <div className="h-40">
                <ResponsiveContainer>
                  <BarChart data={monthly}>
                    <XAxis dataKey="month" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(v: unknown) => money(Number(v))} />
                    <Bar dataKey="amount" fill="hsl(var(--gold))" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface p-4">
              <h3 className="text-sm font-semibold mb-3">By stream</h3>
              <div className="h-40">
                <ResponsiveContainer>
                  <BarChart data={byStream}>
                    <XAxis dataKey="stream" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(v: unknown) => money(Number(v))} />
                    <Bar dataKey="amount" fill="hsl(var(--forest))" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface p-4">
              <h3 className="text-sm font-semibold mb-3">Revenue by business unit</h3>
              <div className="h-40">
                <ResponsiveContainer>
                  <BarChart data={byBusinessUnit}>
                    <XAxis dataKey="businessUnit" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(v: unknown) => money(Number(v))} />
                    <Bar dataKey="amount" fill="hsl(var(--gold))" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Mapped from revenue stream because revenue entries do not yet store lead IDs.</p>
            </div>
            <div className="surface p-4">
              <h3 className="text-sm font-semibold mb-3">Revenue by lead source</h3>
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                Incomplete Historical Data — revenue entries do not reliably link to lead source yet.
              </div>
            </div>
            <div className="surface p-4">
              <h3 className="text-sm font-semibold mb-3">Outstanding estimates by business unit</h3>
              <div className="h-40">
                <ResponsiveContainer>
                  <BarChart data={estimatesByUnit}>
                    <XAxis dataKey="businessUnit" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip formatter={(v: unknown) => money(Number(v))} />
                    <Bar dataKey="amount" fill="hsl(var(--forest))" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select value={streamFilter} onValueChange={(v) => setStreamFilter(v as "all" | Stream)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All streams</SelectItem>
              {STREAMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : filtered.length === 0 ? (
            <EmptyState icon={DollarSign} title="No revenue logged" description="Log your first payment to start tracking today, week, and month totals."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Log Revenue</Button>} />
          ) : (
            <div className="surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Stream</th>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2">{e.entry_date}</td>
                      <td className="px-3 py-2">{e.stream}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.payment_method ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">{moneyExact(e.amount)}</td>
                      <td className="px-3 py-2">
                        {e.proof_url ? <a className="text-xs underline underline-offset-2" href={e.proof_url} target="_blank" rel="noreferrer">Open</a>
                          : <span className="inline-flex items-center gap-1 text-[11px] text-warning"><AlertTriangle className="h-3 w-3" />No proof</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Log Revenue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Date</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
              <div><Label className="text-xs">Amount *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Stream</Label>
              <Select value={form.stream} onValueChange={(v) => setForm({ ...form, stream: v as Stream })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STREAMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Payment method</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Cash, Zelle, Square…" /></div>
            <div><Label className="text-xs">Proof URL</Label><Input value={form.proof_url} onChange={(e) => setForm({ ...form, proof_url: e.target.value })} placeholder="Receipt or screenshot link" /></div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

