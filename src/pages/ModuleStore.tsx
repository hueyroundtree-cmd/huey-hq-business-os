import { Link } from "react-router-dom";
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  Car,
  CheckCircle2,
  ChefHat,
  Dumbbell,
  FileStack,
  Hammer,
  MessageSquareCode,
  Palette,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

const modules = [
  {
    name: "Detailing Module",
    description: "Sales, CRM, jobs, reviews, marketing and the AI Detail Manager.",
    icon: Car,
    status: "Operational",
    to: "/crm",
  },
  {
    name: "Logistics Module",
    description: "Dispatch, broker, driver, load and logistics CRM workspace.",
    icon: Truck,
    status: "Setup Required",
    to: "/command-center",
  },
  {
    name: "Creator Module",
    description: "Scripts, recording, editing, publishing, analytics and AI direction.",
    icon: Palette,
    status: "Operational",
    to: "/content",
  },
  {
    name: "Real Estate Module",
    description: "Property leads, contacts, showings, documents and opportunity tracking.",
    icon: Building2,
    status: "Setup Required",
    to: "/roadmap",
  },
  {
    name: "Fitness Module",
    description: "Workouts, habits, health goals, progress and accountability.",
    icon: Dumbbell,
    status: "Setup Required",
    to: "/roadmap",
  },
  {
    name: "Contractor Module",
    description: "Leads, estimates, jobs, crews, materials, invoices and follow-ups.",
    icon: Hammer,
    status: "Setup Required",
    to: "/roadmap",
  },
  {
    name: "Restaurant Module",
    description: "Menu, orders, inventory, staff, vendors, marketing and daily operations.",
    icon: ChefHat,
    status: "Setup Required",
    to: "/roadmap",
  },
  {
    name: "AI Agent Pack",
    description: "Executive, finance, sales, marketing, operations and customer-success agents.",
    icon: Bot,
    status: "Operational",
    to: "/executive",
  },
  {
    name: "CRM Templates",
    description: "Reusable service, product, software and relationship pipelines.",
    icon: FileStack,
    status: "Operational",
    to: "/crm",
  },
  {
    name: "Prompt Packs",
    description: "Approved commands and reusable prompts for each business division.",
    icon: MessageSquareCode,
    status: "Operational",
    to: "/scripts",
  },
];

export default function ModuleStore() {
  return (
    <div>
      <PageHeader
        title="Command Center Store"
        description="Installed modules for Huey HQ. Operational modules open immediately; new industries require setup."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/command-center">Back to Command Center</Link>
          </Button>
        }
      />

      <div className="p-4 md:p-6">
        <div className="mb-5 surface p-4">
          <div className="flex items-start gap-3">
            <BriefcaseBusiness className="mt-0.5 h-5 w-5 text-gold" />
            <div>
              <h2 className="font-display font-semibold">10 modules installed</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Installation adds each module to Huey HQ. “Setup Required” means the shell exists,
                but its workflow, fields and trusted data sources still need configuration before use.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const operational = module.status === "Operational";
            return (
              <section key={module.name} className="surface p-4 flex flex-col">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-muted p-2">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold">{module.name}</h2>
                    <div className={`mt-1 inline-flex items-center gap-1 text-xs ${operational ? "text-forest" : "text-amber-600"}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Installed · {module.status}
                    </div>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{module.description}</p>
                <Button asChild size="sm" variant={operational ? "default" : "outline"} className="mt-4 w-full">
                  <Link to={module.to}>{operational ? "Open module" : "Configure module"}</Link>
                </Button>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
