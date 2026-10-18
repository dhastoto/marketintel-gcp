import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = 'admin' | 'super_admin' | null;

export function useAdminRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "super_admin"]);

      if (data && data.length > 0) {
        // Pick highest role
        const isSuperAdmin = data.some((r: { role: string }) => r.role === 'super_admin');
        setRole(isSuperAdmin ? 'super_admin' : 'admin');
      } else {
        setRole(null);
      }
      setLoading(false);
    };

    checkRole();
  }, [user, authLoading]);

  return { role, isAdmin: role !== null, isSuperAdmin: role === 'super_admin', loading };
}
