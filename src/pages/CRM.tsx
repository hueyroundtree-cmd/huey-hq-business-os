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
import { Users, Plus, Phone, Mail, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { money } from "@/lib/format";
import { emitOperationEvent } from "@/lib/eventEngine";

const STATUSES = ["New Lead","Contacted","Quote Sent","Booked","Completed","Review Requested","Lost","Follow-Up Needed"] as const;
type Status = typeof STATUSES[number];

type Lead = {
  id: string; name: string; business: string | null; phone: string | null; email: string | null;
  source: string | null; service_needed: string | null; status: Status;
  quote_amount: number | null; deposit: number | null;
  booking_at: string | null; last_contact_at: string | null; next_follow_up_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
};

const empty: Partial<Lead> = { name: "", status: "New Lead" };

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Status | "overdue">("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Lead>>(empty);
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (params.get("new")) { setEditing(empty); setEditOpen(true); params.delete("new"); setParams(params, { replace: true }); }
  }, [params]);

  const filtered = useMemo(() => {
    const now = new Date().toISOString();
    return leads.filter((l) => {
      if (filter === "overdue") { if (!l.next_follow_up_at || l.next_follow_up_at > now) return false; }
      else if (filter !== "all" && l.status !== filter) return false;
      if (q) {
        const s = q.toLowerCase();
        return [l.name, l.business, l.email, l.phone, l.service_needed].some(v => v?.toLowerCase().includes(s));
      }
      return true;
    });
  }, [leads, q, filter]);

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name is required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const payload: any = { ...editing, user_id: uid };
    for (const k of ["quote_amount","deposit"] as const) if (payload[k] === "" || payload[k] === undefined) payload[k] = null;
    for (const k of ["booking_at","next_follow_up_at","last_contact_at"] as const) if (payload[k] === "") payload[k] = null;

    const isNew = !editing.id;
    if (isNew && !payload.next_follow_up_at) {
      const followUp = new Date();
      followUp.setDate(followUp.getDate() + 2);
      followUp.setHours(9, 0, 0, 0);
      payload.next_follow_up_at = followUp.toISOString();
    }

    const previous = editing.id ? leads.find((lead) => lead.id === editing.id) : null;
    const res = editing.id
      ? await supabase.from("leads").update(payload).eq("id", editing.id).select("*").single()
      : await supabase.from("leads").insert(payload).select("*").single();
    if (res.error) return toast.error(res.error.message);
    const saved = res.data as Lead;

    if (isNew) {
      const followDate = saved.next_follow_up_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const { data: zoho } = await supabase.from("integrations").select("status").eq("provider", "Zoho Mail").maybeSingle();
      const zohoConnected = zoho?.status === "Connected";

      const results = await Promise.all([
        supabase.from("lead_activities").insert({
          user_id: uid,
          lead_id: saved.id,
          kind: "Lead added",
          detail: `${saved.source ?? "Direct"} lead added to the shared CRM`,
        }),
        supabase.from("tasks").insert({
          user_id: uid,
          title: `Follow up with ${saved.name}`,
          for_date: followDate,
          proof_note: `Auto-created from lead ${saved.id}`,
        }),
        emitOperationEvent({
          userId: uid,
          eventType: "lead_added",
          entityType: "lead",
          entityId: saved.id,
          title: "Lead added",
          detail: `${saved.name} entered the CRM from ${saved.source ?? "an unspecified source"}.`,
          source: "CRM",
        }),
        emitOperationEvent({
          userId: uid,
          eventType: zohoConnected ? "zoho_draft_requested" : "zoho_draft_queued",
          entityType: "lead",
          entityId: saved.id,
          title: zohoConnected ? "Zoho draft requested" : "Zoho draft queued",
          detail: zohoConnected
            ? "Zoho is connected; the lead is ready for the approved draft workflow."
            : "Zoho is not connected. No email was created or sent.",
          source: "Outreach Command",
        }),
        emitOperationEvent({
          userId: uid,
          eventType: "ai_sales_manager_notified",
          entityType: "lead",
          entityId: saved.id,
          title: "AI Sales Manager notified",
          detail: `Next action: review ${saved.name} and personalize the first outreach.`,
          source: "AI Sales Manager",
        }),
      ]);

      const setupError = results.find((result: any) => result?.error)?.error;
      if (setupError) {
        toast.warning(`Lead saved; automation needs attention: ${setupError.message}`);
      } else {
        toast.success("Lead saved and follow-up workflow created");
      }
    } else {
      if (previous?.status !== saved.status) {
        await Promise.all([
          supabase.from("lead_activities").insert({
            user_id: uid,
            lead_id: saved.id,
            kind: saved.status,
            detail: `Status changed from ${previous?.status ?? "Unknown"} to ${saved.status}`,
          }),
          emitOperationEvent({
            userId: uid,
            eventType: saved.status.toLowerCase().replace(/\s+/g, "_"),
            entityType: "lead",
            entityId: saved.id,
            title: saved.status,
            detail: `${saved.name} moved from ${previous?.status ?? "Unknown"} to ${saved.status}.`,
            source: "CRM",
          }),
        ]);
      }
      toast.success("Lead saved");
    }
    setEditOpen(false); setEditing(empty); load();
  };

  const overdueBadge = (l: Lead) => l.next_follow_up_at && l.next_follow_up_at < new Date().toISOString();

  return (
    <div>
      <PageHeader
        title="Master CRM"
        description="Every lead, in one list. Overdue follow-ups float to the top."
        actions={<Button size="sm" onClick={() => { setEditing(empty); setEditOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Add Lead</Button>}
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, business, email…" className="pl-8" />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="overdue">Overdue follow-ups</SelectItem>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No leads yet" description="Add your first lead to see follow-ups and pipeline totals populate the dashboard."
            action={<Button size="sm" onClick={() => { setEditing(empty); setEditOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Add Lead</Button>} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Service</th>
                    <th className="text-right px-3 py-2">Quote</th>
                    <th className="text-left px-3 py-2">Follow-up</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => { setEditing(l); setEditOpen(true); }}>
                      <td className="px-3 py-2">
                        <div className="font-medium">{l.name}</div>
                        {l.business && <div className="text-xs text-muted-foreground">{l.business}</div>}
                      </td>
                      <td className="px-3 py-2"><StatusPill status={l.status} /></td>
                      <td className="px-3 py-2 text-muted-foreground">{l.service_needed ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{l.quote_amount ? money(l.quote_amount) : "—"}</td>
                      <td className="px-3 py-2">
                        {l.next_follow_up_at ? (
                          <span className={`text-xs ${overdueBadge(l) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {overdueBadge(l) && <AlertCircle className="inline h-3 w-3 mr-1" />}
                            {new Date(l.next_follow_up_at).toLocaleDateString()}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-1">
                          {l.phone && <a onClick={(e) => e.stopPropagation()} href={`tel:${l.phone}`} className="p-1.5 rounded hover:bg-muted"><Phone className="h-3.5 w-3.5" /></a>}
                          {l.email && <a onClick={(e) => e.stopPropagation()} href={`mailto:${l.email}`} className="p-1.5 rounded hover:bg-muted"><Mail className="h-3.5 w-3.5" /></a>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map(l => (
                <div key={l.id} className="surface p-3" onClick={() => { setEditing(l); setEditOpen(true); }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.name}</div>
                      {l.business && <div className="text-xs text-muted-foreground truncate">{l.business}</div>}
                    </div>
                    <StatusPill status={l.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{l.service_needed ?? "—"}</span>
                    <span>{l.quote_amount ? money(l.quote_amount) : ""}</span>
                  </div>
                  {overdueBadge(l) && <div className="mt-1 text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />Follow-up overdue</div>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <LeadDialog open={editOpen} onOpenChange={setEditOpen} lead={editing} setLead={setEditing} onSave={save} />
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    "New Lead": "bg-gold/15 text-gold-foreground/80 border-gold/30",
    "Contacted": "bg-muted text-foreground/70",
    "Quote Sent": "bg-forest/10 text-forest border-forest/20",
    "Booked": "bg-forest text-forest-foreground",
    "Completed": "bg-foreground text-background",
    "Review Requested": "bg-muted text-foreground",
    "Lost": "bg-destructive/10 text-destructive border-destructive/20",
    "Follow-Up Needed": "bg-warning/15 text-warning border-warning/30",
  };
  return <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${map[status]}`}>{status}</span>;
}

function LeadDialog({ open, onOpenChange, lead, setLead, onSave }: any) {
  const l = lead as Partial<Lead>;
  const set = (k: keyof Lead, v: any) => setLead({ ...l, [k]: v });
  const dtVal = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{l.id ? "Edit Lead" : "Add Lead"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name *"><Input value={l.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Business"><Input value={l.business ?? ""} onChange={(e) => set("business", e.target.value)} /></Field>
          <Field label="Phone"><Input value={l.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={l.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Source"><Input value={l.source ?? ""} onChange={(e) => set("source", e.target.value)} placeholder="Referral, IG, Google…" /></Field>
          <Field label="Service needed"><Input value={l.service_needed ?? ""} onChange={(e) => set("service_needed", e.target.value)} /></Field>
          <Field label="Status">
            <Select value={l.status ?? "New Lead"} onValueChange={(v) => set("status", v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Quote amount"><Input type="number" step="0.01" value={l.quote_amount ?? ""} onChange={(e) => set("quote_amount", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Deposit"><Input type="number" step="0.01" value={l.deposit ?? ""} onChange={(e) => set("deposit", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Booking date/time"><Input type="datetime-local" value={dtVal(l.booking_at)} onChange={(e) => set("booking_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
          <Field label="Last contact"><Input type="datetime-local" value={dtVal(l.last_contact_at)} onChange={(e) => set("last_contact_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
          <Field label="Next follow-up"><Input type="datetime-local" value={dtVal(l.next_follow_up_at)} onChange={(e) => set("next_follow_up_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={3} value={l.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
