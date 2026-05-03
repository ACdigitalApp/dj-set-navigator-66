import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TopBar } from "@/components/layout/TopBar";
import { I18nProvider } from "@/lib/i18n";
import IndexPage from "./pages/Index";
import DashboardPage from "./pages/Dashboard";
import LibraryPage from "./pages/Library";
import TrackDetailPage from "./pages/TrackDetail";
import CratesPage from "./pages/Crates";
import SourcesPage from "./pages/Sources";
import SettingsPage from "./pages/Settings";
import AuthPage from "./pages/Auth";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import UserManagementPage from "./pages/UserManagement";
import BankDetailsPage from "./pages/BankDetails";
import TidalCallbackPage from "./pages/TidalCallback";
import DiscoverPage from "./pages/Discover";
import ForbiddenPage from "./pages/Forbidden";
import UpgradePage from "./pages/Upgrade";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col h-screen">
            <TopBar />
            <div className="flex-1 min-h-0">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<IndexPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/tidal-callback" element={<TidalCallbackPage />} />
                <Route path="/forbidden" element={<ForbiddenPage />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<AuthGuard><AppLayout><DashboardPage /></AppLayout></AuthGuard>} />
                <Route path="/library" element={<AuthGuard><AppLayout><LibraryPage /></AppLayout></AuthGuard>} />
                <Route path="/discover" element={<AuthGuard><AppLayout><DiscoverPage /></AppLayout></AuthGuard>} />
                <Route path="/track/:id" element={<AuthGuard><AppLayout><TrackDetailPage /></AppLayout></AuthGuard>} />
                <Route path="/crates" element={<AuthGuard><AppLayout><CratesPage /></AppLayout></AuthGuard>} />
                <Route path="/sources" element={<AuthGuard><AppLayout><SourcesPage /></AppLayout></AuthGuard>} />
                <Route path="/settings" element={<AuthGuard><AppLayout><SettingsPage /></AppLayout></AuthGuard>} />
                <Route path="/upgrade" element={<AuthGuard><UpgradePage /></AuthGuard>} />

                {/* Admin-only routes */}
                <Route path="/users" element={<AuthGuard requireAdmin><AppLayout><UserManagementPage /></AppLayout></AuthGuard>} />
                <Route path="/bank" element={<AuthGuard requireAdmin><AppLayout><BankDetailsPage /></AppLayout></AuthGuard>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
