import { useEffect, useState } from "react";
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
import { FileText, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const STAGES = ["Idea","Script","Record","Edit","Review","Scheduled","Posted","Repurpose"] as const;
type Stage = typeof STAGES[number];
type Item = { id: string; title: string; stage: Stage; hook: string | null; script: string | null; posted_url: string | null; scheduled_for: string | null; notes: string | null };

export default function Content() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Item>>({ title: "", stage: "Idea" });
  const [params, setParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("content_items").select("*").order("updated_at", { ascending: false });
    setItems((data as Item[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (params.get("new")) { setEditing({ title: "", stage: "Idea" }); setOpen(true); params.delete("new"); setParams(params, { replace: true }); } }, [params]);

  const save = async () => {
    if (!editing.title) return toast.error("Title required");
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id!;
    const payload: any = { ...editing, user_id: uid };
    if (!payload.scheduled_for) payload.scheduled_for = null;
    const res = editing.id ? await supabase.from("content_items").update(payload).eq("id", editing.id) : await supabase.from("content_items").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setOpen(false); load();
  };

  return (
    <div>
      <PageHeader title="Content Creator OS" description="Move each idea through the pipeline. Analytics stay empty until you enter them or connect a source."
        actions={<Button size="sm" onClick={() => { setEditing({ title: "", stage: "Idea" }); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />New idea</Button>} />
      <div className="p-4 md:p-6">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : items.length === 0 ? <EmptyState icon={FileText} title="No content items yet" description="Capture a hook, write a script, record, edit, post. Everything you make lives here."
            action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New idea</Button>} />
          : (
            <div className="grid md:grid-cols-4 gap-3">
              {STAGES.slice(0, 8).map(stage => (
                <div key={stage} className="surface p-3 min-h-[140px]">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{stage}</div>
                  <div className="space-y-2">
                    {items.filter(i => i.stage === stage).map(i => (
                      <button key={i.id} onClick={() => { setEditing(i); setOpen(true); }} className="w-full text-left text-sm rounded border bg-background p-2 hover:bg-muted/50">
                        <div className="font-medium truncate">{i.title}</div>
                        {i.hook && <div className="text-xs text-muted-foreground line-clamp-2">{i.hook}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing.id ? "Edit content" : "New content"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
            <div><Label className="text-xs">Stage</Label>
              <Select value={editing.stage ?? "Idea"} onValueChange={(v) => setEditing({ ...editing, stage: v as Stage })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Hook</Label><Textarea rows={2} value={editing.hook ?? ""} onChange={(e) => setEditing({ ...editing, hook: e.target.value })} /></div>
            <div><Label className="text-xs">Script</Label><Textarea rows={4} value={editing.script ?? ""} onChange={(e) => setEditing({ ...editing, script: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Posted URL</Label><Input value={editing.posted_url ?? ""} onChange={(e) => setEditing({ ...editing, posted_url: e.target.value })} /></div>
              <div><Label className="text-xs">Scheduled for</Label><Input type="datetime-local" value={editing.scheduled_for ? new Date(editing.scheduled_for).toISOString().slice(0,16) : ""} onChange={(e) => setEditing({ ...editing, scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
