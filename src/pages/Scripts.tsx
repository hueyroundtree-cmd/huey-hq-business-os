import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { ScrollText, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Script = { id: string; user_id: string | null; is_template: boolean; category: string; title: string; body: string; placeholders: string[] };

export default function Scripts() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [current, setCurrent] = useState<Script | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Script>>({ title: "", body: "", category: "Custom", placeholders: [] });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("scripts").select("*").order("is_template", { ascending: false }).order("category");
    setScripts((data as Script[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => Array.from(new Set(scripts.map(s => s.category))).sort(), [scripts]);
  const filtered = useMemo(() => scripts.filter(s =>
    (cat === "all" || s.category === cat) &&
    (!q || `${s.title} ${s.body}`.toLowerCase().includes(q.toLowerCase()))
  ), [scripts, q, cat]);

  const openPreview = (s: Script) => {
    setCurrent(s);
    const v: Record<string, string> = {};
    (s.placeholders ?? []).forEach(p => (v[p] = ""));
    setVals(v);
    setPreviewOpen(true);
  };

  const rendered = useMemo(() => {
    if (!current) return "";
    let out = current.body;
    Object.entries(vals).forEach(([k, v]) => { out = out.replaceAll(`{{${k}}}`, v || `{{${k}}}`); });
    return out;
  }, [current, vals]);

  const copy = async () => {
    await navigator.clipboard.writeText(rendered);
    toast.success("Copied. Sending is not the same as copying — send it yourself.");
  };

  const copyToLibrary = async (s: Script) => {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const { error } = await supabase.from("scripts").insert({
      user_id: uid, is_template: false, category: s.category,
      title: `${s.title} (my copy)`, body: s.body, placeholders: s.placeholders,
    });
    if (error) return toast.error(error.message);
    toast.success("Copied to your library");
    load();
  };

  const saveEdit = async () => {
    if (!editing.title || !editing.body) return toast.error("Title and body required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const placeholders = Array.from(editing.body.matchAll(/\{\{([\w_]+)\}\}/g)).map(m => m[1]);
    const payload = { user_id: uid, is_template: false, category: editing.category || "Custom", title: editing.title, body: editing.body, placeholders };
    const res = editing.id
      ? await supabase.from("scripts").update(payload).eq("id", editing.id)
      : await supabase.from("scripts").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditOpen(false);
    setEditing({ title: "", body: "", category: "Custom", placeholders: [] });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this script?")) return;
    await supabase.from("scripts").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Script Library"
        description="Great Freight Detailing templates + your own copies."
        actions={<Button size="sm" onClick={() => { setEditing({ title: "", body: "", category: "Custom", placeholders: [] }); setEditOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />New Script</Button>}
      />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search scripts…" className="flex-1" />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : filtered.length === 0 ? <EmptyState icon={ScrollText} title="No scripts match" />
          : (
            <div className="grid md:grid-cols-2 gap-3">
              {filtered.map(s => (
                <div key={s.id} className="surface p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.category}</div>
                      <div className="font-medium truncate">{s.title}</div>
                    </div>
                    {s.is_template
                      ? <span className="text-[10px] rounded-sm bg-gold/20 text-gold-foreground/80 border border-gold/30 px-1.5 py-0.5 font-medium">TEMPLATE</span>
                      : <span className="text-[10px] rounded-sm bg-muted text-muted-foreground px-1.5 py-0.5 font-medium">MY COPY</span>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{s.body}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Button size="sm" variant="outline" onClick={() => openPreview(s)}><Copy className="h-3.5 w-3.5 mr-1" />Fill & copy</Button>
                    {s.is_template ? (
                      <Button size="sm" variant="ghost" onClick={() => copyToLibrary(s)}>Save to my library</Button>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setEditOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{current?.title}</DialogTitle></DialogHeader>
          {current && current.placeholders.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {current.placeholders.map(p => (
                <div key={p}>
                  <Label className="text-xs">{p.replaceAll("_", " ")}</Label>
                  <Input value={vals[p] ?? ""} onChange={(e) => setVals({ ...vals, [p]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <Textarea value={rendered} readOnly rows={8} className="font-mono text-xs" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={copy}><Copy className="h-4 w-4 mr-1.5" />Copy text</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? "Edit script" : "New script"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label className="text-xs">Category</Label><Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Body</Label>
              <Textarea rows={6} value={editing.body ?? ""} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="Use {{placeholders}} for variables." />
              <p className="text-[11px] text-muted-foreground mt-1">Placeholders like <code className="font-mono">{"{{customer_name}}"}</code> are detected automatically.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
