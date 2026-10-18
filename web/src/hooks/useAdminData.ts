import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminProfile {
  id: string;
  full_name: string;
  email?: string;
  email_confirmed_at?: string | null;
  plan: string | null;
  credits_remaining: number | null;
  created_at: string | null;
  business_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  updated_at: string | null;
}

export interface AdminProject {
  id: string;
  user_id: string;
  project_name: string;
  status: string | null;
  created_at: string | null;
  user_name?: string;
  product_name?: string;
  product_category?: string;
  city?: string;
  districts?: string[];
}

export interface AdminTransaction {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  credit_before: number;
  credit_after: number;
  description: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_status: string | null;
  created_at: string | null;
  notes: string | null;
  user_name?: string;
}

export interface AdminAnalysisRun {
  id: string;
  project_id: string;
  user_id: string;
  run_number: number;
  districts_analyzed: string[];
  status: string;
  duration_ms: number | null;
  triggered_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  project_name?: string;
  user_name?: string;
}

export interface AdminAuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
  admin_name?: string;
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch auth users via edge function and merge them with profiles so users
      // still appear in admin even if a profile row is temporarily missing.
      type AdminAuthUser = {
        id: string;
        email: string;
        email_confirmed_at?: string | null;
        created_at?: string | null;
        full_name?: string;
      };
      let authUsers: AdminAuthUser[] = [];
      try {
        const { data: emailData } = await supabase.functions.invoke("admin-list-users");
        if (emailData?.users) {
          authUsers = emailData.users as AdminAuthUser[];
        }
      } catch { /* ignore */ }

      const profileMap = new Map((data || []).map(p => [p.id, p]));
      const merged = authUsers.length > 0
        ? authUsers.map((authUser) => {
          const profile = profileMap.get(authUser.id);
          return {
            id: authUser.id,
            full_name: profile?.full_name || authUser.full_name || authUser.email?.split("@")[0] || "User",
            email: authUser.email || undefined,
            email_confirmed_at: authUser.email_confirmed_at || null,
            plan: profile?.plan ?? "free",
            credits_remaining: profile?.credits_remaining ?? 0,
            created_at: profile?.created_at || authUser.created_at || null,
            business_name: profile?.business_name ?? null,
            phone: profile?.phone ?? null,
            avatar_url: profile?.avatar_url ?? null,
            updated_at: profile?.updated_at ?? null,
          };
        })
        : (data || []).map(p => ({ ...p, email: undefined, email_confirmed_at: undefined }));

      return merged as AdminProfile[];
    },
    staleTime: 30_000,
  });
}

export function useAdminProjects() {
  return useQuery({
    queryKey: ["admin", "projects"],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*, business_inputs(product_name, product_category, city, districts)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      return (projects || []).map((p: any) => {
        const bi = Array.isArray(p.business_inputs) ? p.business_inputs[0] : p.business_inputs;
        return {
          id: p.id,
          user_id: p.user_id,
          project_name: p.project_name,
          status: p.status,
          created_at: p.created_at,
          user_name: profileMap.get(p.user_id) || "Unknown",
          product_name: bi?.product_name || "-",
          product_category: bi?.product_category || "-",
          city: bi?.city || "-",
          districts: bi?.districts || [],
        } as AdminProject;
      });
    },
    staleTime: 30_000,
  });
}

export function useAdminTransactions() {
  return useQuery({
    queryKey: ["admin", "transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      return (data || []).map((t: any) => ({
        ...t,
        // Map fields baru -> field lama agar UI tidak rusak
        transaction_type: t.purchase_type,
        amount: t.final_amount,
        description: t.product_code || t.bundle_code || t.upgrade_to,
        payment_status: t.payment_status === 'paid' ? 'completed' : t.payment_status,
        payment_reference: t.invoice_number,
        user_name: profileMap.get(t.user_id) || "Unknown",
      })) as AdminTransaction[];
    },
    staleTime: 30_000,
  });
}

export function useAdminAuditLogs() {
  return useQuery({
    queryKey: ["admin", "audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name");

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));

      return (data || []).map((l: any) => ({
        ...l,
        admin_name: profileMap.get(l.admin_id) || "Admin",
        details: l.details as Record<string, unknown> | null,
      })) as AdminAuditLogEntry[];
    },
    staleTime: 30_000,
  });
}

export function useAdminAnalysisRuns() {
  return useQuery({
    queryKey: ["admin", "analysis_runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_runs")
        .select("*")
        .order("triggered_at", { ascending: false });
      if (error) throw error;

      const [{ data: profiles }, { data: projects }] = await Promise.all([
        supabase.from("profiles").select("id, full_name"),
        supabase.from("projects").select("id, project_name"),
      ]);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name]));
      const projectMap = new Map((projects || []).map(p => [p.id, p.project_name]));

      return (data || []).map((r: any) => ({
        ...r,
        user_name: profileMap.get(r.user_id) || "Unknown",
        project_name: projectMap.get(r.project_id) || "Unknown",
      })) as AdminAnalysisRun[];
    },
    staleTime: 30_000,
  });
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard_stats"],
    queryFn: async () => {
      const [profilesRes, projectsRes, transactionsRes, analysisRunsRes] = await Promise.all([
        supabase.from("profiles").select("id, plan, credits_remaining, created_at"),
        supabase.from("projects").select("id, user_id, status, created_at"),
        supabase.from("transactions").select("id, user_id, purchase_type, final_amount, payment_status, created_at"),
        supabase.from("analysis_runs").select("id, project_id, status, duration_ms, triggered_at"),
      ]);

      const profiles = profilesRes.data || [];
      const projects = projectsRes.data || [];
      const transactions = (transactionsRes.data || []) as any[];
      const analysisRuns = analysisRunsRes.data || [];

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      const monthAgo = new Date(now.getTime() - 30 * 86400000);
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

      const totalUsers = profiles.length;
      const newUsersThisWeek = profiles.filter(u => u.created_at && new Date(u.created_at) > weekAgo).length;
      const activeUserIds = new Set(
        projects.filter(p => p.created_at && new Date(p.created_at) > monthAgo).map(p => p.user_id)
      );
      const activeUsers = activeUserIds.size;
      const completedAnalyses = projects.filter(p => p.status === "completed").length;
      const topupTransactions = transactions.filter(t => t.payment_status === 'paid').length;
      const pendingTransactions = transactions.filter(t => t.payment_status === "pending").length;

      // Analysis runs stats
      const totalAnalysisRuns = analysisRuns.length;
      const completedRuns = analysisRuns.filter(r => r.status === 'completed').length;
      const failedRuns = analysisRuns.filter(r => r.status === 'failed').length;
      const todayRuns = analysisRuns.filter(r => r.triggered_at && new Date(r.triggered_at) >= todayStart).length;
      const weekRuns = analysisRuns.filter(r => r.triggered_at && new Date(r.triggered_at) > weekAgo).length;
      const avgDurationMs = completedRuns > 0
        ? Math.round(analysisRuns.filter(r => r.status === 'completed' && r.duration_ms).reduce((s, r) => s + (r.duration_ms || 0), 0) / completedRuns)
        : 0;

      // Projects with multiple runs
      const projectRunCounts: Record<string, number> = {};
      analysisRuns.forEach(r => { projectRunCounts[r.project_id] = (projectRunCounts[r.project_id] || 0) + 1; });
      const reAnalyzedProjects = Object.values(projectRunCounts).filter(c => c > 1).length;

      // Daily analysis runs for 30 days
      const dailyAnalysisRuns = Array.from({ length: 30 }, (_, i) => {
        const day = new Date(now.getTime() - (29 - i) * 86400000);
        const dayStr = day.toISOString().split("T")[0];
        const count = analysisRuns.filter(r => r.triggered_at?.startsWith(dayStr)).length;
        return { date: dayStr, count };
      });

      // Revenue: from paid transactions in last 30 days
      const revenueThisMonth = transactions
        .filter(t => t.payment_status === 'paid' && t.created_at && new Date(t.created_at) > monthAgo)
        .reduce((s, t) => s + (t.final_amount || 0), 0);

      // Plan distribution
      const planDist: Record<string, number> = {};
      profiles.forEach(p => {
        const plan = p.plan || "free";
        planDist[plan] = (planDist[plan] || 0) + 1;
      });

      // Daily registrations for 30 days
      const dailyRegistrations = Array.from({ length: 30 }, (_, i) => {
        const day = new Date(now.getTime() - (29 - i) * 86400000);
        const dayStr = day.toISOString().split("T")[0];
        const count = profiles.filter(u => u.created_at?.startsWith(dayStr)).length;
        return { date: dayStr, count, cumulative: 0 };
      });
      let cum = profiles.filter(u => u.created_at && new Date(u.created_at) <= new Date(dailyRegistrations[0]?.date || "")).length;
      dailyRegistrations.forEach(d => { cum += d.count; d.cumulative = cum; });

      return {
        totalUsers,
        newUsersThisWeek,
        activeUsers,
        completedAnalyses,
        topupTransactions,
        revenueThisMonth,
        pendingTransactions,
        planDist,
        dailyRegistrations,
        totalAnalysisRuns,
        completedRuns,
        failedRuns,
        todayRuns,
        weekRuns,
        avgDurationMs,
        reAnalyzedProjects,
        dailyAnalysisRuns,
      };
    },
    staleTime: 60_000,
  });
}
