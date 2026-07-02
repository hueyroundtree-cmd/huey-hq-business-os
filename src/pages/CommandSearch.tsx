import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Search,
  ScrollText,
  User,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Result = {
  id: string;
  type: string;
  title: string;
  detail: string;
  to: string;
  icon: typeof Search;
};

const cleanTerm = (value: string) => value.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ");
const snippet = (value?: string | null, max = 150) => {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

export default function CommandSearch() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const run = async (event?: FormEvent) => {
    event?.preventDefault();
    const term = cleanTerm(query);
    if (term.length < 2) return;
    setLoading(true);
    setSearched(true);
    setParams({ q: term }, { replace: true });
    const match = `%${term}%`;

    const [leads, content, scripts, knowledge, projects, jobs] = await Promise.all([
      supabase.from("leads").select("id,name,business,phone,email,source,service_needed,status").or(`name.ilike.${match},business.ilike.${match},phone.ilike.${match},email.ilike.${match},service_needed.ilike.${match}`).limit(20),
      supabase.from("content_items").select("id,title,hook,notes,stage").or(`title.ilike.${match},hook.ilike.${match},notes.ilike.${match}`).limit(20),
      supabase.from("scripts").select("id,title,category,body").or(`title.ilike.${match},category.ilike.${match},body.ilike.${match}`).limit(20),
      supabase.from("knowledge_docs").select("id,title,category,content_md").or(`title.ilike.${match},category.ilike.${match},content_md.ilike.${match}`).limit(20),
      supabase.from("business_projects").select("id,title,business,status,next_action,notes").or(`title.ilike.${match},business.ilike.${match},next_action.ilike.${match},notes.ilike.${match}`).limit(20),
      supabase.from("jobs").select("id,title,status,notes,scheduled_at").or(`title.ilike.${match},status.ilike.${match},notes.ilike.${match}`).limit(20),
    ]);

    setErrors([leads, content, scripts, knowledge, projects, jobs].flatMap((response) => response.error ? [response.error.message] : []));
    setResults([
      ...(leads.data ?? []).map((row) => ({
        id: row.id, type: "CRM", title: row.name,
        detail: snippet([row.business, row.service_needed, row.phone, row.email, row.status].filter(Boolean).join(" · ")),
        to: "/crm", icon: User,
      })),
      ...(jobs.data ?? []).map((row) => ({
        id: row.id, type: "Job", title: row.title,
        detail: snippet([row.status, row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : null, row.notes].filter(Boolean).join(" · ")),
        to: "/", icon: Wrench,
      })),
      ...(content.data ?? []).map((row) => ({
        id: row.id, type: "Content", title: row.title,
        detail: snippet([row.stage, row.hook, row.notes].filter(Boolean).join(" · ")),
        to: "/content", icon: FileText,
      })),
      ...(scripts.data ?? []).map((row) => ({
        id: row.id, type: "Script", title: row.title,
        detail: snippet(`${row.category} · ${row.body}`),
        to: "/scripts", icon: ScrollText,
      })),
      ...(knowledge.data ?? []).map((row) => ({
        id: row.id, type: "Knowledge", title: row.title,
        detail: snippet(`${row.category} · ${row.content_md}`),
        to: "/knowledge", icon: BookOpen,
      })),
      ...(projects.data ?? []).map((row) => ({
        id: row.id, type: "Project", title: row.title,
        detail: snippet([row.business, row.status, row.next_action, row.notes].filter(Boolean).join(" · ")),
        to: "/roadmap", icon: BriefcaseBusiness,
      })),
    ]);
    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        title="Command Search"
        description="Find customers, phone numbers, jobs, content, scripts, projects and knowledge from one place."
      />
      <div className="p-4 md:p-6 space-y-4">
        <form onSubmit={run} className="surface p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a name, vehicle, phone, video, SOP, prompt…"
              />
            </div>
            <Button type="submit" disabled={loading || cleanTerm(query).length < 2}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
        </form>

        {errors.length > 0 && (
          <section className="surface border-gold/40 p-4 text-sm">
            Some sources could not be searched: {Array.from(new Set(errors)).join(" · ")}
          </section>
        )}

        {searched && !loading && results.length === 0 && (
          <section className="surface p-6 text-center text-sm text-muted-foreground">
            No verified Command Center records matched “{params.get("q")}”.
          </section>
        )}

        {results.length > 0 && (
          <section className="surface overflow-hidden">
            <div className="border-b px-4 py-3 text-sm font-semibold">{results.length} results</div>
            <div className="divide-y">
              {results.map((result) => (
                <Link key={`${result.type}-${result.id}`} to={result.to} className="flex gap-3 p-4 hover:bg-muted/40">
                  <result.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{result.title}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px]">{result.type}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{result.detail || "No additional detail"}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
