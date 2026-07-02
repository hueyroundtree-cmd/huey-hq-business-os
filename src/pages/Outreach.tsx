import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Building2,
  CalendarClock,
  Car,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Lead = {
  id: string;
  name: string;
  business: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  service_needed: string | null;
  status: string;
  quote_amount: number | null;
  deposit: number | null;
  booking_at: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  notes: string | null;
};

type Activity = {
  id: string;
  lead_id: string;
  kind: string;
  detail: string | null;
  created_at: string;
};

const sourceGroup = (source?: string | null) => {
  const value = (source ?? "").toLowerCase();
  if (value.includes("craigslist")) return "Craigslist";
  if (value.includes("facebook") || value.includes("marketplace")) return "Facebook";
  if (value.includes("fleet") || value.includes("dealer") || value.includes("business")) return "Fleet";
  if (value.includes("call") || value.includes("phone")) return "Cold Calls";
  return "Other";
};

export default function Outreach() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [leadResult, activityResult] = await Promise.all([
      supabase.from("leads").select("*").order("updated_at", { ascending: false }),
      supabase.from("lead_activities").select("*").gte("created_at", `${today}T00:00:00Z`).order("created_at", { ascending: false }),
    ]);
    if (leadResult.error || activityResult.error) {
      toast.error(leadResult.error?.message ?? activityResult.error?.message ?? "Outreach data could not load");
    }
    setLeads((leadResult.data as Lead[]) ?? []);
    setActivities((activityResult.data as Activity[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.business, lead.phone, lead.email, lead.source, lead.service_needed]
        .some((value) => value?.toLowerCase().includes(term))
    );
  }, [leads, query]);

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const dueToday = leads.filter((lead) => {
    if (!lead.next_follow_up_at) return false;
    const date = new Date(lead.next_follow_up_at);
    return date >= now && date <= todayEnd;
  });
  const overdue = leads.filter((lead) =>
    lead.next_follow_up_at &&
    new Date(lead.next_follow_up_at) < now &&
    !["Lost", "Completed"].includes(lead.status)
  );
  const waitingQuote = leads.filter((lead) => lead.status === "Contacted" && !lead.quote_amount);
  const waitingDeposit = leads.filter((lead) => lead.status === "Quote Sent" && !lead.deposit);
  const waitingReview = leads.filter((lead) => lead.status === "Completed");

  const touchesForSource = (group: string) => {
    const ids = new Set(leads.filter((lead) => sourceGroup(lead.source) === group).map((lead) => lead.id));
    return activities.filter((activity) => ids.has(activity.lead_id)).length;
  };
  const callTouches = activities.filter((activity) => {
    const kind = activity.kind.toLowerCase();
    return kind.includes("call") || kind.includes("voicemail");
  }).length;

  const channelCards = [
    { label: "Craigslist", icon: Car, leads: leads.filter((lead) => sourceGroup(lead.source) === "Craigslist").length, touches: touchesForSource("Craigslist") },
    { label: "Facebook", icon: MessageSquare, leads: leads.filter((lead) => sourceGroup(lead.source) === "Facebook").length, touches: touchesForSource("Facebook") },
    { label: "Cold Calls", icon: Phone, leads: leads.filter((lead) => sourceGroup(lead.source) === "Cold Calls").length, touches: callTouches },
    { label: "Fleet", icon: Building2, leads: leads.filter((lead) => sourceGroup(lead.source) === "Fleet").length, touches: touchesForSource("Fleet") },
  ];

  const recommendation =
    overdue.length > 0
      ? `Work ${overdue.length} overdue follow-up${overdue.length === 1 ? "" : "s"} before starting new outreach.`
      : waitingDeposit.length > 0
        ? `Ask ${waitingDeposit.length} quoted lead${waitingDeposit.length === 1 ? "" : "s"} for the $20 booking deposit.`
        : waitingQuote.length > 0
          ? `Move ${waitingQuote.length} contacted lead${waitingQuote.length === 1 ? "" : "s"} toward a vehicle-photo quote.`
          : "Add the next qualified detailing lead and personalize the first message.";

  const logActivity = async (lead: Lead, kind: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sign in again to log outreach");
    const createdAt = new Date().toISOString();
    const [activity, update] = await Promise.all([
      supabase.from("lead_activities").insert({
        user_id: auth.user.id,
        lead_id: lead.id,
        kind,
        detail: `${kind} logged from Outreach Command`,
      }),
      supabase.from("leads").update({
        status: lead.status === "New Lead" ? "Contacted" : lead.status,
        last_contact_at: createdAt,
      }).eq("id", lead.id),
    ]);
    if (activity.error || update.error) return toast.error(activity.error?.message ?? update.error?.message ?? "Could not log outreach");
    toast.success(`${kind} logged for ${lead.name}`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Outreach Command"
        description="Every detailing contact flows into one CRM and one communication history."
        actions={
          <Button asChild size="sm">
            <Link to="/crm?new=1"><Plus className="mr-1.5 h-4 w-4" />Add Lead</Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-5">
        <section className="surface border-l-4 border-l-gold p-4">
          <div className="flex items-start gap-3">
            <Bot className="mt-0.5 h-5 w-5 text-gold" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Sales Assistant</div>
              <div className="mt-1 font-medium">{recommendation}</div>
              <div className="mt-1 text-sm text-muted-foreground">Recommendation is calculated from current CRM status and follow-up dates.</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {channelCards.map((channel) => (
            <section key={channel.label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="stat-label">{channel.label}</span>
                <channel.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="stat-value">{channel.leads}</div>
              <div className="text-[11px] text-muted-foreground">{channel.touches} touches logged today</div>
            </section>
          ))}
        </div>

        <section>
          <h2 className="mb-3 font-display text-sm font-semibold">Follow-Up Center</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <FollowMetric label="Due Today" value={dueToday.length} />
            <FollowMetric label="Overdue" value={overdue.length} alert />
            <FollowMetric label="Waiting on Quote" value={waitingQuote.length} />
            <FollowMetric label="Waiting on Deposit" value={waitingDeposit.length} />
            <FollowMetric label="Waiting on Review" value={waitingReview.length} />
          </div>
        </section>

        <section className="surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display font-semibold">Outreach Queue</h2>
              <p className="text-sm text-muted-foreground">Log the action here; send calls, texts and emails manually.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads…" />
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading outreach…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="mx-auto h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No matching leads. Add a qualified prospect to begin.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((lead) => (
                <div key={lead.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{lead.name}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px]">{sourceGroup(lead.source)}</span>
                      <span className="text-xs text-muted-foreground">{lead.status}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {[lead.business, lead.service_needed, lead.phone, lead.email].filter(Boolean).join(" · ") || "Contact details incomplete"}
                    </div>
                    {lead.next_follow_up_at && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Follow up {new Date(lead.next_follow_up_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {lead.phone && <Button asChild size="sm" variant="outline"><a href={`tel:${lead.phone}`}><Phone className="mr-1.5 h-3.5 w-3.5" />Call</a></Button>}
                    {lead.phone && <Button asChild size="sm" variant="outline"><a href={`sms:${lead.phone}`}><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Text</a></Button>}
                    {lead.email && <Button asChild size="sm" variant="outline"><a href={`mailto:${lead.email}`}><Mail className="mr-1.5 h-3.5 w-3.5" />Email</a></Button>}
                    <Button size="sm" variant="outline" onClick={() => logActivity(lead, lead.phone ? "Call" : lead.email ? "Email" : "DM")}>
                      <Send className="mr-1.5 h-3.5 w-3.5" />Log touch
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FollowMetric({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`stat-card ${alert && value > 0 ? "border-destructive/40" : ""}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
