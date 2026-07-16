import { Link } from "react-router-dom";
import {
  Bot,
  BrainCircuit,
  Car,
  CheckCircle2,
  CircleDashed,
  Code2,
  DollarSign,
  Film,
  FolderSearch,
  Gauge,
  Package,
  RadioTower,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

type Module = {
  label: string;
  to?: string;
  status: "Active" | "Needs Setup" | "Planned";
};

type Division = {
  name: string;
  purpose: string;
  icon: typeof Car;
  accent: string;
  modules: Module[];
  manager: string;
};

const divisions: Division[] = [
  {
    name: "Great Freight Mobile Detailing",
    purpose: "Book jobs, deliver excellent service, collect proof, reviews and referrals.",
    icon: Car,
    accent: "border-gold/50",
    manager: "AI Detail Manager",
    modules: [
      { label: "Sales", to: "/outreach", status: "Active" },
      { label: "CRM", to: "/crm", status: "Active" },
      { label: "Calendar", to: "/integrations", status: "Planned" },
      { label: "Jobs", to: "/", status: "Active" },
      { label: "Reviews", to: "/crm", status: "Active" },
      { label: "Marketing", to: "/content", status: "Active" },
    ],
  },
  {
    name: "Great Freight Logistics",
    purpose: "Prepare a verified logistics operation without spending ahead of readiness.",
    icon: Truck,
    accent: "border-amber-600/40",
    manager: "AI Logistics Manager",
    modules: [
      { label: "Dispatch", status: "Planned" },
      { label: "Broker", status: "Planned" },
      { label: "Drivers", status: "Planned" },
      { label: "Loads", status: "Planned" },
      { label: "CRM", to: "/crm", status: "Active" },
    ],
  },
  {
    name: "Stan Store",
    purpose: "Sell tested digital products through content and opted-in email funnels.",
    icon: Package,
    accent: "border-violet-500/40",
    manager: "AI Product Manager",
    modules: [
      { label: "Products", to: "/roadmap", status: "Active" },
      { label: "Email Funnel", to: "/automations", status: "Planned" },
      { label: "Sales", to: "/revenue", status: "Active" },
      { label: "Analytics", to: "/revenue", status: "Active" },
    ],
  },
  {
    name: "Shopify",
    purpose: "Sell fulfillable merchandise using creator-led product stories.",
    icon: ShoppingBag,
    accent: "border-sky-500/40",
    manager: "AI Store Manager",
    modules: [
      { label: "Products", to: "/integrations", status: "Needs Setup" },
      { label: "Orders", to: "/integrations", status: "Needs Setup" },
      { label: "Inventory", to: "/integrations", status: "Needs Setup" },
      { label: "Marketing", to: "/content", status: "Active" },
    ],
  },
  {
    name: "Content Creator OS",
    purpose: "Move every idea through production, publishing and performance review.",
    icon: Film,
    accent: "border-rose-500/40",
    manager: "AI Content Director",
    modules: [
      { label: "Scripts", to: "/content", status: "Active" },
      { label: "Recording", to: "/content", status: "Active" },
      { label: "Editing", to: "/content", status: "Active" },
      { label: "Publishing", to: "/content", status: "Active" },
      { label: "Analytics", to: "/content", status: "Active" },
    ],
  },
  {
    name: "Huey HQ Software",
    purpose: "Build, validate and document the operating system as a future product.",
    icon: Code2,
    accent: "border-emerald-500/40",
    manager: "AI Software Product Manager",
    modules: [
      { label: "Features", to: "/roadmap", status: "Active" },
      { label: "Bugs", to: "/roadmap", status: "Active" },
      { label: "Roadmap", to: "/roadmap", status: "Active" },
      { label: "Beta Users", to: "/crm", status: "Planned" },
      { label: "Build Status", to: "/settings", status: "Active" },
    ],
  },
  {
    name: "Finance Division",
    purpose: "Protect cash, record proof and report performance across every business.",
    icon: DollarSign,
    accent: "border-green-600/40",
    manager: "AI CFO",
    modules: [
      { label: "Income", to: "/revenue", status: "Active" },
      { label: "Bills", to: "/revenue", status: "Active" },
      { label: "Taxes", status: "Planned" },
      { label: "Investments", to: "/revenue", status: "Active" },
    ],
  },
];

const commandServices = [
  { label: "AI Agent Network", to: "/executive", icon: Bot },
  { label: "Intelligence Center", to: "/integrations", icon: RadioTower },
  { label: "Knowledge Vault", to: "/knowledge", icon: FolderSearch },
  { label: "Automation Center", to: "/automations", icon: Zap },
  { label: "System Status", to: "/health", icon: Gauge },
  { label: "Module Store", to: "/module-store", icon: Package },
  { label: "Operations Timeline", to: "/timeline", icon: RadioTower },
];

function Status({ value }: { value: Module["status"] }) {
  const active = value === "Active";
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${active ? "text-forest" : "text-muted-foreground"}`}>
      {active ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
      {value}
    </span>
  );
}

export default function BusinessSystems() {
  return (
    <div>
      <PageHeader
        title="Command Center"
        description="One dashboard. Total control."
        actions={
          <Button asChild size="sm">
            <Link to="/">Open Mission Control</Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6 space-y-5">
        <section className="surface overflow-hidden">
          <div className="border-b bg-gradient-to-r from-foreground to-forest p-5 text-background">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-gold" />
              <div>
                <h2 className="font-display text-xl font-semibold">Huey HQ Command Center</h2>
                <p className="text-sm text-background/70">
                  Mission Control handles today. Every division reports upward with verified data.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-7">
            {commandServices.map((service) => (
              <Button key={service.label} asChild variant="outline" className="justify-start">
                <Link to={service.to}>
                  <service.icon className="mr-2 h-4 w-4" />
                  {service.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          {divisions.map((division) => (
            <section key={division.name} className={`surface border-l-4 ${division.accent} p-4 md:p-5`}>
              <div className="flex items-start gap-3">
                <division.icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-semibold">{division.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{division.purpose}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {division.modules.map((module) => {
                  const body = (
                    <>
                      <span className="truncate text-sm">{module.label}</span>
                      <Status value={module.status} />
                    </>
                  );
                  return module.to ? (
                    <Link key={module.label} to={module.to} className="rounded-md border p-2 hover:bg-muted/50">
                      {body}
                    </Link>
                  ) : (
                    <div key={module.label} className="rounded-md border border-dashed p-2 opacity-70">
                      {body}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                <BrainCircuit className="h-4 w-4 text-gold" />
                <span className="font-medium">{division.manager}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">reports to CEO</span>
              </div>
            </section>
          ))}
        </div>

        <section className="surface p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-5 w-5" />
            <div>
              <h2 className="font-display font-semibold">Shared services — build once</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                CRM, calendar, notes, documents, contacts, notifications and finance remain shared
                services. Business divisions use filtered views instead of duplicating data.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["CRM", "Calendar", "Notes", "Documents", "Contacts", "Notifications", "Finance"].map((item) => (
                  <span key={item} className="rounded-full border px-2.5 py-1 text-xs">{item}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
