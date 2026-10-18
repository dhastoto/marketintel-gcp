import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, MapPin, TrendingUp, Lightbulb } from "lucide-react";

const AdminFoodIntelDashboard = () => {
  const [stats, setStats] = useState({ total: 0, uniqueUsers: 0, uniqueKab: 0, today: 0 });
  const [topCities, setTopCities] = useState<{ kabupaten_kota: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ count: total }, { data: results }] = await Promise.all([
        supabase.from("foodintel_results").select("*", { count: "exact", head: true }),
        supabase.from("foodintel_results").select("user_id, kabupaten_kota, created_at"),
      ]);

      const data = results || [];
      const today = new Date().toISOString().slice(0, 10);
      const todayCount = data.filter((r) => r.created_at?.slice(0, 10) === today).length;
      const uniqueUsers = new Set(data.map((r) => r.user_id)).size;
      const uniqueKab = new Set(data.map((r) => r.kabupaten_kota)).size;

      setStats({ total: total || 0, uniqueUsers, uniqueKab, today: todayCount });

      // Top cities
      const cityCount: Record<string, number> = {};
      data.forEach((r) => { cityCount[r.kabupaten_kota] = (cityCount[r.kabupaten_kota] || 0) + 1; });
      const sorted = Object.entries(cityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([kabupaten_kota, count]) => ({ kabupaten_kota, count }));
      setTopCities(sorted);

      setLoading(false);
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Analisis", value: stats.total, icon: BarChart3, color: "text-indigo-400" },
    { label: "User Unik", value: stats.uniqueUsers, icon: Users, color: "text-green-400" },
    { label: "Kab/Kota Dianalisis", value: `${stats.uniqueKab}/514`, icon: MapPin, color: "text-amber-400" },
    { label: "Analisis Hari Ini", value: stats.today, icon: TrendingUp, color: "text-blue-400" },
  ];

  if (loading) return <div className="p-6 space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6" /> FoodIntel Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-3xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Top 10 Kab/Kota Paling Sering Dianalisis</h2>
        </div>
        {topCities.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Belum ada data</div>
        ) : (
          <div className="divide-y">
            {topCities.map((c, i) => (
              <div key={c.kabupaten_kota} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <span className="font-medium text-sm">{c.kabupaten_kota}</span>
                </div>
                <span className="text-sm text-muted-foreground">{c.count} analisis</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFoodIntelDashboard;
