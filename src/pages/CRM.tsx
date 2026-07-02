import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CloudUpload, Mail, MessageSquare, Phone, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import {
  LEAD_STATUSES, LEAD_TYPES, getOpenPipelineValue, isOpenLead,
  type LeadStatus, type LeadType,
} from "@/lib/crmPipeline";

type Lead = {
  id: string;
  name: string;
  business: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  lead_type: LeadType;
  service_needed: string | null;
  status: LeadStatus;
  estimated_value: number | null;
  deposit: number | null;
  booking_at: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const emptyLead: Partial<Lead> = { name: "", status: "New Lead", lead_type: "Detailing" };

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"all" | LeadStatus | "overdue">("all");
  const [leadType, setLeadType] = useState<"all" | LeadType>("all");
  const [editing, setEditing] = useState<Partial<Lead>>(emptyLead);
  const [editOpen, setEditOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (params.get("new")) {
      setEditing(emptyLead);
      setEditOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const isOverdue = (lead: Lead) =>
    Boolean(lead.next_follow_up_at && lead.next_follow_up_at < new Date().toISOString() && isOpenLead(lead));

  const filtered = useMemo(() => leads.filter((lead) => {
    if (stage === "overdue" && !isOverdue(lead)) return false;
    if (stage !== "all" && stage !== "overdue" && lead.status !== stage) return false;
    if (leadType !== "all" && lead.lead_type !== leadType) return false;
    if (!query) return true;
    const value = query.toLowerCase();
    return [lead.name, lead.business, lead.email, lead.phone, lead.service_needed, lead.source]
      .some((item) => item?.toLowerCase().includes(value));
  }), [leads, query, stage, leadType]);

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name is required");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sign in again before saving.");
    const payload: any = { ...editing, user_id: auth.user.id };
    for (const key of ["estimated_value", "deposit"]) {
      if (payload[key] === "" || payload[key] === undefined) payload[key] = null;
    }
    for (const key of ["booking_at", "next_follow_up_at", "last_contact_at"]) {
      if (payload[key] === "") payload[key] = null;
    }
    const result = editing.id
      ? await supabase.from("leads").update(payload).eq("id", editing.id)
      : await supabase.from("leads").insert(payload);
    if (result.error) return toast.error(result.error.message);
    toast.success("Lead saved");
    setEditOpen(false);
    setEditing(emptyLead);
    load();
  };

  const logContact = async (lead: Lead, kind: "Call" | "Text" | "Email") => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await Promise.all([
      supabase.from("lead_activities").insert({
        user_id: auth.user.id, lead_id: lead.id, kind, detail: `${kind} action opened from CRM`,
      }),
      supabase.from("leads").update({ last_contact_at: new Date().toISOString() }).eq("id", lead.id),
    ]);
  };

  const syncToNotion = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("notion-sync", {
      body: { action: "sync", entity: "leads" },
    });
    if (error || !data?.synced) {
      toast.error("Notion CRM sync failed", { description: error?.message ?? data?.error ?? "No verified sync result." });
    } else {
      toast.success("CRM synced to Notion", {
        description: `${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.failed ?? 0} failed.`,
      });
    }
    setSyncing(false);
  };

  const openPipeline = getOpenPipelineValue(leads);

  return (
    <div>
      <PageHeader
        title="CRM Revenue Pipeline"
        description="One shared pipeline for detailing, logistics, and dealer or fleet opportunities."
        actions={<>
          <Button size="sm" variant="outline" onClick={syncToNotion} disabled={syncing}>
            <CloudUpload className="mr-1.5 h-4 w-4" />{syncing ? "Syncing..." : "Sync to Notion"}
          </Button>
          <Button size="sm" onClick={() => { setEditing(emptyLead); setEditOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />Add Lead
          </Button>
        </>}
      />

      <div className="space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Open pipeline" value={money(openPipeline)} />
          <Metric label="Open leads" value={String(leads.filter(isOpenLead).length)} />
          <Metric label="Follow-ups due" value={String(leads.filter(isOverdue).length)} />
          <Metric label="Booked" value={String(leads.filter((lead) => lead.status === "Booked").length)} />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {LEAD_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStage(status)}
              className={`surface min-h-20 p-3 text-left transition-colors hover:border-gold/50 ${stage === status ? "border-gold" : ""}`}
            >
              <div className="text-xl font-semibold tabular-nums">{leads.filter((lead) => lead.status === status).length}</div>
              <div className="mt-1 text-xs text-muted-foreground">{status}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads..." className="pl-8" />
          </div>
          <Select value={stage} onValueChange={(value: any) => setStage(value)}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="overdue">Overdue follow-ups</SelectItem>
              {LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={leadType} onValueChange={(value: any) => setLeadType(value)}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lead types</SelectItem>
              {LEAD_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matching leads"
            description="Add a lead or change the current pipeline filters."
            action={<Button size="sm" onClick={() => { setEditing(emptyLead); setEditOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Add Lead</Button>}
          />
        ) : (
          <>
            <div className="surface hidden overflow-hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Lead</th>
                    <th className="px-3 py-2 text-left">Stage</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-right">Est. value</th>
                    <th className="px-3 py-2 text-left">Follow-up</th>
                    <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr key={lead.id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => { setEditing(lead); setEditOpen(true); }}>
                      <td className="px-3 py-2"><div className="font-medium">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.business ?? lead.service_needed ?? ""}</div></td>
                      <td className="px-3 py-2"><StatusPill status={lead.status} /></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{lead.lead_type}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{lead.source ?? "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{lead.estimated_value ? money(lead.estimated_value) : "-"}</td>
                      <td className={`px-3 py-2 text-xs ${isOverdue(lead) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                        {isOverdue(lead) && <AlertCircle className="mr-1 inline h-3 w-3" />}
                        {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-3 py-2"><ContactActions lead={lead} logContact={logContact} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 md:hidden">
              {filtered.map((lead) => (
                <div key={lead.id} className="surface p-3" onClick={() => { setEditing(lead); setEditOpen(true); }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="truncate font-medium">{lead.name}</div><div className="text-xs text-muted-foreground">{lead.lead_type} | {lead.source ?? "No source"}</div></div>
                    <StatusPill status={lead.status} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{lead.service_needed ?? "No service set"}</span>
                    <span>{lead.estimated_value ? money(lead.estimated_value) : ""}</span>
                  </div>
                  {isOverdue(lead) && <div className="mt-2 flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />Follow-up overdue</div>}
                  <div className="mt-3" onClick={(event) => event.stopPropagation()}><ContactActions lead={lead} logContact={logContact} /></div>
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

function ContactActions({ lead, logContact }: { lead: Lead; logContact: (lead: Lead, kind: "Call" | "Text" | "Email") => void }) {
  return (
    <div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {lead.phone && <a title="Call lead" href={`tel:${lead.phone}`} onClick={() => logContact(lead, "Call")} className="rounded border p-2 hover:bg-muted"><Phone className="h-4 w-4" /></a>}
      {lead.phone && <a title="Text lead" href={`sms:${lead.phone}`} onClick={() => logContact(lead, "Text")} className="rounded border p-2 hover:bg-muted"><MessageSquare className="h-4 w-4" /></a>}
      {lead.email && <a title="Email lead" href={`mailto:${lead.email}`} onClick={() => logContact(lead, "Email")} className="rounded border p-2 hover:bg-muted"><Mail className="h-4 w-4" /></a>}
    </div>
  );
}

function StatusPill({ status }: { status: LeadStatus }) {
  const styles: Record<LeadStatus, string> = {
    "New Lead": "border-gold/30 bg-gold/15",
    "Contacted": "bg-muted",
    "Quoted": "border-forest/20 bg-forest/10 text-forest",
    "Booked": "bg-forest text-forest-foreground",
    "Completed": "bg-foreground text-background",
    "Review Requested": "bg-muted",
    "Closed/Lost": "border-destructive/20 bg-destructive/10 text-destructive",
  };
  return <span className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${styles[status]}`}>{status}</span>;
}

function LeadDialog({ open, onOpenChange, lead, setLead, onSave }: any) {
  const current = lead as Partial<Lead>;
  const set = (key: keyof Lead, value: any) => setLead({ ...current, [key]: value });
  const dateTimeValue = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{current.id ? "Edit Lead" : "Add Lead"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Name *"><Input value={current.name ?? ""} onChange={(event) => set("name", event.target.value)} /></Field>
          <Field label="Business"><Input value={current.business ?? ""} onChange={(event) => set("business", event.target.value)} /></Field>
          <Field label="Phone"><Input value={current.phone ?? ""} onChange={(event) => set("phone", event.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={current.email ?? ""} onChange={(event) => set("email", event.target.value)} /></Field>
          <Field label="Lead type"><Select value={current.lead_type ?? "Detailing"} onValueChange={(value) => set("lead_type", value as LeadType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Source"><Input value={current.source ?? ""} onChange={(event) => set("source", event.target.value)} placeholder="Referral, Google, Facebook..." /></Field>
          <Field label="Service needed"><Input value={current.service_needed ?? ""} onChange={(event) => set("service_needed", event.target.value)} /></Field>
          <Field label="Stage"><Select value={current.status ?? "New Lead"} onValueChange={(value) => set("status", value as LeadStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Estimated value"><Input type="number" min="0" step="0.01" value={current.estimated_value ?? ""} onChange={(event) => set("estimated_value", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Deposit"><Input type="number" min="0" step="0.01" value={current.deposit ?? ""} onChange={(event) => set("deposit", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Booking date/time"><Input type="datetime-local" value={dateTimeValue(current.booking_at)} onChange={(event) => set("booking_at", event.target.value ? new Date(event.target.value).toISOString() : null)} /></Field>
          <Field label="Next follow-up"><Input type="datetime-local" value={dateTimeValue(current.next_follow_up_at)} onChange={(event) => set("next_follow_up_at", event.target.value ? new Date(event.target.value).toISOString() : null)} /></Field>
        </div>
        <Field label="Notes"><Textarea rows={4} value={current.notes ?? ""} onChange={(event) => set("notes", event.target.value)} /></Field>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={onSave}>Save lead</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>;
}
