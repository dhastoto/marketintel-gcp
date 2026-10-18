import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { detectProduct } from "@/lib/directory-bps-detector";
import { PROVINCES, CITIES_BY_PROVINCE } from "@/lib/constants";
import {
  Search, Lock, Download, Users, Home, TrendingUp,
  MapPin, Phone, Globe, Star, CheckCircle, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DirectoryRow {
  id: number;
  place_id: string;
  nama: string | null;
  alamat: string | null;
  provinsi: string | null;
  kabkota: string | null;
  keyword: string | null;
  lat: number | null;
  lng: number | null;
  telepon: string | null;
  website: string | null;
  rating: number | null;
  total_review: number | null;
  status: string | null;
}

interface MarketData {
  totalPop: number;
  totalHH: number;
  bpsSpending: { kabupaten_kota: string; value_amount: number }[];
  kecamatan: { district: string; pop: number; hh: number }[];
  kelompokLabel: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripPrefix(name: string) {
  return name.replace(/^Kab\.\s*/i, "").replace(/^Kota\s+/i, "").replace(/^Adm\.\s*/i, "").trim();
}

const fmtNum = (n: number) => n.toLocaleString("id-ID");
const fmtRp = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

function exportCSV(rows: DirectoryRow[]) {
  const header = ["Nama", "Alamat", "Provinsi", "Kab/Kota", "Keyword", "Telepon", "Website", "Rating", "Review", "Status", "Place ID"];
  const lines = [header, ...rows.map((r) =>
    [r.nama, r.alamat, r.provinsi, r.kabkota, r.keyword, r.telepon, r.website, r.rating, r.total_review, r.status, r.place_id]
  )].map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","));
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `directory_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const MOCK_ROWS: Partial<DirectoryRow>[] = [
  { nama: "Toko Sejahtera", alamat: "Jl. Merdeka No. 12", telepon: "0812-xxxx-xxxx", rating: 4.2, total_review: 87, status: "OPERATIONAL" },
  { nama: "Warung Berkah", alamat: "Gg. Mawar No. 5", telepon: "0813-xxxx-xxxx", rating: 3.9, total_review: 34, status: "OPERATIONAL" },
  { nama: "UD Makmur Jaya", alamat: "Jl. Sudirman No. 88", telepon: "0821-xxxx-xxxx", rating: 4.5, total_review: 213, status: "OPERATIONAL" },
  { nama: "Toko Ceria", alamat: "Jl. Ahmad Yani No. 7", telepon: "0857-xxxx-xxxx", rating: 4.0, total_review: 56, status: "OPERATIONAL" },
  { nama: "Mini Market 24 Jam", alamat: "Komplek Ruko Blok B-3", telepon: "0878-xxxx-xxxx", rating: 4.3, total_review: 142, status: "OPERATIONAL" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DirectorySearch() {
  const { user } = useAuth();

  // Form state
  const [product, setProduct] = useState("");
  const [province, setProvince] = useState("");
  const [selectedKabkota, setSelectedKabkota] = useState<string[]>([]);
  const [keywordsRaw, setKeywordsRaw] = useState("");

  // Detection
  const detection = detectProduct(product);

  // Results state
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);

  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [searchingDir, setSearchingDir] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, msg: "" });
  const [directoryRows, setDirectoryRows] = useState<DirectoryRow[]>([]);
  const stoppedRef = useRef(false);

  // Derived
  const kabkotaList = province ? (CITIES_BY_PROVINCE[province] || []) : [];
  const parsedKeywords = keywordsRaw.split("\n").map((s) => s.trim()).filter(Boolean);

  // Check paid access on mount / user change
  // GCP demo build: user_purchases / payment gating is intentionally out of
  // scope (see README) — every signed-in user gets full Directory Search
  // access instead of silently falling back to locked when that table
  // isn't found.
  useEffect(() => {
    if (!user) return;
    setHasPaidAccess(true);
  }, [user]);

  // Reset kabkota when province changes
  useEffect(() => { setSelectedKabkota([]); }, [province]);

  function toggleKabkota(name: string) {
    setSelectedKabkota((prev) =>
      prev.includes(name) ? prev.filter((k) => k !== name) : [...prev, name]
    );
  }

  // ─── Fetch market + BPS + kecamatan data ─────────────────────────────────

  async function fetchMarketData() {
    if (!selectedKabkota.length) return;
    setLoadingMarket(true);

    try {
      // 1. Population aggregates (city level)
      const { data: popData } = await supabase
        .from("population_data")
        .select("total_population, household_count")
        .in("city", selectedKabkota);

      const totalPop = (popData ?? []).reduce((s, r) => s + (Number(r.total_population) || 0), 0);
      const totalHH = (popData ?? []).reduce((s, r) => s + (Number(r.household_count) || 0), 0);

      // 2. BPS spending (food only)
      let bpsSpending: { kabupaten_kota: string; value_amount: number }[] = [];
      if (detection.isFood && detection.kelompok) {
        const { data: bpsData } = await supabase
          .from("bps_food_data")
          .select("kabupaten_kota, value_amount")
          .in("kabupaten_kota", selectedKabkota)
          .eq("kelompok", detection.kelompok)
          .eq("is_total", true)
          .eq("metric_type", "pengeluaran");
        bpsSpending = (bpsData ?? []).map((r) => ({ kabupaten_kota: r.kabupaten_kota, value_amount: Number(r.value_amount) }));
      }

      // 3. Kecamatan population ranking
      const { data: kecData } = await supabase
        .from("population_data")
        .select("district, total_population, household_count")
        .in("city", selectedKabkota)
        .not("district", "is", null)
        .neq("district", "");

      const kecMap = new Map<string, { pop: number; hh: number }>();
      for (const r of kecData ?? []) {
        const key = r.district as string;
        const cur = kecMap.get(key) ?? { pop: 0, hh: 0 };
        kecMap.set(key, {
          pop: cur.pop + (Number(r.total_population) || 0),
          hh: cur.hh + (Number(r.household_count) || 0),
        });
      }
      const kecamatan = Array.from(kecMap.entries())
        .map(([district, v]) => ({ district, pop: v.pop, hh: v.hh }))
        .sort((a, b) => b.pop - a.pop)
        .slice(0, 30);

      setMarketData({ totalPop, totalHH, bpsSpending, kecamatan, kelompokLabel: detection.kelompokLabel });
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data pasar");
    } finally {
      setLoadingMarket(false);
    }
  }

  // ─── Directory Search (paid) ──────────────────────────────────────────────

  async function runDirectorySearch() {
    if (!selectedKabkota.length || !parsedKeywords.length) return;
    stoppedRef.current = false;
    setSearchingDir(true);
    setDirectoryRows([]);

    const combos = selectedKabkota.flatMap((kab) =>
      parsedKeywords.map((kw) => ({ kab, kw }))
    );
    setProgress({ done: 0, total: combos.length, msg: "" });

    for (let i = 0; i < combos.length; i++) {
      if (stoppedRef.current) break;
      const { kab, kw } = combos[i];
      const textQuery = `${kw} ${stripPrefix(kab)}`;
      setProgress({ done: i, total: combos.length, msg: `[${kab} × ${kw}]…` });

      try {
        const { data, error } = await supabase.functions.invoke("directory-search", {
          body: { textQuery, kabkota: kab, provinsi: province, keyword: kw },
        });
        if (error) throw error;
        const src = data?.fromCache ? "cache" : `${data?.saved ?? 0} baru`;
        setProgress({ done: i + 1, total: combos.length, msg: `${kab} × ${kw} — ${data?.found ?? data?.count ?? 0} toko (${src})` });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setProgress((p) => ({ ...p, msg: `ERROR: ${msg}` }));
      }
    }

    // Fetch all results from DB
    const { data: rows } = await supabase
      .from("directory_results")
      .select("*")
      .in("kabkota", selectedKabkota)
      .in("keyword", parsedKeywords)
      .order("rating", { ascending: false })
      .limit(1000);

    // Dedup by place_id (keep highest-rated)
    const seen = new Map<string, DirectoryRow>();
    for (const r of rows ?? []) {
      const ex = seen.get(r.place_id);
      if (!ex || (r.rating ?? 0) > (ex.rating ?? 0)) seen.set(r.place_id, r as DirectoryRow);
    }
    setDirectoryRows(Array.from(seen.values()));
    setSearchingDir(false);
    setProgress((p) => ({ ...p, msg: `Selesai — ${seen.size} toko unik ditemukan` }));
  }

  // ─── Main action ──────────────────────────────────────────────────────────

  async function handleStart() {
    if (!product.trim()) { toast.error("Isi nama produk terlebih dahulu"); return; }
    if (!selectedKabkota.length) { toast.error("Pilih minimal satu kabupaten/kota"); return; }
    if (hasPaidAccess && !parsedKeywords.length) { toast.error("Isi minimal satu keyword pencarian"); return; }

    setHasSearched(true);
    await fetchMarketData();
    if (hasPaidAccess) await runDirectorySearch();
  }

  // ─── UI ───────────────────────────────────────────────────────────────────

  const avgSpending = marketData?.bpsSpending.length
    ? marketData.bpsSpending.reduce((s, r) => s + r.value_amount, 0) / marketData.bpsSpending.length
    : null;
  const tamEstimate = avgSpending && marketData ? avgSpending * marketData.totalPop : null;

  return (
    <div className="flex gap-4 items-start">
      {/* ── Left panel: Form ── */}
      <aside className="w-72 shrink-0 flex flex-col gap-4 sticky top-0 rounded-xl border border-border bg-card p-4">
        <div>
          <h1 className="text-lg font-bold">Directory Search</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Temukan outlet, toko, & warung per wilayah</p>
        </div>

        {/* Product */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produk</label>
          <Input
            placeholder="frozen food, bumbu instan, ayam goreng…"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
          />
          {product.trim() && (
            <div className="flex items-center gap-1.5 mt-1">
              {detection.isFood ? (
                <Badge variant="secondary" className="text-xs gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Makanan — {detection.kelompokLabel}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  Non-Makanan
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Province */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provinsi</label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Pilih provinsi" /></SelectTrigger>
            <SelectContent>
              {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Kabkota multi-select */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Kabupaten / Kota
            </label>
            {kabkotaList.length > 0 && (
              <div className="flex gap-1">
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setSelectedKabkota([...kabkotaList])}
                >Semua</button>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => setSelectedKabkota([])}
                >Hapus</button>
              </div>
            )}
          </div>
          <ScrollArea className="h-44 rounded-md border border-border p-2">
            {!province ? (
              <p className="text-xs text-muted-foreground text-center py-6">Pilih provinsi dulu</p>
            ) : kabkotaList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Tidak ada data</p>
            ) : (
              kabkotaList.map((kab) => (
                <label key={kab} className="flex items-center gap-2 py-1 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedKabkota.includes(kab)}
                    onChange={() => toggleKabkota(kab)}
                    className="rounded"
                  />
                  <span className="text-xs group-hover:text-foreground text-muted-foreground">{kab}</span>
                </label>
              ))
            )}
          </ScrollArea>
          {selectedKabkota.length > 0 && (
            <p className="text-xs text-muted-foreground">{selectedKabkota.length} dipilih</p>
          )}
        </div>

        {/* Keywords (paid only) */}
        {hasPaidAccess && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Keyword Pencarian
              <span className="ml-1 text-muted-foreground font-normal normal-case">(satu baris = satu keyword)</span>
            </label>
            <Textarea
              placeholder={"frozen food\nminimarket\ntoko sembako"}
              value={keywordsRaw}
              onChange={(e) => setKeywordsRaw(e.target.value)}
              className="text-sm min-h-[90px] resize-none"
            />
          </div>
        )}

        <Button
          className="gradient-amber text-accent-foreground border-0 hover:opacity-90 w-full"
          onClick={handleStart}
          disabled={loadingMarket || searchingDir}
        >
          <Search className="mr-2 h-4 w-4" />
          {loadingMarket || searchingDir ? "Mencari…" : "Mulai Cari"}
        </Button>

        {searchingDir && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => { stoppedRef.current = true; }}>
            Hentikan Pencarian
          </Button>
        )}
      </aside>

      {/* ── Right panel: Results ── */}
      <main className="flex-1 min-w-0 space-y-4">
        {!hasSearched ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-sm">
              <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h2 className="text-lg font-semibold mb-1">Directory Search</h2>
              <p className="text-sm text-muted-foreground">
                Isi form di sebelah kiri lalu klik <strong>Mulai Cari</strong> untuk melihat potensi pasar
                dan direktori outlet di wilayah pilihan Anda.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Market Size ── */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> Market Size
              </h2>
              {loadingMarket ? (
                <p className="text-sm text-muted-foreground">Memuat data populasi…</p>
              ) : marketData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Total Penduduk" value={fmtNum(marketData.totalPop)} sub="jiwa" />
                  <StatCard label="Rumah Tangga" value={fmtNum(marketData.totalHH)} sub="KK" />
                  {tamEstimate !== null && (
                    <StatCard label="Est. TAM / Tahun" value={fmtRp(tamEstimate)} sub={`kelompok ${marketData.kelompokLabel}`} wide />
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Data tidak tersedia untuk wilayah ini.</p>
              )}
            </section>

            {/* ── BPS Spending (food only) ── */}
            {detection.isFood && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Pengeluaran per Kapita — {detection.kelompokLabel}
                  <Badge variant="secondary" className="text-xs">BPS Susenas</Badge>
                </h2>
                {loadingMarket ? (
                  <p className="text-sm text-muted-foreground">Memuat…</p>
                ) : marketData?.bpsSpending.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">Kabupaten/Kota</th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium">Pengeluaran / Kapita / Bulan</th>
                          <th className="text-right py-1.5 text-muted-foreground font-medium pl-4">Est. Pasar / Bulan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketData.bpsSpending.sort((a, b) => b.value_amount - a.value_amount).map((r) => {
                          const pop = marketData.kecamatan.reduce((s, k) => s + k.pop, 0) || marketData.totalPop;
                          const perKota = pop > 0 ? r.value_amount * pop : null;
                          return (
                            <tr key={r.kabupaten_kota} className="border-b border-border/50">
                              <td className="py-1.5 pr-4">{r.kabupaten_kota}</td>
                              <td className="py-1.5 text-right font-mono">{fmtRp(r.value_amount)}</td>
                              <td className="py-1.5 text-right font-mono pl-4 text-muted-foreground">
                                {perKota !== null ? fmtRp(perKota) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-2">
                      * Pengeluaran per kapita per bulan dari data BPS Susenas. Est. pasar = pengeluaran × total penduduk wilayah.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Data BPS tidak ditemukan untuk kelompok {detection.kelompokLabel} di wilayah ini.</p>
                )}
              </section>
            )}

            {/* ── Potensi per Kecamatan ── */}
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Home className="h-4 w-4 text-purple-500" /> Potensi per Kecamatan
                <Badge variant="secondary" className="text-xs">Populasi</Badge>
              </h2>
              {loadingMarket ? (
                <p className="text-sm text-muted-foreground">Memuat…</p>
              ) : marketData?.kecamatan.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 pr-2 text-muted-foreground font-medium">#</th>
                        <th className="text-left py-1.5 pr-4 text-muted-foreground font-medium">Kecamatan</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium">Penduduk</th>
                        <th className="text-right py-1.5 pl-4 text-muted-foreground font-medium">KK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.kecamatan.map((k, i) => (
                        <tr key={k.district} className="border-b border-border/50">
                          <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-1 pr-4">{k.district}</td>
                          <td className="py-1 text-right font-mono">{fmtNum(k.pop)}</td>
                          <td className="py-1 text-right font-mono pl-4 text-muted-foreground">{fmtNum(k.hh)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Data kecamatan tidak tersedia untuk wilayah ini.</p>
              )}
            </section>

            {/* ── Direktori Toko ── */}
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-orange-500" />
                  Direktori Toko / Outlet
                  {directoryRows.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{directoryRows.length} toko</Badge>
                  )}
                </h2>
                {hasPaidAccess && directoryRows.length > 0 && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => exportCSV(directoryRows)}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                )}
              </div>

              {/* Progress bar (during search) */}
              {searchingDir && (
                <div className="mb-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.msg}</span>
                    <span>{progress.done}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              )}

              {hasPaidAccess ? (
                directoryRows.length > 0 ? (
                  <DirectoryTable rows={directoryRows} />
                ) : !searchingDir ? (
                  <p className="text-xs text-muted-foreground">
                    {parsedKeywords.length === 0
                      ? "Isi keyword pencarian di panel kiri lalu klik Mulai Cari lagi."
                      : "Tidak ada hasil. Coba keyword yang lebih umum."}
                  </p>
                ) : null
              ) : (
                <LockedDirectorySection kabkota={selectedKabkota} />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, wide }: { label: string; value: string; sub: string; wide?: boolean }) {
  return (
    <div className={`rounded-lg border border-border bg-muted/30 p-3 ${wide ? "col-span-2" : ""}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground truncate">{sub}</p>
    </div>
  );
}

function DirectoryTable({ rows }: { rows: DirectoryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {["Nama", "Alamat", "Kab/Kota", "Telepon", "Rating", "Review", "Status"].map((h) => (
              <th key={h} className="text-left py-1.5 pr-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.place_id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-1.5 pr-3 max-w-[160px] truncate font-medium">{r.nama ?? "—"}</td>
              <td className="py-1.5 pr-3 max-w-[200px] truncate text-muted-foreground">{r.alamat ?? "—"}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">{r.kabkota ?? "—"}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">
                {r.telepon ? (
                  <a href={`tel:${r.telepon}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                    <Phone className="h-3 w-3" />{r.telepon}
                  </a>
                ) : "—"}
              </td>
              <td className="py-1.5 pr-3 whitespace-nowrap">
                {r.rating ? (
                  <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-400 fill-amber-400" />{r.rating}</span>
                ) : "—"}
              </td>
              <td className="py-1.5 pr-3">{r.total_review ?? "—"}</td>
              <td className="py-1.5">
                <Badge variant={r.status === "OPERATIONAL" ? "default" : "outline"} className="text-xs">
                  {r.status === "OPERATIONAL" ? "Buka" : r.status ?? "—"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.some((r) => r.website) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {rows.filter((r) => r.website).slice(0, 5).map((r) => (
            <a key={r.place_id} href={r.website!} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Globe className="h-3 w-3" />{r.nama}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function LockedDirectorySection({ kabkota }: { kabkota: string[] }) {
  return (
    <div className="relative">
      {/* Mock preview (blurred) */}
      <div className="overflow-x-auto blur-sm pointer-events-none select-none">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {["Nama", "Alamat", "Kab/Kota", "Telepon", "Rating", "Status"].map((h) => (
                <th key={h} className="text-left py-1.5 pr-3 text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_ROWS.map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 pr-3 font-medium">{r.nama}</td>
                <td className="py-1.5 pr-3 text-muted-foreground max-w-[180px] truncate">{r.alamat}</td>
                <td className="py-1.5 pr-3">{kabkota[0] ?? "—"}</td>
                <td className="py-1.5 pr-3">{r.telepon}</td>
                <td className="py-1.5 pr-3 flex items-center gap-0.5">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />{r.rating}
                </td>
                <td className="py-1.5"><Badge className="text-xs">Buka</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
        <div className="text-center p-6 max-w-xs">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-semibold mb-1">Data Direktori Terkunci</p>
          <p className="text-xs text-muted-foreground mb-4">
            Beli paket Directory Search untuk melihat data nyata nama, alamat, & telepon {kabkota.length > 0 ? `outlet di ${kabkota.length} wilayah` : "outlet"}.
          </p>
          <Button size="sm" className="gradient-amber text-accent-foreground border-0" asChild>
            <a href="/harga">Lihat Paket →</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
