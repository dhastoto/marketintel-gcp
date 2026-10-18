import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { toast } from "sonner";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useAdminRole();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    toast.error("Akses ditolak — Anda bukan admin");
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
}
