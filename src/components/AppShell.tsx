import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, DollarSign, FileText, ScrollText, Bot, Zap,
  BookOpen, Map, Settings, Plug, LogOut, Menu, Sun, Moon, PlusCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/crm", label: "CRM", icon: Users },
  { to: "/revenue", label: "Revenue", icon: DollarSign },
  { to: "/content", label: "Content", icon: FileText },
  { to: "/scripts", label: "Scripts", icon: ScrollText },
  { to: "/executive", label: "Executive", icon: Bot },
  { to: "/automations", label: "Automations", icon: Zap },
  { to: "/knowledge", label: "Knowledge", icon: BookOpen },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = NAV.slice(0, 4).concat([{ to: "/scripts", label: "Scripts", icon: ScrollText }]);

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-sidebar-accent text-sidebar-primary-foreground border-l-2 border-sidebar-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            }`
          }
        >
          <n.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{n.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setDark((d) => !d);
  };

  const initials = (user?.email?.[0] ?? "H").toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
          <div className="h-7 w-7 rounded-sm bg-gold flex items-center justify-center text-gold-foreground font-bold text-sm">H</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-foreground">Huey HQ</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/50">Operating System</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto"><SidebarInner /></div>
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 rounded-md px-2 py-2 hover:bg-sidebar-accent text-left">
                <div className="h-7 w-7 rounded-full bg-gold text-gold-foreground text-xs font-semibold flex items-center justify-center">{initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs truncate text-sidebar-foreground">{user?.email}</div>
                  <div className="text-[10px] text-sidebar-foreground/50">Account</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {dark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {dark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); navigate("/auth"); }}>
                <LogOut className="mr-2 h-4 w-4" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 backdrop-blur px-3 md:px-5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
                <div className="h-7 w-7 rounded-sm bg-gold flex items-center justify-center text-gold-foreground font-bold text-sm">H</div>
                <div className="text-sm font-semibold">Huey HQ</div>
              </div>
              <SidebarInner onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="md:hidden font-display font-semibold">Huey HQ</div>

          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90" aria-label="Quick action">
                  <PlusCircle className="h-4 w-4" /><span className="hidden min-[360px]:inline">Quick action</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Operations</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate("/?startDay=1")}>Start My Day</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/?endDay=1")}>End My Day</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/crm?new=1")}>Add Lead</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/revenue?new=1")}>Log Revenue</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/content?new=1")}>Create Content</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/scripts")}>Send Follow-Up</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-6">
          <Outlet />
        </main>

        <footer className="hidden md:flex items-center justify-between gap-4 border-t px-5 py-3 text-[11px] text-muted-foreground">
          <span>Production: GitHub Pages</span>
          <span>Backend: Supabase mqmskpdduwbiypepzkvc</span>
          <span>Lovable: prototyping only</span>
        </footer>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t bg-background/95 backdrop-blur">
          <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
            {MOBILE_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`
                }
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
