import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, CreditCard, TrendingUp, BarChart3, AlertTriangle, Info, Globe, Zap, Database, FlaskConical, RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart, Bar, BarChart } from "recharts";
import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminDashboardStats, useAdminProfiles, useAdminTransactions, useAdminAnalysisRuns } from "@/hooks/useAdminData";
import { Skeleton } from "@/components/ui/skeleton";

const PLAN_COLORS: Record<string, string> = { free: '#94a3b8', starter: '#3b82f6', pro: '#6366f1', business: '#f59e0b' };

function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

interface ApiStats {
  totalCalls: number;
  totalCost: number;
  cacheHitRate: number;
  topCities: { name: string; calls: number }[];
}

function useGoogleApiStats(): ApiStats {
  const [stats, setStats] = useState<ApiStats>({
    totalCalls: 0, totalCost: 0, cacheHitRate: 0, topCities: [],
  });

  useEffect(() => {
    async function load() {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('location_scores_cache')
        .select('api_calls_used, api_cost_usd, district, cached_at');

      if (!data || data.length === 0) return;

      const todayRows = data.filter(r => r.cached_at && new Date(r.cached_at) >= todayStart);
      const totalCalls = todayRows.reduce((s, r) => s + (r.api_calls_used || 0), 0);
      const totalCost = todayRows.reduce((s, r) => s + Number(r.api_cost_usd || 0), 0);

      const totalAll = data.length;
      const cacheHits = data.filter(r => (r.api_calls_used || 0) === 0).length;
      const cacheHitRate = totalAll > 0 ? Math.round((cacheHits / totalAll) * 100) : 0;

      const cityMap: Record<string, number> = {};
      data.forEach(r => {
        const city = r.district || 'Unknown';
        cityMap[city] = (cityMap[city] || 0) + (r.api_calls_used || 0);
      });
      const topCities = Object.entries(cityMap)
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);

      setStats({ totalCalls, totalCost, cacheHitRate, topCities });
    }
    load();
  }, []);

  return stats;
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminDashboardStats();
  const { data: profiles } = useAdminProfiles();
  const { data: transactions } = useAdminTransactions();
  const { data: analysisRuns } = useAdminAnalysisRuns();
  const apiStats = useGoogleApiStats();

  const recentUsers = useMemo(() => {
    if (!profiles) return [];
    return [...profiles].sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()).slice(0, 5);
  }, [profiles]);

  const recentRuns = useMemo(() => {
    if (!analysisRuns) return [];
    return analysisRuns.slice(0, 10);
  }, [analysisRuns]);

  const activities = useMemo(() => {
    const items: { icon: string; text: string; time: string }[] = [];
    recentUsers.forEach(u => items.push({
      icon: '👤',
      text: `${u.full_name} mendaftar (${(u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1)} Plan)`,
      time: u.created_at || '',
    }));
    (transactions || []).slice(0, 5).forEach(t => {
      if (t.transaction_type === 'topup') items.push({ icon: '💳', text: `${t.user_name} top-up ${t.amount} kredit`, time: t.created_at || '' });
      if (t.transaction_type === 'usage') items.push({ icon: '📊', text: `${t.user_name} menggunakan 1 kredit analisis`, time: t.created_at || '' });
    });
    return items.filter(a => a.time).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [recentUsers, transactions]);

  const pieData = useMemo(() => {
    if (!stats?.planDist) return [];
    return Object.entries(stats.planDist).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [stats]);

  const pendingCount = stats?.pendingTransactions || 0;

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Pengguna" value={stats?.totalUsers || 0} badge={`+${stats?.newUsersThisWeek || 0} minggu ini`} badgeColor="bg-emerald-100 text-emerald-700" />
        <StatCard icon={Activity} label="Pengguna Aktif" value={stats?.activeUsers || 0} badge={stats?.totalUsers ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% dari total` : '0%'} badgeColor="bg-blue-100 text-blue-700" />
        <StatCard icon={CreditCard} label="Total Top-Up" value={stats?.topupTransactions || 0} />
        <StatCard icon={TrendingUp} label="Revenue Bulan Ini" value={formatRupiah(stats?.revenueThisMonth || 0)} />
        <StatCard icon={BarChart3} label="Analisis Selesai" value={stats?.completedAnalyses || 0} />
      </div>

      {/* Analysis Runs Stats */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-emerald-600" />
            Statistik Analisis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-slate-500">Total Eksekusi</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{stats?.totalAnalysisRuns || 0}</p>
              <p className="text-[10px] text-slate-400">+{stats?.todayRuns || 0} hari ini</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-slate-500">Berhasil</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{stats?.completedRuns || 0}</p>
              <p className="text-[10px] text-slate-400">
                {stats?.totalAnalysisRuns ? `${Math.round(((stats?.completedRuns || 0) / stats.totalAnalysisRuns) * 100)}% sukses` : '0%'}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-xs text-slate-500">Gagal</span>
              </div>
              <p className="text-xl font-bold text-red-600">{stats?.failedRuns || 0}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-slate-500">Rata-rata Durasi</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{stats?.avgDurationMs ? formatDuration(stats.avgDurationMs) : '-'}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs text-slate-500">Re-analisis</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{stats?.reAnalyzedProjects || 0}</p>
              <p className="text-[10px] text-slate-400">proyek &gt;1 analisis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Google API Cost Card */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-indigo-500" />
            Biaya Google API Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs text-slate-500">Total API Calls</span>
              </div>
              <p className="text-xl font-bold text-slate-900">{apiStats.totalCalls}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs text-slate-500">Estimasi Biaya</span>
              </div>
              <p className="text-xl font-bold text-slate-900">${apiStats.totalCost.toFixed(2)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Database className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs text-slate-500">Cache Hit Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-slate-900">{apiStats.cacheHitRate}%</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${apiStats.cacheHitRate >= 70 ? 'bg-emerald-100 text-emerald-700' : apiStats.cacheHitRate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {apiStats.cacheHitRate >= 70 ? 'Baik' : apiStats.cacheHitRate >= 40 ? 'Sedang' : 'Rendah'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs text-slate-500">Top Kecamatan</span>
              </div>
              {apiStats.topCities.length > 0 ? (
                <div className="space-y-0.5">
                  {apiStats.topCities.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 truncate max-w-[80px]">{c.name}</span>
                      <span className="font-mono text-slate-500">{c.calls}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada data</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Pertumbuhan Pengguna & Analisis (30 hari)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={(stats?.dailyRegistrations || []).map((d, i) => ({
                ...d,
                analyses: stats?.dailyAnalysisRuns?.[i]?.count || 0,
              }))}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAnalysis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip labelFormatter={v => `Tanggal: ${v}`} />
                <Area type="monotone" dataKey="cumulative" name="Kumulatif User" stroke="#6366f1" fill="url(#colorReg)" strokeWidth={2} />
                <Area type="monotone" dataKey="analyses" name="Analisis" stroke="#10b981" fill="url(#colorAnalysis)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Distribusi Plan</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={PLAN_COLORS[entry.name.toLowerCase()] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs flex-wrap">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PLAN_COLORS[p.name.toLowerCase()] || '#94a3b8' }} />
                  <span className="text-slate-600">{p.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Analysis Runs */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Riwayat Analisis Terbaru</CardTitle>
          <span className="text-xs text-slate-400">{stats?.weekRuns || 0} analisis minggu ini</span>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="pb-2 pr-4">Proyek</th>
                  <th className="pb-2 pr-4">Pengguna</th>
                  <th className="pb-2 pr-4">Run#</th>
                  <th className="pb-2 pr-4">Kecamatan</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Durasi</th>
                  <th className="pb-2">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map(run => (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-slate-900 truncate max-w-[150px]">{run.project_name}</td>
                    <td className="py-2 pr-4 text-slate-600 truncate max-w-[120px]">{run.user_name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-[10px]">#{run.run_number}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-500 truncate max-w-[150px]">
                      {(run.districts_analyzed || []).join(', ') || '-'}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge className={`text-[10px] ${
                        run.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        run.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {run.status === 'completed' ? 'Selesai' : run.status === 'failed' ? 'Gagal' : 'Berjalan'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-500 font-mono">
                      {run.duration_ms ? formatDuration(run.duration_ms) : '-'}
                    </td>
                    <td className="py-2 text-xs text-slate-400">
                      {run.triggered_at ? timeAgo(run.triggered_at) : '-'}
                    </td>
                  </tr>
                ))}
                {recentRuns.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-slate-400">Belum ada data analisis</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent users + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Pengguna Terbaru</CardTitle>
            <a href="/admin/users" className="text-xs text-indigo-500 hover:underline">Lihat semua →</a>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {u.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.business_name || '-'}</p>
                  </div>
                  <Badge className={`text-[10px] ${
                    u.plan === 'pro' ? 'bg-indigo-100 text-indigo-700' :
                    u.plan === 'business' ? 'bg-amber-100 text-amber-700' :
                    u.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {u.plan || 'free'}
                  </Badge>
                  <span className="text-[10px] text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</span>
                </div>
              ))}
              {recentUsers.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Belum ada pengguna</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Aktivitas Terkini</CardTitle>
            <a href="/admin/audit-log" className="text-xs text-indigo-500 hover:underline">Lihat semua →</a>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base mt-0.5">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{a.text}</p>
                    <p className="text-[10px] text-slate-400">{timeAgo(a.time)}</p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Belum ada aktivitas</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pendingCount > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">{pendingCount} transaksi pending menunggu konfirmasi</p>
            </CardContent>
          </Card>
        )}
        {(stats?.failedRuns || 0) > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-800">{stats?.failedRuns} analisis gagal perlu ditinjau</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-800">Data dashboard menggunakan data riil dari database</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, badge, badgeColor }: {
  icon: React.ElementType; label: string; value: string | number; badge?: string; badgeColor?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <Icon className="h-5 w-5 text-indigo-500" />
          {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badgeColor || 'bg-slate-100 text-slate-600'}`}>{badge}</span>}
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
