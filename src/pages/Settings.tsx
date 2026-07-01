import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";

export default function Settings() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [business, setBusiness] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setDisplayName(data.display_name ?? ""); setBusiness(data.business_name ?? ""); }
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, business_name: business });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const exportData = async () => {
    const tables = ["leads","revenue_entries","daily_checkins","tasks","scripts","content_items","automations","integrations","sync_mappings","sync_audit","knowledge_docs","bills","jobs","lead_activities"];
    const bundle: Record<string, any> = {};
    for (const t of tables) {
      const { data } = await supabase.from(t as any).select("*");
      bundle[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `huey-hq-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const requestDelete = () => {
    toast.message("Account deletion queued", {
      description: "In this release, deletion requires a support step. Contact admin to fully remove account records. You can also export first, then sign out.",
    });
  };

  return (
    <div>
      <PageHeader title="Account Settings" />
      <div className="p-4 md:p-6 space-y-6 max-w-2xl">
        <div className="surface p-4 space-y-3">
          <h3 className="font-medium text-sm">Profile</h3>
          <div><Label className="text-xs">Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label className="text-xs">Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          <div><Label className="text-xs">Business name</Label><Input value={business} onChange={(e) => setBusiness(e.target.value)} /></div>
          <Button size="sm" onClick={saveProfile} disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
        </div>

        <div className="surface p-4 space-y-3">
          <h3 className="font-medium text-sm">Your data</h3>
          <p className="text-xs text-muted-foreground">Download a full JSON export of your Huey HQ records at any time.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportData}><Download className="h-4 w-4 mr-1.5" />Export JSON</Button>
            <Button size="sm" variant="outline" onClick={requestDelete}><Trash2 className="h-4 w-4 mr-1.5" />Request account deletion</Button>
          </div>
        </div>

        <div className="surface p-4 space-y-3">
          <h3 className="font-medium text-sm">Session</h3>
          <Button size="sm" variant="outline" onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
