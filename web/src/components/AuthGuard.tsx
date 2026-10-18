import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { useAdminRole } from "@/hooks/useAdminRole";
import Maintenance from "@/pages/Maintenance";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, isPasswordRecovery } = useAuth();
  const { isMaintenanceMode, loading: maintLoading } = useMaintenanceMode();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const location = useLocation();

  // Force recovery users to reset password page BEFORE any other check.
  // We treat ANY navigation to /reset-password as recovery intent — even if
  // Supabase has already silently exchanged the recovery token for a session
  // (which strips the URL hash/query and would otherwise let the user into
  // the dashboard).
  if (isPasswordRecovery || location.pathname === "/reset-password") {
    if (location.pathname !== "/reset-password") {
      return <Navigate to="/reset-password" replace />;
    }
  }

  if (loading || maintLoading || adminLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isMaintenanceMode && !isAdmin) {
    return <Maintenance />;
  }

  return <>{children}</>;
}
