import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AnalysisRow {
  id: string;
  created_at: string;
  kabupaten_kota: string;
  credits_used: number;
  analysis_data: any;
  user_id: string;
  user_name?: string;
}

const AdminFoodIntelAnalyses = () => {
  const [rows, setRows] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("foodintel_results")
        .select("id, created_at, kabupaten_kota, credits_used, analysis_data, user_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data || data.length === 0) { setRows([]); setLoading(false); return; }

      // Fetch profile names separately
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const nameMap = new Map<string, string>();
      profiles?.forEach((p) => nameMap.set(p.id, p.full_name));

      setRows(data.map((d) => ({ ...d, user_name: nameMap.get(d.user_id) || "-" })) as any);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = search
    ? rows.filter((r) =>
        r.kabupaten_kota.toLowerCase().includes(search.toLowerCase()) ||
        r.user_name?.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📋 Log Analisis FoodIntel</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari user atau kota..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border bg-card overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Kab/Kota</TableHead>
              <TableHead>Kredit</TableHead>
              <TableHead>Top Komoditas</TableHead>
              <TableHead>Index</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Memuat...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data</TableCell></TableRow>
            ) : (
              filtered.map((r) => {
                const topKelompok = r.analysis_data?.ranking?.[0]?.kelompok_label || "-";
                const topIndex = r.analysis_data?.ranking?.[0]?.index_vs_nasional || 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="text-sm">{r.user_name || "-"}</TableCell>
                    <TableCell className="font-medium text-sm">{r.kabupaten_kota}</TableCell>
                    <TableCell>{r.credits_used}</TableCell>
                    <TableCell className="text-sm">{topKelompok}</TableCell>
                    <TableCell className="text-sm font-medium">{topIndex}%</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminFoodIntelAnalyses;
