import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminProfiles, useAdminProjects } from "@/hooks/useAdminData";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ['#6366f1', '#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const ranges = [
  { label: '7 Hari', days: 7 },
  { label: '30 Hari', days: 30 },
  { label: '90 Hari', days: 90 },
];

interface DailyCost { date: string; cost: number; calls: number; }
interface DistrictCalls { district: string; calls: number; }

function useApiAnalytics(rangeDays: number) {
  const [dailyCost, setDailyCost] = useState<DailyCost[]>([]);
  const [districtCalls, setDistrictCalls] = useState<DistrictCalls[]>([]);
  const [cacheHitRate, setCacheHitRate] = useState(0);

  useEffect(() => {
    async function load() {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - rangeDays);

      const { data } = await supabase
        .from('location_scores_cache')
        .select('api_calls_used, api_cost_usd, district, cached_at')
        .gte('cached_at', startDate.toISOString());

      if (!data || data.length === 0) {
        setDailyCost([]); setDistrictCalls([]); setCacheHitRate(0); return;
      }

      const dayMap: Record<string, { cost: number; calls: number }> = {};
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(); d.setDate(d.getDate() - (rangeDays - 1 - i));
        dayMap[d.toISOString().split('T')[0]] = { cost: 0, calls: 0 };
      }
      data.forEach(r => {
        if (!r.cached_at) return;
        const key = r.cached_at.split('T')[0];
        if (dayMap[key]) { dayMap[key].cost += Number(r.api_cost_usd || 0); dayMap[key].calls += (r.api_calls_used || 0); }
      });
      setDailyCost(Object.entries(dayMap).map(([date, v]) => ({ date, cost: Number(v.cost.toFixed(3)), calls: v.calls })));

      const dMap: Record<string, number> = {};
      data.forEach(r => { const d = r.district || 'Unknown'; dMap[d] = (dMap[d] || 0) + (r.api_calls_used || 0); });
      setDistrictCalls(Object.entries(dMap).map(([district, calls]) => ({ district, calls })).sort((a, b) => b.calls - a.calls).slice(0, 10));

      const total = data.length;
      const hits = data.filter(r => (r.api_calls_used || 0) === 0).length;
      setCacheHitRate(total > 0 ? Math.round((hits / total) * 100) : 0);
    }
    load();
  }, [rangeDays]);

  return { dailyCost, districtCalls, cacheHitRate };
}

export default function AdminAnalytics() {
  const [rangeDays, setRangeDays] = useState(30);
  const { data: profiles, isLoading: loadingProfiles } = useAdminProfiles();
  const { data: projects, isLoading: loadingProjects } = useAdminProjects();
  const { dailyCost, districtCalls, cacheHitRate } = useApiAnalytics(rangeDays);

  const now = Date.now();

  const analysesTrend = useMemo(() => {
    if (!projects) return [];
    return Array.from({ length: rangeDays }, (_, i) => {
      const day = new Date(now - (rangeDays - 1 - i) * 86400000);
      const dayStr = day.toISOString().split('T')[0];
      return {
        date: dayStr,
        started: projects.filter(p => p.created_at?.startsWith(dayStr)).length,
        completed: projects.filter(p => p.status === 'completed' && p.created_at?.startsWith(dayStr)).length,
      };
    });
  }, [projects, rangeDays]);

  // Category distribution from real projects
  const categoryDist = useMemo(() => {
    if (!projects) return [];
    const map: Record<string, number> = {};
    projects.forEach(p => { const cat = p.product_category || '-'; map[cat] = (map[cat] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [projects]);

  // City distribution from real projects
  const cityDist = useMemo(() => {
    if (!projects) return [];
    const map: Record<string, number> = {};
    projects.forEach(p => { const city = p.city || '-'; map[city] = (map[city] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [projects]);

  // Plan distribution
  const planDist = useMemo(() => {
    if (!profiles) return [];
    const map: Record<string, number> = {};
    profiles.forEach(p => { const plan = p.plan || 'free'; map[plan] = (map[plan] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [profiles]);

  const gaugeData = [{ name: 'Cache Hit Rate', value: cacheHitRate, fill: cacheHitRate >= 70 ? '#22c55e' : cacheHitRate >= 40 ? '#f59e0b' : '#ef4444' }];

  if (loadingProfiles || loadingProjects) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">Analytics</h1><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <div className="flex gap-1">
          {ranges.map(r => (
            <Button key={r.days} size="sm" variant={rangeDays === r.days ? 'default' : 'outline'}
              className={rangeDays === r.days ? 'bg-indigo-600 text-white' : ''}
              onClick={() => setRangeDays(r.days)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Google API Analytics */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-800">🌐 Google API Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">API Cost Harian (${dailyCost.reduce((s, d) => s + d.cost, 0).toFixed(2)} total)</CardTitle></CardHeader>
            <CardContent>
              {dailyCost.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dailyCost}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v: number, name: string) => name === 'cost' ? [`$${v.toFixed(3)}`, 'Biaya'] : [v, 'API Calls']} />
                    <Line type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="calls" stroke="#14b8a6" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Cache Hit Rate</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={16} data={gaugeData} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: '#f1f5f9' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '-10px' }}>
                  <span className={`text-3xl font-bold ${cacheHitRate >= 70 ? 'text-emerald-500' : cacheHitRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{cacheHitRate}%</span>
                  <span className="text-xs text-slate-400">Target: &gt;70%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">API Calls per Kecamatan (Top 10)</CardTitle></CardHeader>
          <CardContent>
            {districtCalls.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={districtCalls} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="district" type="category" tick={{ fontSize: 10 }} width={140} />
                  <Tooltip formatter={(v: number) => [`${v} calls`, 'API Calls']} />
                  <Bar dataKey="calls" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[300px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>}
          </CardContent>
        </Card>
      </div>

      {/* Analyses trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tren Analisis Harian</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analysesTrend}>
              <defs>
                <linearGradient id="gStarted" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="started" stroke="#6366f1" fill="url(#gStarted)" name="Dimulai" />
              <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#gCompleted)" name="Selesai" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category + City */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Top Kategori Produk</CardTitle></CardHeader>
          <CardContent>
            {categoryDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryDist} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Top Kota</CardTitle></CardHeader>
          <CardContent>
            {cityDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cityDist} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">Belum ada data</div>}
          </CardContent>
        </Card>
      </div>

      {/* Plan distribution */}
      <Card>
        <CardHeader><CardTitle className="text-base">Distribusi Plan</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {planDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
