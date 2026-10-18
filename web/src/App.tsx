import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AppLayout } from "@/components/AppLayout";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AnalysisWizard from "./pages/AnalysisWizard";
import AnalysisLoading from "./pages/AnalysisLoading";
import AnalysisDashboard from "./pages/AnalysisDashboard";
import Projects from "./pages/Projects";
import CompareLocations from "./pages/CompareLocations";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UpgradePlan from "./pages/UpgradePlan";
import Checkout from "./pages/Checkout";
import FoodOpportunity from "./pages/FoodOpportunity";
import MyReports from "./pages/MyReports";
import MyTransactions from "./pages/MyTransactions";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPromo from "./pages/admin/AdminPromo";
import AdminEngineParams from "./pages/admin/AdminEngineParams";
import AdminFoodIntelDashboard from "./pages/admin/AdminFoodIntelDashboard";
import AdminFoodIntelAnalyses from "./pages/admin/AdminFoodIntelAnalyses";
import AdminFoodIntelData from "./pages/admin/AdminFoodIntelData";
import AdminFoodIntelImport from "./pages/admin/AdminFoodIntelImport";
import AdminBlog from "./pages/admin/AdminBlog";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FiturPage from "./pages/FiturPage";
import HargaPage from "./pages/HargaPage";
import FAQPage from "./pages/FAQPage";
import TentangPage from "./pages/TentangPage";
import BlogRedirect from "./pages/BlogRedirect";
import CityPage from "./pages/CityPage";
import KontakPage from "./pages/KontakPage";
import AdminMessages from "./pages/admin/AdminMessages";
import DirectorySearch from "./pages/DirectorySearch";
import { TrackingScripts } from "@/components/TrackingScripts";

const queryClient = new QueryClient();

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <AuthGuard><AppLayout>{children}</AppLayout></AuthGuard>
);

const AdminPage = ({ children }: { children: React.ReactNode }) => (
  <AdminGuard><AdminLayout>{children}</AdminLayout></AdminGuard>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <TrackingScripts />
          <BrowserRouter>
            <Routes>
              {/* Public pages */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/fitur" element={<FiturPage />} />
              <Route path="/harga" element={<HargaPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/tentang" element={<TentangPage />} />
              <Route path="/kontak" element={<KontakPage />} />
              <Route path="/blog" element={<BlogRedirect />} />
              <Route path="/blog/*" element={<BlogRedirect />} />
              <Route path="/kota/:slug" element={<CityPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/register" element={<Navigate to="/register" replace />} />
              <Route path="/terms" element={<TermsConditions />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* App routes */}
              <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/app/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
              <Route path="/app/analysis/new" element={<ProtectedPage><AnalysisWizard /></ProtectedPage>} />
              <Route path="/app/analysis/:id/loading" element={<AuthGuard><AnalysisLoading /></AuthGuard>} />
              <Route path="/app/analysis/:id" element={<ProtectedPage><AnalysisDashboard /></ProtectedPage>} />
              <Route path="/app/projects" element={<ProtectedPage><Projects /></ProtectedPage>} />
              <Route path="/app/compare" element={<ProtectedPage><CompareLocations /></ProtectedPage>} />
              <Route path="/app/upgrade" element={<ProtectedPage><UpgradePlan /></ProtectedPage>} />
              <Route path="/app/checkout" element={<ProtectedPage><Checkout /></ProtectedPage>} />
              <Route path="/app/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
              <Route path="/app/food-opportunity" element={<ProtectedPage><FoodOpportunity /></ProtectedPage>} />
              <Route path="/app/my-reports" element={<ProtectedPage><MyReports /></ProtectedPage>} />
              <Route path="/app/my-transactions" element={<ProtectedPage><MyTransactions /></ProtectedPage>} />
              <Route path="/app/directory" element={<ProtectedPage><DirectorySearch /></ProtectedPage>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<AdminPage><AdminDashboard /></AdminPage>} />
              <Route path="/admin/users" element={<AdminPage><AdminUsers /></AdminPage>} />
              <Route path="/admin/users/:id" element={<AdminPage><AdminUserDetail /></AdminPage>} />
              <Route path="/admin/transactions" element={<AdminPage><AdminTransactions /></AdminPage>} />
              <Route path="/admin/analytics" element={<AdminPage><AdminAnalytics /></AdminPage>} />
              <Route path="/admin/projects" element={<AdminPage><AdminProjects /></AdminPage>} />
              <Route path="/admin/settings" element={<AdminPage><AdminSettings /></AdminPage>} />
              <Route path="/admin/settings/api-keys" element={<AdminPage><AdminSettings /></AdminPage>} />
              <Route path="/admin/settings/pricing" element={<AdminPage><AdminSettings /></AdminPage>} />
              <Route path="/admin/settings/limits" element={<AdminPage><AdminSettings /></AdminPage>} />
              <Route path="/admin/settings/tracking" element={<AdminPage><AdminSettings /></AdminPage>} />
              <Route path="/admin/settings/ai-prompts" element={<AdminPage><AdminSettings /></AdminPage>} />
              <Route path="/admin/plans" element={<AdminPage><AdminPlans /></AdminPage>} />
              <Route path="/admin/products" element={<AdminPage><AdminProducts /></AdminPage>} />
              <Route path="/admin/promo" element={<AdminPage><AdminPromo /></AdminPage>} />
              <Route path="/admin/audit-log" element={<AdminPage><AdminAuditLog /></AdminPage>} />
              <Route path="/admin/engine-parameters" element={<AdminPage><AdminEngineParams /></AdminPage>} />
              <Route path="/admin/foodintel" element={<AdminPage><AdminFoodIntelDashboard /></AdminPage>} />
              <Route path="/admin/foodintel/analyses" element={<AdminPage><AdminFoodIntelAnalyses /></AdminPage>} />
              <Route path="/admin/foodintel/data" element={<AdminPage><AdminFoodIntelData /></AdminPage>} />
              <Route path="/admin/foodintel/import" element={<AdminPage><AdminFoodIntelImport /></AdminPage>} />
              <Route path="/admin/blog" element={<AdminPage><AdminBlog /></AdminPage>} />
              <Route path="/admin/messages" element={<AdminPage><AdminMessages /></AdminPage>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
