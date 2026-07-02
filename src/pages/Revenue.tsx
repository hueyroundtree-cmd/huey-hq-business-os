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
import { money, moneyExact, todayISO, startOfWeekISO, startOfMonthISO } from "@/lib/format";
import { useSearchParams } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { emitOperationEvent } from "@/lib/eventEngine";

const STREAMS = ["Detailing","Logistics","Shopify","Stan Store","Gig Work","Content","Investing","Other"] as const;

type Entry = { id: string; entry_date: string; stream: string; amount: number; payment_method: string | null; proof_url: string | null; notes: string | null };

export default function Revenue() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamFilter, setStreamFilter] = useState<"all" | typeof STREAMS[number]>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ entry_date: todayISO(), stream: "Detailing", amount: "", payment_method: "", proof_url: "", notes: "" });
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("revenue_entries").select("*").order("entry_date", { ascending: false });
    setEntries((data as Entry[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (params.get("new")) { setOpen(true); params.delete("new"); setParams(params, { replace: true }); } }, [params]);

  const filtered = useMemo(() => streamFilter === "all" ? entries : entries.filter(e => e.stream === streamFilter), [entries, streamFilter]);

  const totals = useMemo(() => {
    const t = todayISO(), w = startOfWeekISO(), m = startOfMonthISO();
    return {
      today: entries.filter(e => e.entry_date === t).reduce((s, e) => s + Number(e.amount), 0),
      week: entries.filter(e => e.entry_date >= w).reduce((s, e) => s + Number(e.amount), 0),
      month: entries.filter(e => e.entry_date >= m).reduce((s, e) => s + Number(e.amount), 0),
    };
  }, [entries]);

  const byStream = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => map.set(e.stream, (map.get(e.stream) ?? 0) + Number(e.amount)));
    return Array.from(map, ([stream, amount]) => ({ stream, amount }));
  }, [entries]);

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
    const uid = u.user?.id!;
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
        <div className="grid grid-cols-3 gap-3">
          <StatBox label="Today" value={money(totals.today)} />
          <StatBox label="This week" value={money(totals.week)} />
          <StatBox label="This month" value={money(totals.month)} />
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
                    <Tooltip formatter={(v: any) => money(Number(v))} />
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
                    <Tooltip formatter={(v: any) => money(Number(v))} />
                    <Bar dataKey="amount" fill="hsl(var(--forest))" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Select value={streamFilter} onValueChange={(v: any) => setStreamFilter(v)}>
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
              <Select value={form.stream} onValueChange={(v) => setForm({ ...form, stream: v })}>
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

function StatBox({ label, value }: any) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
