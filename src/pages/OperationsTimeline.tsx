import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, CalendarClock, CircleDollarSign, FileVideo, Star, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { ConnectionBadge } from "@/components/ConnectionBadge";

type EventRow = {
  id: string;
  event_type: string;
  entity_type: string;
  title: string;
  detail: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

const eventIcon = (type: string) => {
  const value = type.toLowerCase();
  if (value.includes("lead")) return UserPlus;
  if (value.includes("payment") || value.includes("revenue")) return CircleDollarSign;
  if (value.includes("video") || value.includes("content")) return FileVideo;
  if (value.includes("review")) return Star;
  if (value.includes("ai")) return Bot;
  return Activity;
};

export default function OperationsTimeline() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await supabase.from("operations_events")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (result.error) setError(result.error.message);
      setEvents((result.data as EventRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    return events.reduce<Record<string, EventRow[]>>((acc, event) => {
      const day = new Date(event.occurred_at).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      (acc[day] ??= []).push(event);
      return acc;
    }, {});
  }, [events]);

  return (
    <div>
      <PageHeader
        title="Operations Timeline"
        description="A verified history of important activity across Command Center."
      />
      <div className="p-4 md:p-6 space-y-4">
        <section className="surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-gold" />
              <div>
                <div className="font-medium">Event Engine</div>
                <div className="text-sm text-muted-foreground">Events appear only after the database migration is connected.</div>
              </div>
            </div>
            <ConnectionBadge status={error ? "Needs Setup" : "Verified Live"} />
          </div>
        </section>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading timeline…</div>
        ) : error ? (
          <section className="surface border-gold/40 p-4">
            <div className="font-medium">Event Engine setup required</div>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </section>
        ) : events.length === 0 ? (
          <section className="surface p-6 text-center">
            <Activity className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No verified events have been recorded yet.</p>
          </section>
        ) : (
          Object.entries(grouped).map(([day, rows]) => (
            <section key={day} className="surface overflow-hidden">
              <div className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">{day}</div>
              <div className="divide-y">
                {rows.map((event) => {
                  const Icon = eventIcon(event.event_type);
                  return (
                    <div key={event.id} className="grid grid-cols-[70px_24px_1fr] gap-3 p-4">
                      <time className="text-xs tabular-nums text-muted-foreground">
                        {new Date(event.occurred_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </time>
                      <Icon className="h-4 w-4 text-gold" />
                      <div>
                        <div className="text-sm font-medium">{event.title}</div>
                        {event.detail && <div className="mt-0.5 text-xs text-muted-foreground">{event.detail}</div>}
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{event.source}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
