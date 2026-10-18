import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getFeatures } from "@/lib/feature-gate";
import { UpgradeTeaser } from "@/components/UpgradeTeaser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Scale, PlusCircle, Trophy } from "lucide-react";
import { toast } from "sonner";

interface CompareItem {
  project_id: string;
  project_name: string;
  district: string;
  city: string;
  product_name: string;
  product_category: string;
  market_score: number | null;
  decision: string | null;
  decision_reason: string | null;
  insight_summary: string | null;
  omzet_konservatif: number | null;
  omzet_moderat: number | null;
  omzet_optimistis: number | null;
  estimated_daily_customers: number | null;
  bep_days: number | null;
  recommended_price_min: number | null;
  recommended_price_max: number | null;
  population_score: number | null;
  traffic_score: number | null;
  income_score: number | null;
  competitor_gap_score: number | null;
  density_score: number | null;
  expenditure_level: string | null;
  estimated_monthly_revenue: number | null;
  estimated_monthly_profit: number | null;
}

const fmtRpShort = (n: number | null | undefined) => {
  if (n == null) return "-";
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)} jt`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)} rb`;
  return `Rp ${n}`;
};

const CompareLocations = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const userPlan = profile?.plan || "free";
  const features = getFeatures(userPlan);
  const maxCompare = features.comparison_max;

  const [items, setItems] = useState<CompareItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompleted = async () => {
      // Get completed projects with their economic + decision data
      const { data: projects } = await supabase
        .from("projects")
        .select("id, project_name, status")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!projects || projects.length === 0) {
        setLoading(false);
        return;
      }

      const projectIds = projects.map((p) => p.id);

      const [{ data: inputs }, { data: decisions }, { data: economics }] = await Promise.all([
        supabase.from("business_inputs").select("project_id, product_name, product_category, city, districts").in("project_id", projectIds),
        supabase.from("decision_results").select("*").in("project_id", projectIds),
        supabase.from("economic_results").select("*").in("project_id", projectIds),
      ]);

      const result: CompareItem[] = [];
      for (const proj of projects) {
        const input = (inputs || []).find((i) => i.project_id === proj.id);
        const dec = (decisions || []).find((d) => d.project_id === proj.id);
        const eco = (economics || []).find((e) => e.project_id === proj.id);
        if (!input || !dec) continue;

        const districts = input.districts || [];
        // One entry per project (first district as label)
        result.push({
          project_id: proj.id,
          project_name: proj.project_name,
          district: dec.district || districts[0] || "-",
          city: input.city || "-",
          product_name: input.product_name || "-",
          product_category: input.product_category || "-",
          market_score: dec.market_score ? Number(dec.market_score) : null,
          decision: dec.decision,
          decision_reason: dec.decision_reason,
          insight_summary: dec.insight_summary,
          omzet_konservatif: eco?.omzet_konservatif ? Number(eco.omzet_konservatif) : null,
          omzet_moderat: eco?.omzet_moderat ? Number(eco.omzet_moderat) : null,
          omzet_optimistis: eco?.omzet_optimistis ? Number(eco.omzet_optimistis) : null,
          estimated_daily_customers: eco?.estimated_daily_customers ? Number(eco.estimated_daily_customers) : null,
          bep_days: eco?.bep_days ? Number(eco.bep_days) : null,
          recommended_price_min: eco?.recommended_price_min ? Number(eco.recommended_price_min) : null,
          recommended_price_max: eco?.recommended_price_max ? Number(eco.recommended_price_max) : null,
          population_score: dec.population_score ? Number(dec.population_score) : null,
          traffic_score: dec.traffic_score ? Number(dec.traffic_score) : null,
          income_score: dec.income_score ? Number(dec.income_score) : null,
          competitor_gap_score: dec.competitor_gap_score ? Number(dec.competitor_gap_score) : null,
          density_score: dec.density_score ? Number(dec.density_score) : null,
          expenditure_level: eco?.expenditure_level || null,
          estimated_monthly_revenue: eco?.estimated_monthly_revenue ? Number(eco.estimated_monthly_revenue) : null,
          estimated_monthly_profit: eco?.estimated_monthly_profit ? Number(eco.estimated_monthly_profit) : null,
        });
      }

      setItems(result);

      // Pre-select from URL param
      const preSelected = searchParams.get("selected");
      if (preSelected && result.some((r) => r.project_id === preSelected)) {
        setSelectedIds([preSelected]);
      }

      setLoading(false);
    };
    fetchCompleted();
  }, [searchParams]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else {
      if (selectedIds.length >= maxCompare) {
        toast.info(`Maksimal ${maxCompare} lokasi untuk paket Anda`);
        return;
      }
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const comparisonData = useMemo(() => {
    if (!comparing) return [];
    return items
      .filter((i) => selectedIds.includes(i.project_id))
      .sort((a, b) => (b.market_score || 0) - (a.market_score || 0));
  }, [comparing, selectedIds, items]);

  const decisionBadge = (d: string | null) => {
    if (d === "GO") return <Badge className="bg-green-500 text-white">GO</Badge>;
    if (d === "CONDITIONAL") return <Badge className="bg-amber-500 text-white">CONDITIONAL</Badge>;
    return <Badge className="bg-red-500 text-white">NO</Badge>;
  };

  const planLabel = userPlan === "business" ? "Pro" : userPlan === "pro" ? "Growth" : "Basic";

  // Gating: comparison_max = 0
  if (maxCompare === 0) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Scale className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold mb-2">Bandingkan Lokasi</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            Bandingkan beberapa lokasi side-by-side untuk menemukan lokasi terbaik untuk bisnis Anda.
          </p>
          <UpgradeTeaser message="Fitur perbandingan lokasi tersedia mulai paket Growth" targetPlan="pro" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="animate-fade-in-up space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Scale className="mb-4 h-12 w-12 text-muted-foreground/30" />
          <h1 className="text-2xl font-bold mb-2">Bandingkan Lokasi</h1>
          <p className="text-muted-foreground mb-6">
            Anda perlu minimal 2 analisis yang sudah selesai untuk menggunakan fitur perbandingan.
          </p>
          <Button onClick={() => navigate("/app/analysis/new")} className="gradient-amber border-0 text-accent-foreground">
            <PlusCircle className="mr-1.5 h-4 w-4" /> Buat Analisis Baru
          </Button>
        </div>
      </div>
    );
  }

  const metrics: { label: string; key: keyof CompareItem; format: (v: any, item: CompareItem) => string; higherBetter: boolean }[] = [
    { label: "Market Score", key: "market_score", format: (v) => v != null ? `${Number(v).toFixed(1)}/10` : "-", higherBetter: true },
    { label: "Keputusan", key: "decision", format: (v) => v || "-", higherBetter: true },
    { label: "Omzet Moderat", key: "omzet_moderat", format: (v) => fmtRpShort(v), higherBetter: true },
    { label: "Customer/Hari", key: "estimated_daily_customers", format: (v) => v != null ? `${v} orang` : "-", higherBetter: true },
    { label: "BEP", key: "bep_days", format: (v) => v != null ? (v < 30 ? `${v} hari` : `${(v / 30).toFixed(1)} bulan`) : "-", higherBetter: false },
    { label: "Harga Rekomendasi", key: "recommended_price_min", format: (_, item) => item.recommended_price_min && item.recommended_price_max ? `Rp ${(item.recommended_price_min / 1000).toFixed(0)}K - ${(item.recommended_price_max / 1000).toFixed(0)}K` : "-", higherBetter: true },
    { label: "Daya Beli", key: "expenditure_level", format: (v) => v === "high" ? "🟢 Tinggi" : v === "middle" ? "🟡 Menengah" : v === "low" ? "🔴 Rendah" : "-", higherBetter: true },
    { label: "Populasi Score", key: "population_score", format: (v) => v != null ? `${Number(v).toFixed(1)}/10` : "-", higherBetter: true },
    { label: "Traffic Score", key: "traffic_score", format: (v) => v != null ? `${Number(v).toFixed(1)}/10` : "-", higherBetter: true },
    { label: "Daya Beli Score", key: "income_score", format: (v) => v != null ? `${Number(v).toFixed(1)}/10` : "-", higherBetter: true },
    { label: "Celah Kompetitor", key: "competitor_gap_score", format: (v) => v != null ? `${Number(v).toFixed(1)}/10` : "-", higherBetter: true },
  ];

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="animate-fade-in-up space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Button>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6" /> Bandingkan Lokasi
        </h1>
        <p className="text-sm text-muted-foreground">Pilih analisis yang ingin dibandingkan</p>
      </div>

      {/* Selector */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.project_id);
            const isDisabled = !isSelected && selectedIds.length >= maxCompare;
            return (
              <div
                key={item.project_id}
                onClick={() => !isDisabled && toggleSelect(item.project_id)}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : isDisabled
                    ? "opacity-50 cursor-not-allowed border-border"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Checkbox checked={isSelected} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.district}, {item.city}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.market_score != null && (
                      <span className="text-xs font-bold">{Number(item.market_score).toFixed(1)}/10</span>
                    )}
                    {item.decision && decisionBadge(item.decision)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Dipilih: {selectedIds.length} dari maks {maxCompare} ({planLabel})
          </p>
          <Button
            disabled={selectedIds.length < 2}
            onClick={() => setComparing(true)}
            className="gradient-amber border-0 text-accent-foreground"
          >
            <Scale className="mr-1.5 h-4 w-4" /> Bandingkan {selectedIds.length} Lokasi
          </Button>
        </div>
      </div>

      {/* Comparison Table */}
      {comparing && comparisonData.length >= 2 && (
        <>
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px]">Metrik</TableHead>
                    {comparisonData.map((item, i) => (
                      <TableHead key={item.project_id} className="min-w-[160px] text-center">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-center gap-1">
                            {i === 0 && <Trophy className="h-4 w-4 text-amber-500" />}
                            <span className="font-semibold">{item.district}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-normal">{item.product_name}</p>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((metric) => {
                    const values = comparisonData.map((d) => {
                      const v = d[metric.key];
                      return typeof v === "number" ? v : null;
                    });
                    const validValues = values.filter((v): v is number => v != null);
                    const bestVal = metric.higherBetter
                      ? Math.max(...validValues)
                      : Math.min(...validValues);

                    return (
                      <TableRow key={metric.key}>
                        <TableCell className="font-medium text-sm">{metric.label}</TableCell>
                        {comparisonData.map((item, i) => {
                          const v = item[metric.key];
                          const numV = typeof v === "number" ? v : null;
                          const isBest = numV != null && numV === bestVal && validValues.length > 1;
                          return (
                            <TableCell
                              key={item.project_id}
                              className={`text-center text-sm ${isBest ? "font-bold text-primary" : ""}`}
                            >
                              {metric.key === "decision" ? (
                                decisionBadge(item.decision)
                              ) : (
                                metric.format(v, item)
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Ranking */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> Ranking Lokasi
            </h2>
            <div className="space-y-3">
              {comparisonData.map((item, index) => (
                <div
                  key={item.project_id}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    index === 0 ? "border-primary/30 bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="text-2xl">{medals[index] || `#${index + 1}`}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.district}</span>
                      <span className="text-sm text-muted-foreground">— Market Score {Number(item.market_score || 0).toFixed(1)}</span>
                      {item.decision && decisionBadge(item.decision)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Omzet: {fmtRpShort(item.omzet_moderat)}/bulan — {item.estimated_daily_customers || 0} customer/hari
                      {item.bep_days != null && (
                        <> — BEP {item.bep_days < 30 ? `${item.bep_days} hari` : `${(item.bep_days / 30).toFixed(1)} bulan`}</>
                      )}
                    </p>
                    {item.insight_summary && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{item.insight_summary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {comparisonData.length >= 2 && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm">
                  <span className="font-semibold">💡 Rekomendasi: </span>
                  {comparisonData[0].district} adalah lokasi paling potensial dengan market score tertinggi (
                  {Number(comparisonData[0].market_score || 0).toFixed(1)}/10)
                  {comparisonData[0].decision === "GO" && " dan keputusan GO"}.
                  {comparisonData[0].omzet_moderat && comparisonData[1].omzet_moderat && comparisonData[0].omzet_moderat > comparisonData[1].omzet_moderat && (
                    <> Estimasi omzet {Math.round(((comparisonData[0].omzet_moderat - comparisonData[1].omzet_moderat) / comparisonData[1].omzet_moderat) * 100)}% lebih tinggi dari {comparisonData[1].district}.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CompareLocations;
