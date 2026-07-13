import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, ExternalLink, Mail, Server, Trash2 } from "lucide-react";
import {
  ZOHO_PRIMARY_SENDER,
  ZOHO_SCOPES,
  disconnectZoho,
  getZohoAuthorizeUrl,
  getZohoStatus,
  sendZohoEmail,
  type ZohoConnectionStatus,
} from "@/lib/zohoMail";

const PRODUCTION_URL = "https://hueyroundtree-cmd.github.io/huey-hq-business-os/";
const SUPABASE_PROJECT_ID = "mqmskpdduwbiypepzkvc";
type SettingsDbResult = { data: Record<string, unknown>[] | null; error: { message: string } | null };
type SettingsDbQuery = PromiseLike<SettingsDbResult> & {
  select: (columns?: string) => SettingsDbQuery;
};
const settingsDb = supabase as unknown as {
  from: (table: string) => SettingsDbQuery;
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [business, setBusiness] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoho, setZoho] = useState<ZohoConnectionStatus | null>(null);
  const [zohoBusy, setZohoBusy] = useState(false);
  const [testAddress, setTestAddress] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setDisplayName(data.display_name ?? ""); setBusiness(data.business_name ?? ""); }
    });
    refreshZohoStatus();
  }, [user]);

  const refreshZohoStatus = async () => {
    try {
      setZoho(await getZohoStatus());
    } catch (error) {
      setZoho({
        status: "Needs Setup",
        connectedAddress: null,
        accountId: null,
        lastSync: null,
        lastError: error instanceof Error ? error.message : String(error),
        connectedAt: null,
        disconnectedAt: null,
        sender: ZOHO_PRIMARY_SENDER,
        scopes: ZOHO_SCOPES,
      });
    }
  };

  const connectZoho = async () => {
    setZohoBusy(true);
    try {
      const result = await getZohoAuthorizeUrl();
      window.location.href = result.url;
    } catch (error) {
      toast.error("Zoho connect needs setup", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setZohoBusy(false);
    }
  };

  const handleDisconnectZoho = async () => {
    setZohoBusy(true);
    try {
      await disconnectZoho();
      toast.success("Zoho Mail disconnected");
      await refreshZohoStatus();
    } catch (error) {
      toast.error("Disconnect failed", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setZohoBusy(false);
    }
  };

  const sendZohoTest = async () => {
    if (!testAddress || !testAddress.includes("@")) return toast.error("Enter a test email address first.");
    setZohoBusy(true);
    try {
      await sendZohoEmail({
        leadId: "",
        toAddress: testAddress,
        subject: "Great Freight Mobile Detailing — Zoho test",
        body: "This is a user-controlled Zoho Mail connection test from Huey HQ CRM. No prospect was contacted.",
        confirmDuplicate: true,
      });
      toast.success("Test email sent", { description: `Sent only to ${testAddress}` });
      await refreshZohoStatus();
    } catch (error) {
      toast.error("Test email failed", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setZohoBusy(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, business_name: business });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
  };

  const exportData = async () => {
    const tables = ["leads","crm_email_messages","revenue_entries","daily_checkins","daily_performance_snapshots","daily_performance_manual_corrections","tasks","scripts","content_items","business_projects","ai_commands","automations","integrations","sync_mappings","sync_audit","knowledge_docs","bills","jobs","lead_activities","operations_events"];
    const bundle: Record<string, Record<string, unknown>[]> = {};
    for (const t of tables) {
      const { data } = await settingsDb.from(t).select("*");
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
          <h3 className="font-medium text-sm flex items-center gap-2"><Server className="h-4 w-4" />Production environment</h3>
          <dl className="grid gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Production app</dt>
              <dd>
                <a className="inline-flex items-center gap-1 font-medium underline underline-offset-2" href={PRODUCTION_URL} target="_blank" rel="noreferrer">
                  GitHub Pages <ExternalLink className="h-3 w-3" />
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Backend</dt>
              <dd className="font-mono break-all">Owned Supabase project {SUPABASE_PROJECT_ID}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lovable</dt>
              <dd>Design and prototyping only. Not production hosting.</dd>
            </div>
          </dl>
        </div>

        <div className="surface p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-medium text-sm flex items-center gap-2"><Mail className="h-4 w-4" />Zoho Mail</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Secure OAuth connection for CRM email drafting and manual sending. Tokens are stored server-side only.
              </p>
            </div>
            <span className="rounded-sm border px-2 py-1 text-xs">{zoho?.status ?? "Needs Setup"}</span>
          </div>
          <dl className="grid gap-3 text-xs">
            <div>
              <dt className="text-muted-foreground">Required sender</dt>
              <dd className="font-mono break-all">{ZOHO_PRIMARY_SENDER}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Connected address</dt>
              <dd>{zoho?.connectedAddress ?? "Not connected"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">OAuth scopes</dt>
              <dd className="font-mono break-all">{ZOHO_SCOPES.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last sync</dt>
              <dd>{zoho?.lastSync ? new Date(zoho.lastSync).toLocaleString() : "Never"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last error</dt>
              <dd>{zoho?.lastError ?? "None"}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={connectZoho} disabled={zohoBusy}>{zoho?.status === "Verified Live" ? "Reconnect" : "Connect"}</Button>
            <Button size="sm" variant="outline" onClick={refreshZohoStatus} disabled={zohoBusy}>Refresh Status</Button>
            <Button size="sm" variant="outline" onClick={handleDisconnectZoho} disabled={zohoBusy}>Disconnect</Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              type="email"
              value={testAddress}
              onChange={(event) => setTestAddress(event.target.value)}
              placeholder="User-controlled test address only"
            />
            <Button size="sm" variant="outline" onClick={sendZohoTest} disabled={zohoBusy || zoho?.status !== "Verified Live"}>Send test email</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Test email is disabled until Zoho is connected and must be sent to a manually entered test address, never to prospects.
          </p>
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
