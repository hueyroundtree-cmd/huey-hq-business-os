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
import { toast } from "sonner";
import { BookOpen, Plus, Upload } from "lucide-react";

const CATS = ["Finance","Career","Health","Family","AI System","Notion System","Tools Stack","Brand Guide","SOPs","Decisions","Sales Scripts","Daily Driver","Legal Compliance","System Status","AI Commands","Skills","Plugins","Content Creator OS"];

type Doc = { id: string; category: string; title: string; content_md: string; updated_at: string };

export default function Knowledge() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Doc>>({ title: "", category: "SOPs", content_md: "" });

  const load = async () => {
    const { data } = await supabase.from("knowledge_docs").select("*").order("updated_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => docs.filter(d =>
    (cat === "all" || d.category === cat) &&
    (!q || `${d.title} ${d.content_md}`.toLowerCase().includes(q.toLowerCase()))
  ), [docs, q, cat]);

  const save = async () => {
    if (!editing.title) return toast.error("Title required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const payload = { user_id: uid, category: editing.category ?? "SOPs", title: editing.title, content_md: editing.content_md ?? "" };
    const res = editing.id ? await supabase.from("knowledge_docs").update(payload).eq("id", editing.id) : await supabase.from("knowledge_docs").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved"); setOpen(false); setEditing({ title: "", category: "SOPs", content_md: "" }); load();
  };

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const rows: any[] = [];
    for (const f of Array.from(files)) {
      const text = await f.text();
      const guess = CATS.find(c => f.name.toLowerCase().includes(c.toLowerCase().split(" ")[0])) ?? "SOPs";
      rows.push({ user_id: uid, category: guess, title: f.name.replace(/\.(md|markdown|txt)$/i, ""), content_md: text });
    }
    const { error } = await supabase.from("knowledge_docs").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Imported ${rows.length} file${rows.length > 1 ? "s" : ""}`);
    load();
  };

  return (
    <div>
      <PageHeader title="Knowledge Vault" description="Categorized personal knowledge base. Import your Markdown files."
        actions={
          <>
            <label className="inline-flex items-center gap-1.5 text-sm rounded-md border px-3 py-1.5 cursor-pointer hover:bg-muted">
              <Upload className="h-4 w-4" /> Import .md
              <input type="file" accept=".md,.markdown,.txt" multiple hidden onChange={(e) => importFiles(e.target.files)} />
            </label>
            <Button size="sm" onClick={() => { setEditing({ title: "", category: "SOPs", content_md: "" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />New doc</Button>
          </>
        } />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search titles and content…" className="flex-1" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All categories</SelectItem>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? <EmptyState icon={BookOpen} title="Knowledge Vault is empty" description="Import your Markdown files or create a doc. Contents aren't invented — you fill this." action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New doc</Button>} />
          : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map(d => (
                <button key={d.id} onClick={() => { setEditing(d); setOpen(true); }} className="surface p-4 text-left hover:border-foreground/30 transition-colors">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.category}</div>
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{d.content_md}</div>
                </button>
              ))}
            </div>
          )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing.id ? "Edit doc" : "New doc"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label className="text-xs">Category</Label>
                <Select value={editing.category ?? "SOPs"} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Markdown content</Label><Textarea rows={14} className="font-mono text-xs" value={editing.content_md ?? ""} onChange={(e) => setEditing({ ...editing, content_md: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
