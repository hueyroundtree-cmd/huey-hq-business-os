import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, CalendarCheck, CloudUpload, Copy, ExternalLink, FileSpreadsheet, Mail, MessageSquare, Phone, Plus, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/format";
import { dryRunLeadImport, findLeadDuplicate, type ImportDryRunReport } from "@/lib/crmImport";
import { ZOHO_PRIMARY_SENDER, duplicateSendMessage, saveZohoDraft, sendZohoEmail, syncZohoReplyManually } from "@/lib/zohoMail";
import {
  BUSINESS_UNITS,
  DEFAULT_BUSINESS_UNIT_ID,
  LEAD_STATUSES,
  LEAD_TYPES,
  getOpenPipelineValue,
  isOpenLead,
  type LeadStatus,
  type LeadType,
} from "@/lib/crmPipeline";
import {
  CRM_WORKFLOW_STAGES,
  WAITING_FOLLOW_UP,
  getCrmDailySummary,
  getCrmWorkflowStage,
  matchesCrmDailyKpi,
  type CrmDailyKpi,
  type CrmWorkflowStage,
} from "@/lib/crmWorkflow";
import { emitOperationEvent } from "@/lib/eventEngine";

type Lead = {
  id: string;
  user_id?: string;
  crm_id: string | null;
  name: string;
  business: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  city: string | null;
  industry: string | null;
  address_service_area: string | null;
  priority: string | null;
  verification_source: string | null;
  source_record_id: string | null;
  source_url: string | null;
  lead_type: LeadType;
  business_unit_id: string;
  lead_score: number | null;
  service_needed: string | null;
  vehicle: string | null;
  status: LeadStatus;
  estimated_value: number | null;
  quote_amount: number | null;
  deposit: number | null;
  deposit_status: string | null;
  appointment_status: string | null;
  booking_at: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  contact_method: string | null;
  contact_date: string | null;
  contacted_by: string | null;
  zoho_email_sent: boolean | null;
  email_subject: string | null;
  email_body: string | null;
  text_message_template: string | null;
  email_sent_at: string | null;
  zoho_last_sent_at: string | null;
  zoho_last_reply_at: string | null;
  zoho_last_message_id: string | null;
  zoho_last_subject: string | null;
  text_sent_at: string | null;
  next_action: string | null;
  outreach_status: string | null;
  date_added: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Activity = {
  id: string;
  lead_id: string | null;
  activity_source: string;
  event_type: string;
  title: string;
  detail: string | null;
  source: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
};

type EmailMessage = {
  id: string;
  lead_id: string | null;
  status: string;
  direction: string;
  from_address: string;
  to_address: string;
  subject: string;
  body: string;
  zoho_message_id: string | null;
  zoho_draft_id: string | null;
  sent_at: string | null;
  replied_at: string | null;
  follow_up_at: string | null;
  created_at: string;
};

type EmailComposer = {
  toAddress: string;
  subject: string;
  body: string;
  confirmDuplicate: boolean;
};

type ContactDraft = {
  contact_method: string;
  contact_date: string;
  contacted_by: string;
  zoho_email_sent: boolean;
  next_follow_up_at: string;
  detail: string;
};

const CONCORD_SOURCE = "Concord Professional Outreach";
const CONCORD_FILTERS = [
  "Ready to Send",
  "Waiting Follow-Up",
  "Contact Form",
  "Email Sent",
  "Text Sent",
  "Follow-Up Due",
  "Replied",
  "Booked",
  "Closed/Lost",
] as const;

const isConcordLead = (lead: Pick<Lead, "source">) => Boolean(lead.source?.includes(CONCORD_SOURCE));

const emptyLead: Partial<Lead> = {
  name: "",
  status: "New Lead",
  lead_type: "Detailing",
  business_unit_id: DEFAULT_BUSINESS_UNIT_ID,
  lead_score: 0,
  deposit_status: "Not Requested",
  appointment_status: "Not Scheduled",
};

const toLocalInput = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fromLocalInput = (value: string) => value ? new Date(value).toISOString() : null;

const businessUnitName = (id?: string | null) =>
  BUSINESS_UNITS.find((unit) => unit.id === id)?.name ?? "Great Freight Mobile Detailing";

const addBusinessDays = (date: Date, days: number) => {
  const next = new Date(date);
  let added = 0;
  while (added < days) {
    next.setDate(next.getDate() + 1);
    const day = next.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  next.setHours(9, 0, 0, 0);
  return next;
};

const copyText = async (label: string, value?: string | null) => {
  if (!value) return toast.error(`${label} is empty`);
  await navigator.clipboard.writeText(value);
  toast.success(`${label} copied`);
};

const mailtoHref = (lead: Lead) => {
  const params = new URLSearchParams();
  if (lead.email_subject) params.set("subject", lead.email_subject);
  if (lead.email_body) params.set("body", lead.email_body);
  return `mailto:${lead.email ?? ""}?${params.toString()}`;
};

const smsHref = (lead: Lead) => `sms:${lead.phone ?? ""}${lead.text_message_template ? `?&body=${encodeURIComponent(lead.text_message_template)}` : ""}`;

function EmailButton({
  lead,
  onOpenComposer,
  compact = false,
}: {
  lead: Lead;
  onOpenComposer: (lead: Lead) => void;
  compact?: boolean;
}) {
  if (!lead.email) return null;
  return (
    <button
      type="button"
      title="Open Zoho composer"
      aria-label="Open Zoho composer"
      onClick={() => onOpenComposer(lead)}
      className={compact ? "rounded border p-2 hover:bg-muted" : "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"}
    >
      <Mail className="h-4 w-4" />
      {!compact && <span>Email</span>}
    </button>
  );
}

function DefaultEmailAppButton({ lead, variant = "outline" }: { lead: Lead; variant?: "outline" | "ghost" }) {
  if (!lead.email) return null;
  return (
    <Button asChild size="sm" variant={variant}>
      <a href={mailtoHref(lead)}>
        <Mail className="mr-1.5 h-3.5 w-3.5" />Open Default Email App
      </a>
    </Button>
  );
}

const confirmManualEmailSend = (lead: Lead, composer: EmailComposer) =>
  window.confirm([
    `Send this Zoho email from ${ZOHO_PRIMARY_SENDER}?`,
    "",
    `To: ${composer.toAddress || lead.email || "No recipient"}`,
    `Subject: ${composer.subject || "No subject"}`,
    "",
    "Huey must review the editable message before sending. No prospect email is sent until you confirm here.",
  ].join("\n"));

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [crmActivities, setCrmActivities] = useState<Activity[]>([]);
  const [emailHistory, setEmailHistory] = useState<EmailMessage[]>([]);
  const [emailComposer, setEmailComposer] = useState<EmailComposer>(() => buildEmailComposer());
  const [emailBusy, setEmailBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<"all" | LeadStatus | "overdue">("all");
  const [workflowStage, setWorkflowStage] = useState<"all" | CrmWorkflowStage>("all");
  const [dailyFilter, setDailyFilter] = useState<"all" | CrmDailyKpi>("all");
  const [leadType, setLeadType] = useState<"all" | LeadType>("all");
  const [businessUnit, setBusinessUnit] = useState<"all" | string>("all");
  const [concordFilter, setConcordFilter] = useState<"all" | typeof CONCORD_FILTERS[number]>("all");
  const [editing, setEditing] = useState<Partial<Lead>>(emptyLead);
  const [editOpen, setEditOpen] = useState(false);
  const [contactLead, setContactLead] = useState<Lead | null>(null);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(() => buildContactDraft());
  const [importOpen, setImportOpen] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importReport, setImportReport] = useState<ImportDryRunReport | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  };

  const loadActivities = async (leadId?: string) => {
    if (!leadId) {
      setActivities([]);
      return;
    }
    const { data, error } = await (supabase as any).from("crm_activity")
      .select("*")
      .eq("lead_id", leadId)
      .order("occurred_at", { ascending: false })
      .limit(25);
    if (error) {
      setActivities([]);
      toast.warning("Activity timeline needs setup", { description: error.message });
      return;
    }
    setActivities((data as Activity[]) ?? []);
  };

  const loadCrmActivities = async () => {
    const { data, error } = await (supabase as any).from("crm_activity")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(500);
    if (error) {
      setCrmActivities([]);
      return;
    }
    setCrmActivities((data as Activity[]) ?? []);
  };

  const loadEmailHistory = async (leadId?: string) => {
    if (!leadId) {
      setEmailHistory([]);
      return;
    }
    const { data, error } = await (supabase as any).from("crm_email_messages")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      setEmailHistory([]);
      toast.warning("Email history needs setup", { description: error.message });
      return;
    }
    setEmailHistory((data as EmailMessage[]) ?? []);
  };

  useEffect(() => {
    load();
    loadCrmActivities();
  }, []);
  useEffect(() => {
    if (params.get("new")) {
      setEditing(emptyLead);
      setActivities([]);
      setEmailHistory([]);
      setEmailComposer(buildEmailComposer());
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
    if (workflowStage !== "all" && getCrmWorkflowStage(lead) !== workflowStage) return false;
    if (!matchesCrmDailyKpi(lead, dailyFilter, crmActivities)) return false;
    if (leadType !== "all" && lead.lead_type !== leadType) return false;
    if (businessUnit !== "all" && lead.business_unit_id !== businessUnit) return false;
    if (concordFilter !== "all") {
      if (!isConcordLead(lead)) return false;
      if (concordFilter === "Waiting Follow-Up" || concordFilter === "Follow-Up Due") {
        if (getCrmWorkflowStage(lead) !== concordFilter) return false;
      } else if (concordFilter === "Email Sent") {
        if (!lead.email_sent_at && !lead.zoho_last_sent_at) return false;
      } else if (concordFilter === "Text Sent") {
        if (!lead.text_sent_at) return false;
      } else if (lead.outreach_status !== concordFilter) return false;
    }
    if (!query) return true;
    const value = query.toLowerCase();
    return [
      lead.crm_id,
      lead.name,
      lead.business,
      lead.email,
      lead.phone,
      lead.industry,
      lead.city,
      lead.priority,
      lead.vehicle,
      lead.service_needed,
      lead.source,
      lead.source_record_id,
    ].some((item) => item?.toLowerCase().includes(value));
  }), [leads, query, stage, workflowStage, dailyFilter, crmActivities, leadType, businessUnit, concordFilter]);

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Name is required");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sign in again before saving.");
    const payload: any = {
      ...editing,
      user_id: auth.user.id,
      business_unit_id: editing.business_unit_id || DEFAULT_BUSINESS_UNIT_ID,
    };
    for (const key of ["estimated_value", "quote_amount", "deposit", "lead_score"]) {
      if (payload[key] === "" || payload[key] === undefined) payload[key] = null;
    }
    for (const key of ["booking_at", "next_follow_up_at", "last_contact_at", "contact_date"]) {
      if (payload[key] === "") payload[key] = null;
    }
    const isNew = !editing.id;
    if (isNew && !payload.next_follow_up_at) {
      const followUp = new Date();
      followUp.setDate(followUp.getDate() + 2);
      followUp.setHours(9, 0, 0, 0);
      payload.next_follow_up_at = followUp.toISOString();
    }
    const previous = editing.id ? leads.find((lead) => lead.id === editing.id) : null;
    const nowIso = new Date().toISOString();
    const movedToContacted = payload.status === "Contacted" && previous?.status !== "Contacted";
    const movedToBooked = payload.status === "Booked" && previous?.status !== "Booked";
    const movedToReplied = payload.outreach_status === "Replied" && previous?.outreach_status !== "Replied";

    if (isNew) {
      const { data: currentLeads, error: duplicateCheckError } = await supabase
        .from("leads")
        .select("crm_id,source_record_id,source_url,email,phone");
      if (duplicateCheckError) return toast.error(`Duplicate check failed: ${duplicateCheckError.message}`);
      const match = findLeadDuplicate(payload, currentLeads ?? []);
      if (match.duplicate) {
        return toast.error("Potential duplicate lead blocked", {
          description: `Matched an existing lead by ${match.reasons.join(", ")}. Merge verified details into that record.`,
        });
      }
    }

    if (movedToContacted) {
      payload.last_contact_at = payload.last_contact_at || nowIso;
      payload.contact_date = payload.contact_date || nowIso;
      payload.contact_method = payload.contact_method || "Manual Update";
      payload.contacted_by = payload.contacted_by || "Huey";
      payload.outreach_status = payload.outreach_status || WAITING_FOLLOW_UP;
      payload.next_follow_up_at = payload.next_follow_up_at || addBusinessDays(new Date(nowIso), 3).toISOString();
    }

    if (movedToBooked) {
      payload.booking_at = payload.booking_at || nowIso;
      payload.outreach_status = payload.outreach_status || "Booked";
      payload.appointment_status = payload.appointment_status || "Booked";
    }

    if (movedToReplied) {
      payload.zoho_last_reply_at = payload.zoho_last_reply_at || nowIso;
      payload.next_action = payload.next_action || "Review reply and book appointment";
    }

    const result = editing.id
      ? await supabase.from("leads").update(payload).eq("id", editing.id).select("*").single()
      : await supabase.from("leads").insert(payload).select("*").single();
    if (result.error) return toast.error(result.error.message);
    const saved = result.data as Lead;

    if (isNew) {
      const followDate = saved.next_follow_up_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const setup = await Promise.all([
        supabase.from("lead_activities").insert({
          user_id: auth.user.id,
          lead_id: saved.id,
          kind: "Lead added",
          detail: `${saved.source ?? "Direct"} lead added to Command Center CRM`,
        }),
        supabase.from("tasks").insert({
          user_id: auth.user.id,
          title: `Follow up with ${saved.name}`,
          for_date: followDate,
          proof_note: `Auto-created from lead ${saved.crm_id ?? saved.id}`,
        }),
        emitOperationEvent({
          userId: auth.user.id,
          eventType: "lead_added",
          entityType: "lead",
          entityId: saved.id,
          title: "Lead added",
          detail: `${saved.name} entered Command Center CRM from ${saved.source ?? "an unspecified source"}.`,
          source: "CRM",
          metadata: { crm_id: saved.crm_id, business_unit_id: saved.business_unit_id },
        }),
      ]);
      const setupError = setup.find((response) => response.error)?.error;
      if (setupError) toast.warning(`Lead saved; workflow needs attention: ${setupError.message}`);
      else toast.success("Lead saved and follow-up workflow created");
    } else {
      if (previous?.status !== saved.status) {
        const statusTitle = saved.status === "Contacted" ? "Lead contacted" : saved.status === "Booked" ? "Lead booked" : saved.status;
        const statusDetail = saved.status === "Contacted"
          ? `${saved.contact_method ?? "Manual update"} completed by ${saved.contacted_by ?? "Huey"}.`
          : `Status changed from ${previous?.status ?? "Unknown"} to ${saved.status}`;
        await Promise.all([
          supabase.from("lead_activities").insert({
            user_id: auth.user.id,
            lead_id: saved.id,
            kind: statusTitle,
            detail: statusDetail,
            created_at: saved.status === "Contacted" ? (saved.contact_date ?? saved.last_contact_at ?? nowIso) : nowIso,
          }),
          emitOperationEvent({
            userId: auth.user.id,
            eventType: saved.status === "Contacted" ? "lead_contacted" : saved.status.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
            entityType: "lead",
            entityId: saved.id,
            title: statusTitle,
            detail: statusDetail,
            source: "CRM",
            occurredAt: saved.status === "Contacted" ? (saved.contact_date ?? saved.last_contact_at ?? nowIso) : nowIso,
            metadata: { crm_id: saved.crm_id, contact_method: saved.contact_method, outreach_status: saved.outreach_status },
          }),
        ]);
      }
      if (previous?.outreach_status !== "Replied" && saved.outreach_status === "Replied") {
        await Promise.all([
          supabase.from("lead_activities").insert({
            user_id: auth.user.id,
            lead_id: saved.id,
            kind: "Reply received",
            detail: "Lead manually marked replied in CRM.",
            created_at: saved.zoho_last_reply_at ?? nowIso,
          }),
          emitOperationEvent({
            userId: auth.user.id,
            eventType: "lead_replied",
            entityType: "lead",
            entityId: saved.id,
            title: "Reply received",
            detail: `${saved.name} manually marked replied in CRM.`,
            source: "CRM",
            occurredAt: saved.zoho_last_reply_at ?? nowIso,
            metadata: { crm_id: saved.crm_id },
          }),
        ]);
      }
      toast.success("Lead saved");
    }
    setEditOpen(false);
    setEditing(emptyLead);
    setActivities([]);
    setEmailHistory([]);
    setEmailComposer(buildEmailComposer());
    await Promise.all([load(), loadCrmActivities()]);
  };

  const openLead = (lead: Lead) => {
    setEditing(lead);
    setEmailComposer(buildEmailComposer(lead));
    setEditOpen(true);
    loadActivities(lead.id);
    loadEmailHistory(lead.id);
  };

  const openEmailComposer = (lead: Lead) => {
    openLead(lead);
    toast.success("Zoho composer opened", { description: "Review the recipient, subject, and body before sending." });
  };

  const openContactWorkflow = (lead: Lead) => {
    setContactLead(lead);
    setContactDraft(buildContactDraft(lead));
  };

  const markContacted = async () => {
    if (!contactLead) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sign in again to mark contacted.");
    const contactDate = contactDraft.contact_date ? new Date(contactDraft.contact_date).toISOString() : new Date().toISOString();
    const nextFollowUp = contactDraft.next_follow_up_at ? new Date(contactDraft.next_follow_up_at).toISOString() : null;
    const nextStatus = contactLead.status === "New Lead" ? "Contacted" : contactLead.status;
    const detail = [
      `${contactDraft.contact_method} completed by ${contactDraft.contacted_by || "Huey"}`,
      contactDraft.zoho_email_sent ? "Zoho email manually confirmed sent." : "Zoho email not confirmed.",
      contactDraft.detail,
    ].filter(Boolean).join(" ");

    const [activity, update, event] = await Promise.all([
      supabase.from("lead_activities").insert({
        user_id: auth.user.id,
        lead_id: contactLead.id,
        kind: `Contacted: ${contactDraft.contact_method}`,
        detail,
        created_at: contactDate,
      }),
      supabase.from("leads").update({
        status: nextStatus,
        outreach_status: WAITING_FOLLOW_UP,
        last_contact_at: contactDate,
        contact_date: contactDate,
        contact_method: contactDraft.contact_method,
        contacted_by: contactDraft.contacted_by || "Huey",
        zoho_email_sent: contactDraft.zoho_email_sent,
        next_follow_up_at: nextFollowUp,
      }).eq("id", contactLead.id),
      emitOperationEvent({
        userId: auth.user.id,
        eventType: "lead_contacted",
        entityType: "lead",
        entityId: contactLead.id,
        title: "Lead contacted",
        detail,
        source: "CRM",
        occurredAt: contactDate,
        metadata: {
          crm_id: contactLead.crm_id,
          contact_method: contactDraft.contact_method,
          zoho_email_sent: contactDraft.zoho_email_sent,
          next_follow_up_at: nextFollowUp,
        },
      }),
    ]);
    const error = activity.error ?? update.error ?? event.error;
    if (error) return toast.error(error.message);
    toast.success(`Marked ${contactLead.name} contacted`);
    setContactLead(null);
    await load();
    await loadCrmActivities();
    if (editOpen && editing.id === contactLead.id) await loadActivities(contactLead.id);
  };

  const updateConcordAction = async (
    lead: Lead,
    action: "email_sent" | "text_sent" | "follow_up" | "booked",
  ) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sign in again to update the lead.");
    const now = new Date();
    const threeBusinessDays = addBusinessDays(now, 3).toISOString();
    const patch: Partial<Lead> = {};
    let title = "";
    let detail = "";

    if (action === "email_sent") {
      Object.assign(patch, {
        status: "Contacted",
        outreach_status: WAITING_FOLLOW_UP,
        zoho_email_sent: true,
        email_sent_at: now.toISOString(),
        last_contact_at: now.toISOString(),
        contact_date: now.toISOString(),
        contact_method: "Email",
        contacted_by: "Huey",
        next_follow_up_at: threeBusinessDays,
      });
      title = "Email sent";
      detail = "Personalized Concord outreach email marked sent manually.";
    }

    if (action === "text_sent") {
      Object.assign(patch, {
        status: lead.status === "New Lead" ? "Contacted" : lead.status,
        outreach_status: WAITING_FOLLOW_UP,
        text_sent_at: now.toISOString(),
        last_contact_at: now.toISOString(),
        contact_date: now.toISOString(),
        contact_method: "Text",
        contacted_by: "Huey",
        next_follow_up_at: lead.next_follow_up_at ?? threeBusinessDays,
      });
      title = "Text sent";
      detail = "Concord outreach text marked sent manually.";
    }

    if (action === "follow_up") {
      Object.assign(patch, {
        outreach_status: WAITING_FOLLOW_UP,
        next_follow_up_at: threeBusinessDays,
        next_action: "Follow up on Concord introduction",
      });
      title = "Follow-up completed";
      detail = "Concord follow-up completed and next follow-up scheduled three business days out.";
    }

    if (action === "booked") {
      Object.assign(patch, {
        status: "Booked",
        outreach_status: "Booked",
        appointment_status: "Booked",
        estimated_value: lead.estimated_value ?? 100,
        next_action: "Confirm appointment and collect deposit",
      });
      title = "Lead booked";
      detail = "Concord prospect marked booked and surfaced in Mission Control.";
    }

    const [update, activity, event] = await Promise.all([
      supabase.from("leads").update(patch).eq("id", lead.id),
      supabase.from("lead_activities").insert({
        user_id: auth.user.id,
        lead_id: lead.id,
        kind: title,
        detail,
      }),
      emitOperationEvent({
        userId: auth.user.id,
        eventType: action,
        entityType: "lead",
        entityId: lead.id,
        title,
        detail,
        source: "CRM",
        metadata: { crm_id: lead.crm_id, source_record_id: lead.source_record_id, source: lead.source },
      }),
    ]);
    const error = update.error ?? activity.error ?? event.error;
    if (error) return toast.error(error.message);
    toast.success(title);
    await load();
    await loadCrmActivities();
    if (editOpen && editing.id === lead.id) {
      setEditing({ ...lead, ...patch });
      await loadActivities(lead.id);
    }
  };

  const handleSaveZohoDraft = async (lead: Lead, composer: EmailComposer) => {
    if (!lead.id) return toast.error("Save the lead before saving a Zoho draft.");
    setEmailBusy(true);
    try {
      await saveZohoDraft({
        leadId: lead.id,
        toAddress: composer.toAddress,
        subject: composer.subject,
        body: composer.body,
      });
      toast.success("Zoho draft saved");
      await loadEmailHistory(lead.id);
    } catch (error) {
      toast.error("Zoho draft failed", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleSendZohoEmail = async (lead: Lead, composer: EmailComposer) => {
    if (!lead.id) return toast.error("Save the lead before sending.");
    if (!confirmManualEmailSend(lead, composer)) return toast.info("Zoho send canceled");
    setEmailBusy(true);
    try {
      const result = await sendZohoEmail({
        leadId: lead.id,
        toAddress: composer.toAddress,
        subject: composer.subject,
        body: composer.body,
        confirmDuplicate: composer.confirmDuplicate,
      });
      if (result.duplicateWarning) {
        toast.warning("Duplicate-send warning", { description: duplicateSendMessage(result.lastSent) });
        setEmailComposer({ ...composer, confirmDuplicate: true });
        return;
      }
      await supabase.from("leads").update({
        outreach_status: WAITING_FOLLOW_UP,
        next_action: "Follow up on Zoho email",
      }).eq("id", lead.id);
      toast.success("Zoho email sent", { description: "Follow-up scheduled three business days out." });
      await Promise.all([load(), loadActivities(lead.id), loadEmailHistory(lead.id), loadCrmActivities()]);
    } catch (error) {
      toast.error("Zoho send failed", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setEmailBusy(false);
    }
  };

  const handleManualReplySync = async (lead: Lead) => {
    if (!lead.id) return;
    setEmailBusy(true);
    try {
      await syncZohoReplyManually({
        leadId: lead.id,
        fromAddress: lead.email,
        subject: `Reply from ${lead.name}`,
        body: "Reply manually synced from Zoho Mail.",
      });
      toast.success("Reply synced manually");
      await Promise.all([load(), loadEmailHistory(lead.id)]);
    } catch (error) {
      toast.error("Reply sync failed", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setEmailBusy(false);
    }
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

  const runImportDryRun = () => {
    const report = dryRunLeadImport(importCsv, leads);
    setImportReport(report);
    if (!report.totalRows) toast.error("Paste a CSV with a header row and at least one lead.");
    else toast.success(`Dry run complete: ${report.readyRows}/${report.totalRows} rows ready`);
  };

  const commitImport = async () => {
    if (!importReport?.readyRows) return toast.error("Run a dry run with at least one import-ready row first.");
    const skipped = importReport.duplicateRows.length;
    if (!window.confirm(`Import ${importReport.readyRows} reviewed rows and skip ${skipped} duplicate row${skipped === 1 ? "" : "s"}? No outreach will be sent.`)) return;

    setImportBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setImportBusy(false);
      return toast.error("Sign in again before importing.");
    }

    const batchName = `CRM_UI_${new Date().toISOString().replace(/[:.]/g, "-")}`;
    const batchResult = await supabase.from("crm_import_batches").insert({
      user_id: auth.user.id,
      batch_name: batchName,
      source: "CRM Bulk Import",
      status: "Running",
      total_rows: importReport.totalRows,
      skipped_rows: skipped,
      original_headers: importCsv.split(/\r?\n/, 1)[0] ?? "",
    }).select("id").single();
    if (batchResult.error) {
      setImportBusy(false);
      return toast.error("Import batch storage needs setup", { description: batchResult.error.message });
    }

    const duplicateRows = new Set(importReport.duplicateRows);
    const readyDrafts = importReport.drafts.filter((_, index) => !duplicateRows.has(index + 2));
    const leadResult = await supabase.from("leads").insert(readyDrafts.map((draft) => ({
      ...draft,
      user_id: auth.user.id,
      import_batch_id: batchResult.data.id,
      date_added: new Date().toISOString().slice(0, 10),
      outreach_status: "Not Contacted",
      zoho_email_sent: false,
      deposit_status: "Not Requested",
      appointment_status: "Not Scheduled",
      next_action: "Review lead and choose a verified outreach method",
    }))).select("id,name,source_record_id");

    if (leadResult.error) {
      await supabase.from("crm_import_batches").update({
        status: "Failed",
        failed_rows: readyDrafts.length,
        latest_error: leadResult.error.message,
        completed_at: new Date().toISOString(),
      }).eq("id", batchResult.data.id);
      setImportBusy(false);
      return toast.error("No leads were imported", { description: leadResult.error.message });
    }

    const imported = leadResult.data ?? [];
    if (imported.length) {
      await supabase.from("lead_activities").insert(imported.map((lead: { id: string; name: string; source_record_id: string | null }) => ({
        user_id: auth.user!.id,
        lead_id: lead.id,
        kind: "Lead imported",
        detail: `${lead.source_record_id ?? lead.name} imported in reviewed batch ${batchName}; outreach not sent.`,
      })));
    }
    await supabase.from("crm_import_batches").update({
      status: "Completed",
      imported_rows: imported.length,
      completed_at: new Date().toISOString(),
    }).eq("id", batchResult.data.id);

    setImportBusy(false);
    setImportOpen(false);
    setImportCsv("");
    setImportReport(null);
    await Promise.all([load(), loadCrmActivities()]);
    toast.success("Bulk import completed", { description: `${imported.length} imported, ${skipped} duplicates skipped. No outreach was sent.` });
  };

  const openPipeline = getOpenPipelineValue(leads);
  const concordLeads = useMemo(() => leads.filter(isConcordLead), [leads]);
  const workflowSummary = useMemo(() => CRM_WORKFLOW_STAGES.map((workflow) => ({
    workflow,
    count: leads.filter((lead) => getCrmWorkflowStage(lead) === workflow).length,
  })), [leads]);
  const todaySummary = useMemo(() => getCrmDailySummary(leads, crmActivities), [leads, crmActivities]);
  const concordSummary = useMemo(() => {
    const followDue = concordLeads.filter((lead) =>
      lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date() && !["Booked", "Closed/Lost"].includes(lead.outreach_status ?? ""),
    );
    return {
      total: concordLeads.length,
      emailsReady: concordLeads.filter((lead) => lead.outreach_status === "Ready to Send" && Boolean(lead.email)).length,
      waitingFollowUp: concordLeads.filter((lead) => getCrmWorkflowStage(lead) === WAITING_FOLLOW_UP).length,
      emailsSent: concordLeads.filter((lead) => Boolean(lead.email_sent_at || lead.zoho_last_sent_at)).length,
      textsSent: concordLeads.filter((lead) => Boolean(lead.text_sent_at)).length,
      followUpsDue: followDue.length,
      responses: concordLeads.filter((lead) => lead.outreach_status === "Replied").length,
      bookings: concordLeads.filter((lead) => lead.status === "Booked" || lead.outreach_status === "Booked").length,
      value: concordLeads.reduce((sum, lead) => sum + Number(lead.estimated_value ?? 100), 0),
    };
  }, [concordLeads]);

  return (
    <div>
      <PageHeader
        title="Command Center CRM"
        description="One shared pipeline for detailing, logistics, commerce, content, software and future business units."
        actions={<>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />Bulk Import Leads
          </Button>
          <Button size="sm" variant="outline" onClick={syncToNotion} disabled={syncing}>
            <CloudUpload className="mr-1.5 h-4 w-4" />{syncing ? "Syncing..." : "Sync to Notion"}
          </Button>
          <Button size="sm" onClick={() => { setEditing(emptyLead); setActivities([]); setEmailHistory([]); setEmailComposer(buildEmailComposer()); setEditOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />Add Lead
          </Button>
        </>}
      />

      <div className="space-y-4 p-4 md:p-6">
        <section className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">All CRM Pipeline Metrics</div>
            <p className="mt-1 text-sm text-muted-foreground">Whole-CRM view across every lead source and business unit.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Metric label="Open pipeline" value={money(openPipeline)} onClick={() => { setStage("all"); setWorkflowStage("all"); setDailyFilter("all"); setConcordFilter("all"); }} />
            <Metric label="Open leads" value={String(leads.filter(isOpenLead).length)} onClick={() => { setStage("all"); setWorkflowStage("all"); setDailyFilter("all"); setConcordFilter("all"); }} />
            <Metric label="New leads" value={String(leads.filter((lead) => lead.status === "New Lead").length)} onClick={() => { setStage("New Lead"); setWorkflowStage("all"); setDailyFilter("all"); setConcordFilter("all"); }} active={stage === "New Lead"} />
            <Metric label="Follow-ups due" value={String(leads.filter((lead) => getCrmWorkflowStage(lead) === "Follow-Up Due").length)} onClick={() => { setStage("all"); setWorkflowStage("Follow-Up Due"); setDailyFilter("all"); setConcordFilter("all"); }} active={workflowStage === "Follow-Up Due"} />
            <Metric label="Booked" value={String(leads.filter((lead) => lead.status === "Booked").length)} onClick={() => { setStage("Booked"); setWorkflowStage("all"); setDailyFilter("all"); setConcordFilter("all"); }} active={stage === "Booked"} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Contacted Today" value={String(todaySummary.contacted)} onClick={() => { setDailyFilter("contacted_today"); setStage("all"); setWorkflowStage("all"); setConcordFilter("all"); }} active={dailyFilter === "contacted_today"} />
            <Metric label="Follow-Ups Completed Today" value={String(todaySummary.followupsCompleted)} onClick={() => { setDailyFilter("followups_completed_today"); setStage("all"); setWorkflowStage("all"); setConcordFilter("all"); }} active={dailyFilter === "followups_completed_today"} />
            <Metric label="Replies Today" value={String(todaySummary.replies)} onClick={() => { setDailyFilter("replies_today"); setStage("all"); setWorkflowStage("all"); setConcordFilter("all"); }} active={dailyFilter === "replies_today"} />
            <Metric label="Bookings Today" value={String(todaySummary.bookings)} onClick={() => { setDailyFilter("bookings_today"); setStage("all"); setWorkflowStage("all"); setConcordFilter("all"); }} active={dailyFilter === "bookings_today"} />
          </div>
        </section>

        <section className="surface border-l-4 border-l-gold p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Concord Outreach</div>
              <h2 className="mt-1 font-display text-lg font-semibold">Professional prospect workflow</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Send 5 personalized emails, send 5 texts when mobile numbers are available, complete contact forms when no email exists, record every action, then schedule follow-up three business days later.
              </p>
            </div>
            <Select value={concordFilter} onValueChange={(value: any) => setConcordFilter(value)}>
              <SelectTrigger className="w-full lg:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Concord leads</SelectItem>
                {CONCORD_FILTERS.map((filter) => <SelectItem key={filter} value={filter}>{filter}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-9">
            <Metric label="Total Concord" value={String(concordSummary.total)} onClick={() => { setConcordFilter("all"); setDailyFilter("all"); }} active={concordFilter === "all" && dailyFilter === "all"} />
            <Metric label="Emails ready" value={String(concordSummary.emailsReady)} onClick={() => { setConcordFilter("Ready to Send"); setDailyFilter("all"); }} active={concordFilter === "Ready to Send"} />
            <Metric label="Waiting Follow-Up" value={String(concordSummary.waitingFollowUp)} onClick={() => { setConcordFilter("Waiting Follow-Up"); setDailyFilter("all"); }} active={concordFilter === "Waiting Follow-Up"} />
            <Metric label="Emails sent" value={String(concordSummary.emailsSent)} onClick={() => { setConcordFilter("Email Sent"); setDailyFilter("all"); }} active={concordFilter === "Email Sent"} />
            <Metric label="Texts sent" value={String(concordSummary.textsSent)} onClick={() => { setConcordFilter("Text Sent"); setDailyFilter("all"); }} active={concordFilter === "Text Sent"} />
            <Metric label="Follow-ups due" value={String(concordSummary.followUpsDue)} onClick={() => { setConcordFilter("Follow-Up Due"); setDailyFilter("all"); }} active={concordFilter === "Follow-Up Due"} />
            <Metric label="Responses" value={String(concordSummary.responses)} onClick={() => { setConcordFilter("Replied"); setDailyFilter("all"); }} active={concordFilter === "Replied"} />
            <Metric label="Bookings" value={String(concordSummary.bookings)} onClick={() => { setConcordFilter("Booked"); setDailyFilter("all"); }} active={concordFilter === "Booked"} />
            <Metric label="Pipeline value" value={money(concordSummary.value)} onClick={() => { setConcordFilter("all"); setDailyFilter("all"); }} />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Prospect Workflow</div>
            <p className="mt-1 text-sm text-muted-foreground">Outreach path from new lead to follow-up, booking, completion, review request, or closeout.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
          {workflowSummary.map(({ workflow, count }) => (
            <button
              key={workflow}
              onClick={() => { setWorkflowStage(workflow); setStage("all"); setDailyFilter("all"); setConcordFilter("all"); }}
              className={`surface min-h-20 p-3 text-left transition-colors hover:border-gold/50 ${workflowStage === workflow ? "border-gold" : ""}`}
            >
              <div className="text-xl font-semibold tabular-nums">{count}</div>
              <div className="mt-1 text-xs text-muted-foreground">{workflow}</div>
            </button>
          ))}
          </div>
        </section>

        <div className="grid gap-2 lg:grid-cols-[1fr_190px_210px_210px_260px]">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search CRM ID, name, vehicle, phone, email..." className="pl-8" />
          </div>
          <Select value={workflowStage} onValueChange={(value: any) => { setWorkflowStage(value); setDailyFilter("all"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workflow stages</SelectItem>
              {CRM_WORKFLOW_STAGES.map((workflow) => <SelectItem key={workflow} value={workflow}>{workflow}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={stage} onValueChange={(value: any) => setStage(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              <SelectItem value="overdue">Overdue follow-ups</SelectItem>
              {LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={leadType} onValueChange={(value: any) => setLeadType(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lead types</SelectItem>
              {LEAD_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={businessUnit} onValueChange={(value) => setBusinessUnit(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All business units</SelectItem>
              {BUSINESS_UNITS.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading...</div> : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No matching leads"
            description="Add a lead or change the current pipeline filters."
            action={<Button size="sm" onClick={() => { setEditing(emptyLead); setActivities([]); setEmailHistory([]); setEmailComposer(buildEmailComposer()); setEditOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />Add Lead</Button>}
          />
        ) : (
          <div className="surface min-w-0 overflow-x-auto">
            <table className="min-w-[44rem] w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Lead</th>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="hidden px-3 py-2 text-left xl:table-cell">Workflow</th>
                  <th className="hidden px-3 py-2 text-left lg:table-cell">Business Unit</th>
                  <th className="hidden px-3 py-2 text-left md:table-cell">Source</th>
                  <th className="hidden px-3 py-2 text-right md:table-cell">Score</th>
                  <th className="px-3 py-2 text-left">Follow-up</th>
                  <th className="px-3 py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => openLead(lead)}>
                    <td className="px-3 py-2">
                      <div className="font-medium">{lead.crm_id ? `${lead.crm_id} · ` : ""}{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{[lead.vehicle, lead.business, lead.phone, lead.email].filter(Boolean).join(" · ") || lead.service_needed || ""}</div>
                    </td>
                    <td className="px-3 py-2"><StatusPill status={lead.status} /></td>
                    <td className="hidden px-3 py-2 xl:table-cell"><WorkflowPill workflow={getCrmWorkflowStage(lead)} /></td>
                    <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">{businessUnitName(lead.business_unit_id)}</td>
                    <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">{lead.source ?? "-"}</td>
                    <td className="hidden px-3 py-2 text-right tabular-nums md:table-cell">{lead.lead_score ?? 0}</td>
                    <td className={`px-3 py-2 text-xs ${isOverdue(lead) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      {isOverdue(lead) && <AlertCircle className="mr-1 inline h-3 w-3" />}
                      {lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-3 py-2"><ContactActions lead={lead} logContact={openContactWorkflow} openEmailComposer={openEmailComposer} updateConcordAction={updateConcordAction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LeadDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={editing}
        activities={activities}
        setLead={setEditing}
        onSave={save}
        onMarkContacted={() => editing.id && openContactWorkflow(editing as Lead)}
        onConcordAction={updateConcordAction}
        emailHistory={emailHistory}
        emailComposer={emailComposer}
        setEmailComposer={setEmailComposer}
        emailBusy={emailBusy}
        onSaveZohoDraft={handleSaveZohoDraft}
        onSendZohoEmail={handleSendZohoEmail}
        onManualReplySync={handleManualReplySync}
      />
      <MarkContactedDialog
        lead={contactLead}
        draft={contactDraft}
        setDraft={setContactDraft}
        onClose={() => setContactLead(null)}
        onSave={markContacted}
      />
      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        csv={importCsv}
        setCsv={setImportCsv}
        report={importReport}
        onDryRun={runImportDryRun}
        onCommit={commitImport}
        busy={importBusy}
      />
    </div>
  );
}

function buildContactDraft(lead?: Lead): ContactDraft {
  const now = new Date();
  const follow = addBusinessDays(now, 3);
  return {
    contact_method: lead?.phone ? "Call" : lead?.email ? "Email" : "DM",
    contact_date: toLocalInput(now.toISOString()),
    contacted_by: "Huey",
    zoho_email_sent: false,
    next_follow_up_at: toLocalInput(follow.toISOString()),
    detail: "",
  };
}

function buildEmailComposer(lead?: Partial<Lead>): EmailComposer {
  return {
    toAddress: lead?.email ?? "",
    subject: lead?.email_subject ?? `Quick mobile detailing intro${lead?.business ? ` for ${lead.business}` : ""}`,
    body: lead?.email_body ?? [
      `Hi ${lead?.name?.split(" ")[0] ?? "there"},`,
      "",
      "This is Huey with Great Freight Mobile Detailing. I wanted to introduce our mobile detailing service for busy professionals and local businesses.",
      "",
      "We come directly to your office or home, and services start at $100.",
      "",
      "Book or view availability at https://bay-area-102518.square.site.",
      "",
      "Thank you,",
      "Huey Roundtree III",
      "Great Freight Mobile Detailing",
      "(323) 989-4510",
    ].join("\n"),
    confirmDuplicate: false,
  };
}

function ContactActions({
  lead,
  logContact,
  openEmailComposer,
  updateConcordAction,
}: {
  lead: Lead;
  logContact: (lead: Lead) => void;
  openEmailComposer: (lead: Lead) => void;
  updateConcordAction: (lead: Lead, action: "email_sent" | "text_sent" | "follow_up" | "booked") => void;
}) {
  const isConcord = isConcordLead(lead);
  return (
    <div className="flex flex-wrap justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {lead.source_url && <a title="Website/source" href={lead.source_url} target="_blank" rel="noreferrer" className="rounded border p-2 hover:bg-muted"><ExternalLink className="h-4 w-4" /></a>}
      {lead.phone && <a title="Call lead" href={`tel:${lead.phone}`} className="rounded border p-2 hover:bg-muted"><Phone className="h-4 w-4" /></a>}
      {lead.phone && <a title="Text lead" href={smsHref(lead)} className="rounded border p-2 hover:bg-muted"><MessageSquare className="h-4 w-4" /></a>}
      <EmailButton lead={lead} onOpenComposer={openEmailComposer} compact />
      {isConcord && lead.email && <Button size="sm" variant="outline" onClick={() => updateConcordAction(lead, "email_sent")}>Email Sent</Button>}
      {isConcord && lead.phone && <Button size="sm" variant="outline" onClick={() => updateConcordAction(lead, "text_sent")}>Text Sent</Button>}
      <Button size="sm" variant="outline" onClick={() => logContact(lead)}>
        <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />Mark Contacted
      </Button>
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

function WorkflowPill({ workflow }: { workflow: CrmWorkflowStage }) {
  const urgent = workflow === "Follow-Up Due";
  return (
    <span className={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${urgent ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted"}`}>
      {workflow}
    </span>
  );
}

function LeadDialog({
  open,
  onOpenChange,
  lead,
  activities,
  setLead,
  onSave,
  onMarkContacted,
  onConcordAction,
  emailHistory,
  emailComposer,
  setEmailComposer,
  emailBusy,
  onSaveZohoDraft,
  onSendZohoEmail,
  onManualReplySync,
}: any) {
  const current = lead as Partial<Lead>;
  const set = (key: keyof Lead, value: any) => setLead({ ...current, [key]: value });
  const setComposer = (key: keyof EmailComposer, value: any) => setEmailComposer({ ...emailComposer, [key]: value });
  const isConcord = isConcordLead(current as Lead);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{current.id ? "Lead Detail" : "Add Lead"}</DialogTitle>
          <DialogDescription>Command Center CRM is the single product surface. Supabase remains the source of truth.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="CRM ID"><Input value={current.crm_id ?? ""} onChange={(event) => set("crm_id", event.target.value)} placeholder="CRM-####" /></Field>
          <Field label="Name *"><Input value={current.name ?? ""} onChange={(event) => set("name", event.target.value)} /></Field>
          <Field label="Business"><Input value={current.business ?? ""} onChange={(event) => set("business", event.target.value)} /></Field>
          <Field label="Vehicle"><Input value={current.vehicle ?? ""} onChange={(event) => set("vehicle", event.target.value)} placeholder="2016 Lexus IS200T, fleet van..." /></Field>
          <Field label="Phone"><Input value={current.phone ?? ""} onChange={(event) => set("phone", event.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={current.email ?? ""} onChange={(event) => set("email", event.target.value)} /></Field>
          <Field label="Business Unit">
            <Select value={current.business_unit_id ?? DEFAULT_BUSINESS_UNIT_ID} onValueChange={(value) => set("business_unit_id", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BUSINESS_UNITS.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lead type">
            <Select value={current.lead_type ?? "Detailing"} onValueChange={(value) => set("lead_type", value as LeadType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Stage">
            <Select value={current.status ?? "New Lead"} onValueChange={(value) => set("status", value as LeadStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LEAD_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lead Score"><Input type="number" min="0" max="100" value={current.lead_score ?? 0} onChange={(event) => set("lead_score", event.target.value ? Number(event.target.value) : 0)} /></Field>
          <Field label="Source"><Input value={current.source ?? ""} onChange={(event) => set("source", event.target.value)} placeholder="Craigslist, Facebook, Referral..." /></Field>
          <Field label="Source Record ID"><Input value={current.source_record_id ?? ""} onChange={(event) => set("source_record_id", event.target.value)} /></Field>
          <Field label="Source URL"><Input value={current.source_url ?? ""} onChange={(event) => set("source_url", event.target.value)} /></Field>
          <Field label="City"><Input value={current.city ?? ""} onChange={(event) => set("city", event.target.value)} /></Field>
          <Field label="Industry"><Input value={current.industry ?? ""} onChange={(event) => set("industry", event.target.value)} /></Field>
          <Field label="Address / Service Area"><Input value={current.address_service_area ?? ""} onChange={(event) => set("address_service_area", event.target.value)} /></Field>
          <Field label="Priority"><Input value={current.priority ?? ""} onChange={(event) => set("priority", event.target.value)} /></Field>
          <Field label="Verification Source"><Input value={current.verification_source ?? ""} onChange={(event) => set("verification_source", event.target.value)} /></Field>
          <Field label="Next Action"><Input value={current.next_action ?? ""} onChange={(event) => set("next_action", event.target.value)} /></Field>
          <Field label="Outreach Status"><Input value={current.outreach_status ?? ""} onChange={(event) => set("outreach_status", event.target.value)} /></Field>
          <Field label="Service needed"><Input value={current.service_needed ?? ""} onChange={(event) => set("service_needed", event.target.value)} /></Field>
          <Field label="Estimated value"><Input type="number" min="0" step="0.01" value={current.estimated_value ?? ""} onChange={(event) => set("estimated_value", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Quote amount"><Input type="number" min="0" step="0.01" value={current.quote_amount ?? ""} onChange={(event) => set("quote_amount", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Deposit"><Input type="number" min="0" step="0.01" value={current.deposit ?? ""} onChange={(event) => set("deposit", event.target.value ? Number(event.target.value) : null)} /></Field>
          <Field label="Deposit Status"><Input value={current.deposit_status ?? ""} onChange={(event) => set("deposit_status", event.target.value)} /></Field>
          <Field label="Appointment Status"><Input value={current.appointment_status ?? ""} onChange={(event) => set("appointment_status", event.target.value)} /></Field>
          <Field label="Booking date/time"><Input type="datetime-local" value={toLocalInput(current.booking_at)} onChange={(event) => set("booking_at", fromLocalInput(event.target.value))} /></Field>
          <Field label="Last Contact"><Input type="datetime-local" value={toLocalInput(current.last_contact_at)} onChange={(event) => set("last_contact_at", fromLocalInput(event.target.value))} /></Field>
          <Field label="Next Follow-up"><Input type="datetime-local" value={toLocalInput(current.next_follow_up_at)} onChange={(event) => set("next_follow_up_at", fromLocalInput(event.target.value))} /></Field>
          <Field label="Contact Method"><Input value={current.contact_method ?? ""} onChange={(event) => set("contact_method", event.target.value)} /></Field>
          <Field label="Contact Date"><Input type="datetime-local" value={toLocalInput(current.contact_date)} onChange={(event) => set("contact_date", fromLocalInput(event.target.value))} /></Field>
          <Field label="Contacted By"><Input value={current.contacted_by ?? ""} onChange={(event) => set("contacted_by", event.target.value)} /></Field>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <Checkbox checked={Boolean(current.zoho_email_sent)} onCheckedChange={(value) => set("zoho_email_sent", Boolean(value))} />
            Zoho Email Sent manually confirmed
          </label>
        </div>
        {isConcord && (
          <section className="rounded-md border border-gold/30 bg-gold/5 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Concord personalized outreach</div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email Subject"><Input value={current.email_subject ?? ""} onChange={(event) => set("email_subject", event.target.value)} /></Field>
              <Field label="Text Message Template"><Textarea rows={3} value={current.text_message_template ?? ""} onChange={(event) => set("text_message_template", event.target.value)} /></Field>
            </div>
            <Field label="Personalized Email Body"><Textarea rows={8} value={current.email_body ?? ""} onChange={(event) => set("email_body", event.target.value)} /></Field>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copyText("Email subject", current.email_subject)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy subject</Button>
              <Button size="sm" variant="outline" onClick={() => copyText("Email body", current.email_body)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy email</Button>
              <DefaultEmailAppButton lead={current as Lead} />
              {current.phone && <Button asChild size="sm" variant="outline"><a href={smsHref(current as Lead)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Open text</a></Button>}
              {current.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${current.phone}`}><Phone className="mr-1.5 h-3.5 w-3.5" />Call</a></Button>}
              {current.source_url && <Button asChild size="sm" variant="outline"><a href={current.source_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Website</a></Button>}
              {current.id && current.email && <Button size="sm" variant="outline" onClick={() => onConcordAction(current as Lead, "email_sent")}>Mark email sent</Button>}
              {current.id && current.phone && <Button size="sm" variant="outline" onClick={() => onConcordAction(current as Lead, "text_sent")}>Mark text sent</Button>}
              {current.id && <Button size="sm" variant="outline" onClick={() => onConcordAction(current as Lead, "follow_up")}>Follow-up</Button>}
              {current.id && <Button size="sm" onClick={() => onConcordAction(current as Lead, "booked")}>Booked</Button>}
            </div>
          </section>
        )}
        {current.id && (
          <section className="rounded-md border border-forest/20 bg-forest/5 p-3">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zoho Mail composer</div>
                <p className="text-xs text-muted-foreground">Manual review required. Nothing sends until Huey presses Send Email.</p>
              </div>
              <span className="rounded-sm border bg-background px-2 py-1 text-[11px]">From: {ZOHO_PRIMARY_SENDER}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Recipient"><Input type="email" value={emailComposer.toAddress} onChange={(event) => setComposer("toAddress", event.target.value)} /></Field>
              <Field label="Subject"><Input value={emailComposer.subject} onChange={(event) => setComposer("subject", event.target.value)} /></Field>
              <Field label="Last sent date"><Input value={current.zoho_last_sent_at ? new Date(current.zoho_last_sent_at).toLocaleString() : "Never"} disabled /></Field>
              <Field label="Last reply date"><Input value={current.zoho_last_reply_at ? new Date(current.zoho_last_reply_at).toLocaleString() : "None"} disabled /></Field>
              <Field label="Next follow-up"><Input value={current.next_follow_up_at ? new Date(current.next_follow_up_at).toLocaleString() : "Not scheduled"} disabled /></Field>
              <Field label="Zoho message ID"><Input value={current.zoho_last_message_id ?? ""} disabled /></Field>
            </div>
            <Field label="Editable personalized email"><Textarea rows={8} value={emailComposer.body} onChange={(event) => setComposer("body", event.target.value)} /></Field>
            {emailComposer.confirmDuplicate && (
              <label className="mt-2 flex items-center gap-2 text-sm text-amber-700">
                <Checkbox checked={emailComposer.confirmDuplicate} onCheckedChange={(value) => setComposer("confirmDuplicate", Boolean(value))} />
                Duplicate warning acknowledged. Press Send Email again only if this repeat send is intentional.
              </label>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onSaveZohoDraft(current as Lead, emailComposer)} disabled={emailBusy}>
                Save Draft
              </Button>
              <Button size="sm" onClick={() => onSendZohoEmail(current as Lead, emailComposer)} disabled={emailBusy || !emailComposer.toAddress}>
                <Send className="mr-1.5 h-3.5 w-3.5" />Send Email
              </Button>
              <Button size="sm" variant="outline" onClick={() => copyText("Email body", emailComposer.body)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />Copy Email
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href="https://mail.zoho.com" target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Open in Zoho</a>
              </Button>
              <DefaultEmailAppButton lead={current as Lead} variant="ghost" />
              <Button size="sm" variant="outline" onClick={() => onManualReplySync(current as Lead)} disabled={emailBusy}>
                Manual reply sync
              </Button>
            </div>
            <div className="mt-4 rounded-md border bg-background p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email history</div>
              {emailHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No Zoho email history logged for this lead yet.</p>
              ) : (
                <div className="space-y-2">
                  {emailHistory.map((email: EmailMessage) => (
                    <div key={email.id} className="rounded border p-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm font-medium">{email.subject}</div>
                        <div className="text-[11px] text-muted-foreground">{email.sent_at ? new Date(email.sent_at).toLocaleString() : new Date(email.created_at).toLocaleString()}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {email.direction} · {email.status} · {email.from_address} → {email.to_address}
                      </div>
                      {email.follow_up_at && <div className="mt-1 text-xs">Follow-up: {new Date(email.follow_up_at).toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
        <Field label="Notes"><Textarea rows={4} value={current.notes ?? ""} onChange={(event) => set("notes", event.target.value)} /></Field>
        {current.id && (
          <section className="rounded-md border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity timeline</div>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity found yet.</p>
            ) : (
              <div className="space-y-2">
                {activities.map((activity: Activity) => (
                  <div key={`${activity.activity_source}-${activity.id}`} className="rounded border bg-background p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium">{activity.title}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(activity.occurred_at).toLocaleString()}</div>
                    </div>
                    {activity.detail && <div className="mt-1 text-xs text-muted-foreground">{activity.detail}</div>}
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{activity.activity_source}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        <DialogFooter>
          {current.id && <Button variant="outline" onClick={onMarkContacted}><CalendarCheck className="mr-1.5 h-4 w-4" />Mark Contacted</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarkContactedDialog({ lead, draft, setDraft, onClose, onSave }: {
  lead: Lead | null;
  draft: ContactDraft;
  setDraft: (draft: ContactDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (key: keyof ContactDraft, value: any) => setDraft({ ...draft, [key]: value });
  return (
    <Dialog open={Boolean(lead)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mark Contacted</DialogTitle>
          <DialogDescription>{lead ? `Log a manual contact for ${lead.crm_id ? `${lead.crm_id} · ` : ""}${lead.name}.` : ""}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Contact Method">
            <Select value={draft.contact_method} onValueChange={(value) => set("contact_method", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Call", "Text", "Email", "Contact Form", "Facebook DM", "Craigslist Reply", "Social DM", "In Person"].map((method) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Contact Date"><Input type="datetime-local" value={draft.contact_date} onChange={(event) => set("contact_date", event.target.value)} /></Field>
          <Field label="Contacted By"><Input value={draft.contacted_by} onChange={(event) => set("contacted_by", event.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={draft.zoho_email_sent} onCheckedChange={(value) => set("zoho_email_sent", Boolean(value))} />
            Zoho Email Sent manual confirmation
          </label>
          <Field label="Next Follow-up"><Input type="datetime-local" value={draft.next_follow_up_at} onChange={(event) => set("next_follow_up_at", event.target.value)} /></Field>
          <Field label="Activity Detail"><Textarea rows={3} value={draft.detail} onChange={(event) => set("detail", event.target.value)} placeholder="Left voicemail, sent quote draft manually, seller asked for price..." /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave}><Send className="mr-1.5 h-4 w-4" />Save Contact</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkImportDialog({ open, onOpenChange, csv, setCsv, report, onDryRun, onCommit, busy }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csv: string;
  setCsv: (value: string) => void;
  report: ImportDryRunReport | null;
  onDryRun: () => void;
  onCommit: () => void;
  busy: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Leads</DialogTitle>
          <DialogDescription>Preview and validate first. Import commits only reviewed, non-duplicate rows and never sends outreach.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={10}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder="crm_id,name,business,vehicle,phone,email,source,source_record_id,source_url,notes"
        />
        {report && (
          <section className="rounded-md border p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Rows" value={String(report.totalRows)} />
              <Metric label="Ready" value={String(report.readyRows)} />
              <Metric label="Duplicates" value={String(report.duplicateRows.length)} />
            </div>
            {report.issues.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Issues</div>
                {report.issues.map((issue, index) => (
                  <div key={index} className={`text-sm ${issue.severity === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                    Row {issue.row}: {issue.message}
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Duplicate rows will be skipped. Merge verified details into the existing record instead of overwriting it here.
            </p>
          </section>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          <Button variant="outline" onClick={onDryRun} disabled={busy}>Run Dry-Run Report</Button>
          <Button onClick={onCommit} disabled={busy || !report?.readyRows}>{busy ? "Importing..." : "Import Reviewed Rows"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Metric({ label, value, onClick, active = false }: { label: string; value: string; onClick?: () => void; active?: boolean }) {
  const className = `stat-card text-left ${onClick ? "transition-colors hover:border-gold/50" : ""} ${active ? "border-gold" : ""}`;
  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </button>
    );
  }
  return <div className={className}><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>;
}
