import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Revenue from "./pages/Revenue";
import Scripts from "./pages/Scripts";
import Content from "./pages/Content";
import Executive from "./pages/Executive";
import Automations from "./pages/Automations";
import Knowledge from "./pages/Knowledge";
import Roadmap from "./pages/Roadmap";
import Integrations from "./pages/Integrations";
import NotionSetup from "./pages/NotionSetup";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner richColors position="top-right" />
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/revenue" element={<Revenue />} />
              <Route path="/content" element={<Content />} />
              <Route path="/scripts" element={<Scripts />} />
              <Route path="/executive" element={<Executive />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/knowledge" element={<Knowledge />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/integrations/notion" element={<NotionSetup />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
