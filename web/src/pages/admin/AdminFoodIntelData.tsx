import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Database, Lightbulb, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PAGE_SIZE = 50;

const AdminFoodIntelData = () => {
  const [bpsStats, setBpsStats] = useState({ total: 0, kabCount: 0, year: 2025 });
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchIdea, setSearchIdea] = useState("");

  // BPS data browser state
  const [bpsData, setBpsData] = useState<any[]>([]);
  const [bpsLoading, setBpsLoading] = useState(false);
  const [bpsSearch, setBpsSearch] = useState("");
  const [bpsKabFilter, setBpsKabFilter] = useState("all");
  const [bpsKelompokFilter, setBpsKelompokFilter] = useState("all");
  const [bpsMetricFilter, setBpsMetricFilter] = useState("all");
  const [bpsPage, setBpsPage] = useState(0);
  const [bpsTotalCount, setBpsTotalCount] = useState(0);
  const [kabList, setKabList] = useState<string[]>([]);
  const [kelompokList, setKelompokList] = useState<string[]>([]);
  const [metricList, setMetricList] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ count: total }, { data: ideasData }, { data: kabData }, { data: kelData }, { data: metData }] = await Promise.all([
          supabase.from("bps_food_data").select("*", { count: "exact", head: true }),
          supabase.from("food_business_ideas").select("*").order("kelompok"),
          supabase.rpc("bps_distinct_values", { col_name: "kabupaten_kota" }),
          supabase.rpc("bps_distinct_values", { col_name: "kelompok" }),
          supabase.rpc("bps_distinct_values", { col_name: "metric_type" }),
        ]);

        // RPC returns text[] — ensure we handle it correctly
        const toArr = (d: any): string[] => {
          if (Array.isArray(d)) return d;
          if (typeof d === 'string') {
            // Postgres array literal: {a,b,c}
            const m = d.match(/^\{(.+)\}$/);
            if (m) return m[1].split(',').map(s => s.trim());
          }
          return [];
        };

        const kabArr = toArr(kabData);
        const kelArr = toArr(kelData);
        const metArr = toArr(metData);

        console.log("BPS distinct values loaded:", { kab: kabArr.length, kel: kelArr.length, met: metArr.length });

        setBpsStats({ total: total || 0, kabCount: kabArr.length, year: 2025 });
        setKabList(kabArr);
        setKelompokList(kelArr);
        setMetricList(metArr);
        setIdeas(ideasData || []);
      } catch (err) {
        console.error("Failed to load BPS data:", err);
        toast.error("Gagal memuat data BPS");
      }
      setLoading(false);
    };
    load();
  }, []);

  const fetchBpsData = useCallback(async () => {
    setBpsLoading(true);
    let query = supabase.from("bps_food_data").select("*", { count: "exact" });

    if (bpsKabFilter !== "all") query = query.eq("kabupaten_kota", bpsKabFilter);
    if (bpsKelompokFilter !== "all") query = query.eq("kelompok", bpsKelompokFilter);
    if (bpsMetricFilter !== "all") query = query.eq("metric_type", bpsMetricFilter);
    if (bpsSearch.trim()) query = query.ilike("sub_komoditas", `%${bpsSearch.trim()}%`);

    query = query.order("kabupaten_kota").order("kelompok").order("sub_komoditas");
    query = query.range(bpsPage * PAGE_SIZE, (bpsPage + 1) * PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      toast.error("Gagal memuat data BPS");
      setBpsLoading(false);
      return;
    }
    setBpsData(data || []);
    setBpsTotalCount(count || 0);
    setBpsLoading(false);
  }, [bpsKabFilter, bpsKelompokFilter, bpsMetricFilter, bpsSearch, bpsPage]);

  useEffect(() => {
    if (!loading) fetchBpsData();
  }, [fetchBpsData, loading]);

  // Reset page when filters change
  useEffect(() => { setBpsPage(0); }, [bpsKabFilter, bpsKelompokFilter, bpsMetricFilter, bpsSearch]);

  const totalPages = Math.ceil(bpsTotalCount / PAGE_SIZE);

  const filteredIdeas = searchIdea
    ? ideas.filter((i) =>
        i.sub_komoditas.toLowerCase().includes(searchIdea.toLowerCase()) ||
        i.kelompok.toLowerCase().includes(searchIdea.toLowerCase())
      )
    : ideas;

  const handleDeleteIdea = async (id: number) => {
    const { error } = await supabase.from("food_business_ideas").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus");
      return;
    }
    setIdeas((prev) => prev.filter((i) => i.id !== id));
    toast.success("Ide bisnis dihapus");
  };

  if (loading) return <div className="p-6"><div className="h-40 animate-pulse rounded-lg bg-muted" /></div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">📊 Kelola Data FoodIntel</h1>

      {/* Section A: BPS Data Stats */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Database className="h-4 w-4" /> Data BPS Susenas — Ringkasan
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Tahun Data</div>
            <div className="text-2xl font-bold">{bpsStats.year}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Jumlah Record</div>
            <div className="text-2xl font-bold">{bpsStats.total.toLocaleString("id-ID")}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Kab/Kota</div>
            <div className="text-2xl font-bold">{bpsStats.kabCount}</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Data diimport dari CSV BPS Susenas. Update via import CSV baru di database.
        </p>
      </div>

      {/* Section A2: BPS Data Browser */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" /> Cari & Cek Data BPS ({bpsTotalCount.toLocaleString("id-ID")} record)
          </h2>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari sub komoditas..."
                value={bpsSearch}
                onChange={(e) => setBpsSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={bpsKabFilter} onValueChange={setBpsKabFilter}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Semua Kab/Kota" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">Semua Kab/Kota</SelectItem>
                {kabList.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bpsKelompokFilter} onValueChange={setBpsKelompokFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Semua Kelompok" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">Semua Kelompok</SelectItem>
                {kelompokList.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bpsMetricFilter} onValueChange={setBpsMetricFilter}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Semua Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Metric</SelectItem>
                {metricList.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-auto max-h-[500px]">
          {bpsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
          ) : bpsData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Tidak ada data ditemukan</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Kab/Kota</TableHead>
                  <TableHead className="text-xs">Kelompok</TableHead>
                  <TableHead className="text-xs">Sub Komoditas</TableHead>
                  <TableHead className="text-xs">Metric</TableHead>
                  <TableHead className="text-xs text-right">Nilai</TableHead>
                  <TableHead className="text-xs">Total?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bpsData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{row.kabupaten_kota}</TableCell>
                    <TableCell className="text-xs">{row.kelompok}</TableCell>
                    <TableCell className="text-xs font-medium">{row.sub_komoditas}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{row.metric_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {Number(row.value_amount).toLocaleString("id-ID", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.is_total ? <Badge className="text-[10px] bg-amber-500/20 text-amber-700">Total</Badge> : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">
              Halaman {bpsPage + 1} dari {totalPages}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bpsPage === 0} onClick={() => setBpsPage((p) => p - 1)}>
                <ChevronLeft className="h-3 w-3 mr-1" /> Prev
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={bpsPage >= totalPages - 1} onClick={() => setBpsPage((p) => p + 1)}>
                Next <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Section B: Ide Bisnis CRUD */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4" /> Ide Bisnis ({ideas.length})
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari..." value={searchIdea} onChange={(e) => setSearchIdea(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Kelompok</TableHead>
                <TableHead>Sub Komoditas</TableHead>
                <TableHead>Ide Bisnis</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIdeas.map((idea) => (
                <TableRow key={idea.id}>
                  <TableCell className="text-xl">{idea.icon}</TableCell>
                  <TableCell className="text-sm">{idea.kelompok}</TableCell>
                  <TableCell className="text-sm font-medium">{idea.sub_komoditas}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(idea.business_ideas || []).map((b: string) => (
                        <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{idea.business_category}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => handleDeleteIdea(idea.id)}>
                      Hapus
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminFoodIntelData;
