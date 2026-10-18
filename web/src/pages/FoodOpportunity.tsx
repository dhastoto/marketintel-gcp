import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, TrendingUp, ChevronDown, ChevronUp, ArrowRight, Clock, MapPin, Lightbulb, Trophy } from "lucide-react";
import {
  FOODINTEL_CREDIT_COST,
  getSignalByPercentile,
  formatDemandStrength,
  formatMarketSize,
  getPriceLabel,
  getArchetype,
  ARCHETYPE_CONFIG,
  type MarketArchetype,
} from "@/lib/foodintel-constants";
import { resolveBpsCityName } from "@/lib/bps-city-resolver";
import { logAnalysisError } from "@/lib/analysis-error-logger";
import { getAnalysisTier } from "@/lib/purchase-manager";
import { getFoodIntelFeatures, type FoodIntelTier } from "@/lib/report-features";
import { Crown, Sparkles, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { UpgradeReportDialog } from "@/components/UpgradeReportDialog";

import { CITIES_BY_PROVINCE } from "@/lib/constants";
const ALL_CITIES = Object.values(CITIES_BY_PROVINCE).flat().sort();

// ============ TYPES ============

interface RankingItem {
  kelompok: string;
  kelompok_label: string;
  spending: number;
  avg_nasional: number;
  lq_pct: number;
  demand_strength: number;
  archetype: MarketArchetype;
  est_market_size_weekly: number | null;
}

interface SubItem {
  sub_komoditas: string;
  spending: number;
  avg_nasional: number;
  lq_pct: number;
  demand_strength: number;
  archetype: MarketArchetype;
  price_ratio: number | null;
  business_ideas: string[];
  business_category: string;
  icon: string;
  marketintel_category: string;
}

interface CrossCommodityIdea {
  idea: string;
  sub_komoditas: string;
  kelompok: string;
  icon: string;
  cross_score: number;
  base_demand: number;
  deps_demand: number;
  dep_details: { label: string; demand: number }[];
}

interface HistoryItem {
  id: string;
  kabupaten_kota: string;
  analysis_data: { ranking: any[]; year?: number };
  created_at: string;
}

// ============ HELPERS ============

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const migrateRankingItem = (item: any): RankingItem => {
  const spending = item.spending ?? 0;
  const avg_nasional = item.avg_nasional ?? 0;
  const lq = avg_nasional > 0 ? spending / avg_nasional : 0;
  const lq_pct = item.lq_pct ?? item.index_vs_nasional ?? Math.round(lq * 100);
  const demand_strength = item.demand_strength ?? item.excess_spending ?? (avg_nasional > 0 ? Math.round((spending * spending) / avg_nasional) : 0);
  return {
    kelompok: item.kelompok,
    kelompok_label: item.kelompok_label,
    spending,
    avg_nasional,
    lq_pct,
    demand_strength,
    archetype: item.archetype ?? 'weak',
    est_market_size_weekly: item.est_market_size_weekly ?? null,
  };
};

const dedupeRankingItems = (items: any[]) => {
  const migrated = items.map(migrateRankingItem);
  const deduped = new Map<string, RankingItem>();
  migrated.forEach((item) => {
    const existing = deduped.get(item.kelompok);
    if (!existing || item.demand_strength > existing.demand_strength) {
      deduped.set(item.kelompok, item);
    }
  });
  return Array.from(deduped.values()).sort((a, b) => b.demand_strength - a.demand_strength);
};

function assignArchetypes(items: RankingItem[], population: number | null): RankingItem[] {
  const medSpend = median(items.map(i => i.spending));
  const medLq = median(items.map(i => i.lq_pct / 100));
  return items.map(item => ({
    ...item,
    archetype: getArchetype(item.spending, item.lq_pct / 100, medSpend, medLq),
    est_market_size_weekly: population != null ? Math.round(item.spending * population) : item.est_market_size_weekly,
  }));
}

const KELOMPOK_EMOJI: Record<string, string> = {
  Daging: "🥩", "Ikan & Seafood": "🐟", "Telur & Susu": "🥚",
  "Makanan Jadi": "🍱", "Buah-buahan": "🍊", "Kacang-kacangan": "🫘",
  "Bahan Minuman": "☕", Bumbu: "🌶️", "Padi & Tepung": "🍚", "Umbi-umbian": "🍠",
};

// ============ COMPONENT ============

const FoodOpportunity = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingPurchaseId = searchParams.get("use_purchase");
  const resultIdParam = searchParams.get("result");

  const [searchCity, setSearchCity] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ranking, setRanking] = useState<RankingItem[] | null>(null);
  const [analysisYear, setAnalysisYear] = useState<number | null>(null);
  const [expandedKelompok, setExpandedKelompok] = useState<string | null>(null);
  const [subItems, setSubItems] = useState<SubItem[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [crossIdeas, setCrossIdeas] = useState<CrossCommodityIdea[]>([]);
  const [crossLoading, setCrossLoading] = useState(false);
  // Tier of the currently displayed analysis. Default 'standard' so legacy results stay unlocked.
  const [reportTier, setReportTier] = useState<FoodIntelTier>("standard");
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const features = useMemo(() => getFoodIntelFeatures(reportTier), [reportTier]);

  const reloadCurrentAnalysis = async () => {
    if (!currentAnalysisId) return;
    const tier = await getAnalysisTier(currentAnalysisId);
    setReportTier(tier === "free" ? "free" : "standard");
  };

  const filteredCities = useMemo(() => {
    if (!searchCity) return ALL_CITIES.slice(0, 20);
    const q = searchCity.toLowerCase();
    return ALL_CITIES.filter((c) => c.toLowerCase().includes(q)).slice(0, 20);
  }, [searchCity]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("foodintel_results")
      .select("id, kabupaten_kota, analysis_data, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setHistory((data as any) || []);
        setHistoryLoading(false);
      });
  }, [user]);

  // Auto-load result if ?result=<id> is present (from MyReports "Lihat" link)
  useEffect(() => {
    if (!user || !resultIdParam) return;
    (async () => {
      const { data } = await supabase
        .from("foodintel_results")
        .select("id, kabupaten_kota, analysis_data, created_at")
        .eq("id", resultIdParam)
        .maybeSingle();
      if (!data) return;
      const h = data as any as HistoryItem;
      setSelectedCity(h.kabupaten_kota);
      setSearchCity(h.kabupaten_kota);
      setAnalysisYear(h.analysis_data.year ?? null);
      const items = dedupeRankingItems(h.analysis_data.ranking || []);
      const pop = await fetchPopulation(h.kabupaten_kota);
      setRanking(assignArchetypes(items, pop));
      setCurrentAnalysisId(h.id);
      const tier = await getAnalysisTier(h.id);
      setReportTier(tier === "free" ? "free" : "standard");
      const resolvedCity = await resolveBpsCityName(h.kabupaten_kota);
      if (resolvedCity && h.analysis_data.year) {
        computeCrossCommodityScores(resolvedCity, h.analysis_data.year);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, resultIdParam]);

  // When consuming a purchase, pre-fetch tier so UI gates correctly even before analysis runs
  useEffect(() => {
    if (!pendingPurchaseId) return;
    (async () => {
      const { data } = await supabase
        .from("user_purchases")
        .select("tier")
        .eq("id", pendingPurchaseId)
        .maybeSingle();
      if (data?.tier === "free") setReportTier("free");
      else setReportTier("standard");
    })();
  }, [pendingPurchaseId]);

  const logError = async (errorType: string, errorMessage: string, resolvedCity?: string | null, context?: Record<string, any>) => {
    if (!user) return;
    await logAnalysisError({
      userId: user.id,
      source: "foodintel",
      errorType,
      errorMessage,
      kabupatenKotaInput: selectedCity,
      kabupatenKotaResolved: resolvedCity,
      context,
    });
  };

  const fetchPopulation = async (cityName: string): Promise<number | null> => {
    try {
      const { data } = await supabase
        .from("population_data")
        .select("total_population")
        .eq("city", cityName);
      if (!data || data.length === 0) return null;
      return data.reduce((sum, r) => sum + (r.total_population || 0), 0);
    } catch {
      return null;
    }
  };

  /** Compute Cross-Commodity Score for a city */
  const computeCrossCommodityScores = async (resolvedCity: string, year: number) => {
    setCrossLoading(true);
    try {
      // 1. Get all business ideas with cross_commodity_deps
      const { data: ideasWithDeps } = await supabase
        .from("food_business_ideas")
        .select("sub_komoditas, kelompok, business_ideas, icon, cross_commodity_deps")
        .not("cross_commodity_deps", "eq", "[]");

      if (!ideasWithDeps || ideasWithDeps.length === 0) {
        setCrossIdeas([]);
        setCrossLoading(false);
        return;
      }

      // 2. Get ALL spending data for this city (sub-komoditas level)
      const { data: allSpending } = await supabase
        .from("bps_food_data")
        .select("kelompok, sub_komoditas, value_amount")
        .eq("kabupaten_kota", resolvedCity)
        .eq("is_total", false)
        .eq("year", year)
        .eq("metric_type", "pengeluaran")
        .gt("value_amount", 0);

      // 3. Get ALL national averages
      const { data: allAvg } = await supabase
        .from("bps_national_averages")
        .select("kelompok, sub_komoditas, avg_nasional")
        .eq("year", year)
        .eq("metric_type", "pengeluaran");

      if (!allSpending || !allAvg) {
        setCrossIdeas([]);
        setCrossLoading(false);
        return;
      }

      // Build demand strength map: "kelompok:sub_komoditas" → demand_strength
      const avgMap = new Map<string, number>();
      allAvg.forEach(a => avgMap.set(`${a.kelompok}:${a.sub_komoditas}`, Number(a.avg_nasional)));

      // Dedupe spending (take max)
      const spendMap = new Map<string, number>();
      allSpending.forEach(s => {
        const key = `${s.kelompok}:${s.sub_komoditas}`;
        const val = Number(s.value_amount);
        const existing = spendMap.get(key);
        if (!existing || val > existing) spendMap.set(key, val);
      });

      const getDemandStrength = (key: string): number => {
        const spending = spendMap.get(key) || 0;
        const avg = avgMap.get(key) || 0;
        return avg > 0 ? Math.round((spending * spending) / avg) : 0;
      };

      // 4. Compute cross-commodity score for each idea
      const results: CrossCommodityIdea[] = [];

      for (const row of ideasWithDeps) {
        const deps = Array.isArray(row.cross_commodity_deps) ? row.cross_commodity_deps as string[] : [];
        if (deps.length === 0) continue;

        const baseKey = `${row.kelompok}:${row.sub_komoditas}`;
        const baseDemand = getDemandStrength(baseKey);

        // Skip if base commodity has no data
        if (baseDemand === 0) continue;

        const depDetails: { label: string; demand: number }[] = [];
        let depsDemand = 0;

        for (const dep of deps) {
          const demand = getDemandStrength(dep);
          const label = dep.split(":")[1] || dep;
          depDetails.push({ label, demand });
          depsDemand += demand;
        }

        const crossScore = baseDemand + depsDemand;

        // Create one entry per business idea
        const ideas = Array.isArray(row.business_ideas) ? row.business_ideas : [];
        for (const idea of ideas) {
          results.push({
            idea: idea as string,
            sub_komoditas: row.sub_komoditas,
            kelompok: row.kelompok,
            icon: row.icon || "📦",
            cross_score: crossScore,
            base_demand: baseDemand,
            deps_demand: depsDemand,
            dep_details: depDetails,
          });
        }
      }

      // Deduplicate by idea name (keep highest score)
      const deduped = new Map<string, CrossCommodityIdea>();
      results.forEach(r => {
        const existing = deduped.get(r.idea);
        if (!existing || r.cross_score > existing.cross_score) {
          deduped.set(r.idea, r);
        }
      });

      const sorted = Array.from(deduped.values())
        .sort((a, b) => b.cross_score - a.cross_score)
        .slice(0, 10); // Top 10

      setCrossIdeas(sorted);
    } catch (err) {
      console.error("[CrossCommodity] Error:", err);
      setCrossIdeas([]);
    }
    setCrossLoading(false);
  };

  const handleAnalyze = async () => {
    if (!user || !profile || !selectedCity) return;

    const existing = history.find((h) => h.kabupaten_kota === selectedCity);
    if (existing) {
      const items = dedupeRankingItems(existing.analysis_data.ranking || []);
      const pop = await fetchPopulation(selectedCity);
      setRanking(assignArchetypes(items, pop));
      setAnalysisYear(existing.analysis_data.year ?? null);
      // Compute cross-commodity for cached results too
      const resolvedCity = await resolveBpsCityName(selectedCity);
      if (resolvedCity && existing.analysis_data.year) {
        computeCrossCommodityScores(resolvedCity, existing.analysis_data.year);
      }
      toast.info("Menampilkan hasil analisis sebelumnya (gratis)");
      return;
    }

    // If consuming a purchase entitlement, skip credit check
    const usingPurchase = !!pendingPurchaseId;
    if (!usingPurchase) {
      const currentCredits = profile.credits_remaining ?? 0;
      if (currentCredits < FOODINTEL_CREDIT_COST) {
        toast.error(`Kredit tidak cukup. Butuh ${FOODINTEL_CREDIT_COST} kredit.`);
        navigate("/harga");
        return;
      }
    }

    setLoading(true);
    try {
      const resolvedCity = await resolveBpsCityName(selectedCity);
      if (!resolvedCity) {
        await logError("city_not_found", `Nama kota "${selectedCity}" tidak ditemukan di data BPS`, null);
        toast.error("Data BPS belum tersedia untuk kota ini.");
        setLoading(false);
        return;
      }

      const { data: latestYearRow, error: latestYearErr } = await supabase
        .from("bps_food_data")
        .select("year")
        .eq("kabupaten_kota", resolvedCity)
        .eq("is_total", true)
        .eq("metric_type", "pengeluaran")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestYearErr) throw latestYearErr;
      const latestYear = latestYearRow?.year;
      if (!latestYear) {
        await logError("year_not_found", `Resolved "${resolvedCity}" tapi tidak ada data tahun`, resolvedCity);
        toast.error("Data BPS belum tersedia untuk kota ini.");
        setLoading(false);
        return;
      }

      const { data: foodData, error: foodErr } = await supabase
        .from("bps_food_data")
        .select("kelompok, kelompok_label, value_amount")
        .eq("kabupaten_kota", resolvedCity)
        .eq("is_total", true)
        .eq("year", latestYear)
        .eq("metric_type", "pengeluaran");

      if (foodErr) throw foodErr;
      if (!foodData || foodData.length === 0) {
        await logError("data_empty", `Resolved "${resolvedCity}" tahun ${latestYear} tapi query kosong`, resolvedCity, { year: latestYear });
        toast.error("Data BPS belum tersedia untuk kota ini.");
        setLoading(false);
        return;
      }

      const kelompokList = [...new Set(foodData.map((f) => f.kelompok))];
      const { data: avgData, error: avgErr } = await supabase
        .from("bps_national_averages")
        .select("kelompok, sub_komoditas, avg_nasional")
        .in("kelompok", kelompokList)
        .eq("year", latestYear)
        .eq("metric_type", "pengeluaran");

      if (avgErr) throw avgErr;

      const avgMap = new Map<string, number>();
      avgData?.forEach((a) => avgMap.set(`${a.kelompok}::${a.sub_komoditas}`, a.avg_nasional as number));

      const population = await fetchPopulation(selectedCity);

      const rawItems = dedupeRankingItems(
        foodData.map((f) => {
          const spending = Number(f.value_amount);
          const avg = avgMap.get(`${f.kelompok}::${f.kelompok_label}`) || 0;
          const lq_pct = avg > 0 ? Math.round((spending / avg) * 100) : 0;
          const demand_strength = avg > 0 ? Math.round((spending * spending) / avg) : 0;
          return {
            kelompok: f.kelompok,
            kelompok_label: f.kelompok_label,
            spending,
            avg_nasional: Number(avg),
            lq_pct,
            demand_strength,
            archetype: 'weak' as MarketArchetype,
            est_market_size_weekly: null,
          };
        })
      );

      const rankingResult = assignArchetypes(rawItems, population);

      // Only deduct legacy credits when NOT consuming a per-report purchase
      if (!usingPurchase) {
        const { error: deductErr } = await supabase.rpc("deduct_credits", { p_user_id: user.id, p_amount: FOODINTEL_CREDIT_COST });
        if (deductErr) throw deductErr;
      }

      const { data: insertedResult, error: insErr } = await supabase
        .from("foodintel_results")
        .insert({
          user_id: user.id,
          kabupaten_kota: selectedCity,
          analysis_data: { year: latestYear, ranking: rankingResult, resolved_city: resolvedCity } as any,
          credits_used: usingPurchase ? 0 : FOODINTEL_CREDIT_COST,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Mark the purchase as used and link analysis_id
      if (usingPurchase && insertedResult?.id) {
        const { error: consumeErr } = await supabase.functions.invoke("consume-purchase", {
          body: {
            purchase_id: pendingPurchaseId,
            analysis_id: insertedResult.id,
            expected_product_type: "foodintel",
          },
        });
        if (consumeErr) {
          console.error("[consume-purchase] failed:", consumeErr);
          toast.warning("Analisis berhasil, tapi gagal menandai laporan terpakai. Hubungi admin.");
        } else {
          // Clean URL param so refresh doesn't try to reuse
          searchParams.delete("use_purchase");
          setSearchParams(searchParams, { replace: true });
          toast.success("Laporan FoodIntel berhasil digunakan!");
        }
      }

      setRanking(rankingResult);
      setAnalysisYear(latestYear);
      setCurrentAnalysisId(insertedResult?.id ?? null);
      refreshProfile();

      // Compute cross-commodity scores
      computeCrossCommodityScores(resolvedCity, latestYear);

      const { data: newHistory } = await supabase
        .from("foodintel_results")
        .select("id, kabupaten_kota, analysis_data, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      setHistory((newHistory as any) || []);
    } catch (err: any) {
      await logError("query_error", err.message || "Unknown error", null, { stack: err.stack });
      toast.error(err.message || "Gagal menganalisis");
    }
    setLoading(false);
  };

  const handleExpand = async (kelompok: string) => {
    if (expandedKelompok === kelompok) {
      setExpandedKelompok(null);
      return;
    }
    setExpandedKelompok(kelompok);
    setSubLoading(true);

    try {
      const resolvedCity = await resolveBpsCityName(selectedCity);
      const queryCity = resolvedCity || selectedCity;

      const [spendRes, consRes, avgSpendRes, avgConsRes, ideasRes] = await Promise.all([
        supabase.from("bps_food_data").select("sub_komoditas, value_amount")
          .eq("kabupaten_kota", queryCity).eq("kelompok", kelompok)
          .eq("is_total", false).eq("year", analysisYear).eq("metric_type", "pengeluaran").gt("value_amount", 0),
        supabase.from("bps_food_data").select("sub_komoditas, value_amount")
          .eq("kabupaten_kota", queryCity).eq("kelompok", kelompok)
          .eq("is_total", false).eq("year", analysisYear).eq("metric_type", "konsumsi").gt("value_amount", 0),
        supabase.from("bps_national_averages").select("sub_komoditas, avg_nasional")
          .eq("kelompok", kelompok).eq("year", analysisYear).eq("metric_type", "pengeluaran"),
        supabase.from("bps_national_averages").select("sub_komoditas, avg_nasional")
          .eq("kelompok", kelompok).eq("year", analysisYear).eq("metric_type", "konsumsi"),
        supabase.from("food_business_ideas").select("sub_komoditas, business_ideas, business_category, icon, marketintel_category")
          .eq("kelompok", kelompok),
      ]);

      const avgSpendMap = new Map<string, number>();
      avgSpendRes.data?.forEach((a) => avgSpendMap.set(a.sub_komoditas, Number(a.avg_nasional)));

      const avgConsMap = new Map<string, number>();
      avgConsRes.data?.forEach((a) => avgConsMap.set(a.sub_komoditas, Number(a.avg_nasional)));

      const consMap = new Map<string, number>();
      consRes.data?.forEach((c) => {
        const val = Number(c.value_amount);
        const existing = consMap.get(c.sub_komoditas);
        if (!existing || val > existing) consMap.set(c.sub_komoditas, val);
      });

      const ideasMap = new Map<string, any>();
      ideasRes.data?.forEach((i) => ideasMap.set(i.sub_komoditas, i));

      const deduped = new Map<string, number>();
      (spendRes.data || []).forEach((s) => {
        const val = Number(s.value_amount);
        const existing = deduped.get(s.sub_komoditas);
        if (!existing || val > existing) deduped.set(s.sub_komoditas, val);
      });

      const rawSubItems = Array.from(deduped.entries()).map(([sub_komoditas, spending]) => {
        const avgSpend = avgSpendMap.get(sub_komoditas) || 0;
        const lq = avgSpend > 0 ? spending / avgSpend : 0;
        const lq_pct = Math.round(lq * 100);
        const demand_strength = avgSpend > 0 ? Math.round((spending * spending) / avgSpend) : 0;

        const konsumsi = consMap.get(sub_komoditas) || 0;
        const avgKons = avgConsMap.get(sub_komoditas) || 0;
        let price_ratio: number | null = null;
        if (konsumsi > 0 && avgKons > 0 && avgSpend > 0) {
          const localPrice = spending / konsumsi;
          const nationalPrice = avgSpend / avgKons;
          if (nationalPrice > 0) {
            price_ratio = Math.round((localPrice / nationalPrice) * 100) / 100;
          }
        }

        const idea = ideasMap.get(sub_komoditas);
        return {
          sub_komoditas,
          spending,
          avg_nasional: avgSpend,
          lq_pct,
          lq,
          demand_strength,
          price_ratio,
          business_ideas: idea?.business_ideas || [],
          business_category: idea?.business_category || "",
          icon: idea?.icon || "📦",
          marketintel_category: idea?.marketintel_category || "makanan_minuman",
        };
      });

      const medSpend = median(rawSubItems.map(i => i.spending));
      const medLq = median(rawSubItems.map(i => i.lq));

      const items: SubItem[] = rawSubItems.map(item => ({
        ...item,
        archetype: getArchetype(item.spending, item.lq, medSpend, medLq),
      }));

      items.sort((a, b) => b.demand_strength - a.demand_strength);
      setSubItems(items);
    } catch {
      toast.error("Gagal memuat detail");
    }
    setSubLoading(false);
  };

  const handleRedirectToMarketIntel = (item: SubItem) => {
    const params = new URLSearchParams({
      prefill_category: item.marketintel_category,
      prefill_city: selectedCity,
      prefill_source: "foodintel",
      prefill_idea: item.business_ideas[0] || "",
    });
    navigate(`/app/analysis/new?${params.toString()}`);
  };

  const openHistory = async (h: HistoryItem) => {
    setSelectedCity(h.kabupaten_kota);
    setSearchCity(h.kabupaten_kota);
    setAnalysisYear(h.analysis_data.year ?? null);
    const items = dedupeRankingItems(h.analysis_data.ranking || []);
    const pop = await fetchPopulation(h.kabupaten_kota);
    setRanking(assignArchetypes(items, pop));
    setCurrentAnalysisId(h.id);
    // Load tier from purchase link (legacy items default to 'standard')
    const tier = await getAnalysisTier(h.id);
    setReportTier(tier === "free" ? "free" : "standard");
    // Compute cross-commodity for history
    const resolvedCity = await resolveBpsCityName(h.kabupaten_kota);
    if (resolvedCity && h.analysis_data.year) {
      computeCrossCommodityScores(resolvedCity, h.analysis_data.year);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-amber-500" />
          Cari Peluang Bisnis Makanan
        </h1>
        <p className="text-muted-foreground">Temukan komoditas makanan dengan potensi tinggi di kota Anda berdasarkan data BPS.</p>
        {pendingPurchaseId && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
            Anda menggunakan laporan FoodIntel yang sudah dibeli. Pilih kota lalu klik <strong>Cari Peluang</strong> — tidak ada biaya tambahan.
          </div>
        )}
      </div>

      {/* City Selector */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kabupaten/kota..."
              value={searchCity}
              onChange={(e) => {
                setSearchCity(e.target.value);
                setShowDropdown(true);
                setSelectedCity("");
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-9"
            />
            {showDropdown && filteredCities.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border bg-popover shadow-lg">
                {filteredCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelectedCity(c);
                      setSearchCity(c);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={!selectedCity || loading}
            className="gradient-amber border-0 text-accent-foreground hover:opacity-90 shrink-0"
          >
            {loading ? "Menganalisis..." : pendingPurchaseId ? "Cari Peluang (Pakai Laporan)" : "Cari Peluang"}
          </Button>
        </div>
        {selectedCity && (
          <p className="mt-2 text-sm text-muted-foreground">
            <MapPin className="inline h-3.5 w-3.5 mr-1" />
            Dipilih: <strong>{selectedCity}</strong>
          </p>
        )}
      </div>

      {/* Upgrade Banner — only when current report is FREE tier */}
      {ranking && reportTier === "free" && (
        <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Laporan ini: <span className="text-amber-600">Gratis</span> — fitur terbatas
                </p>
                <p className="text-xs text-muted-foreground">
                  Buka 13 kelompok lengkap, 220+ sub-komoditas, 629 ide bisnis & cross-commodity score dengan FoodIntel Lengkap (Rp 15.000)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setUpgradeOpen(true)}
              disabled={!currentAnalysisId}
              className="gradient-amber border-0 text-accent-foreground hover:opacity-90 whitespace-nowrap"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Upgrade Rp 15.000
            </Button>
          </div>
        </div>
      )}

      {/* Cross-Commodity Top Ideas — only for Standard tier */}
      {ranking && features.ide_bisnis && crossIdeas.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Top Ide Bisnis di {selectedCity}
            </h2>
            <p className="text-xs text-muted-foreground">
              Berdasarkan kombinasi kekuatan permintaan lintas kategori komoditas
            </p>
          </div>
          <div className="divide-y divide-border">
            {crossIdeas.map((idea, idx) => (
              <div key={idea.idea} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 font-bold text-sm shrink-0">
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">{idea.icon} {idea.idea}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Basis: {idea.sub_komoditas} ({formatDemandStrength(idea.base_demand)})
                      </div>
                      {idea.dep_details.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {idea.dep_details.map(dep => (
                            <Badge key={dep.label} variant="outline" className="text-[10px] py-0">
                              {dep.label} {dep.demand > 0 ? formatDemandStrength(dep.demand) : "–"}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-amber-500">{formatDemandStrength(idea.cross_score)}</div>
                    <div className="text-[10px] text-muted-foreground">Cross Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ranking && features.ide_bisnis && crossLoading && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            Menghitung Cross-Commodity Score...
          </div>
        </div>
      )}

      {/* Results */}
      {ranking && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Ranking Peluang di {selectedCity}
            </h2>
            {analysisYear && (
              <span className="text-xs text-muted-foreground">Data BPS {analysisYear}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Ranking berdasarkan <strong>Skor Kekuatan Permintaan</strong> (Spending × LQ) — semakin tinggi berarti pasar besar <em>dan</em> konsentrasi tinggi.
            {reportTier === "free" && (
              <span className="block mt-1 text-amber-600">
                <Lock className="inline h-3 w-3 mr-1" />
                Versi Gratis menampilkan {features.top_kelompok} kelompok teratas dari {ranking.length}.
              </span>
            )}
          </p>

          {ranking.slice(0, features.top_kelompok).map((item, idx) => {
            const badge = getSignalByPercentile(idx, ranking.length);
            const isExpanded = expandedKelompok === item.kelompok;
            const emoji = KELOMPOK_EMOJI[item.kelompok_label] || "📦";
            const arch = ARCHETYPE_CONFIG[item.archetype];
            const mktSize = formatMarketSize(item.est_market_size_weekly);
            const canExpand = features.sub_komoditas_detail;

            return (
              <div key={item.kelompok} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => {
                    if (!canExpand) {
                      toast.info("Detail sub-komoditas tersedia di FoodIntel Lengkap (Rp 15.000)");
                      return;
                    }
                    handleExpand(item.kelompok);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-2xl shrink-0">{emoji}</div>
                    <div className="text-left min-w-0">
                      <div className="font-semibold">{item.kelompok_label}</div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>Rp {item.spending.toLocaleString("id-ID")}/kapita/minggu</span>
                        <span>•</span>
                        <span>LQ {item.lq_pct}%</span>
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs mt-0.5">
                        <span className={`font-medium ${arch.color}`}>{arch.label}</span>
                        {mktSize && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">Est. pasar: {mktSize}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold">{formatDemandStrength(item.demand_strength)}</div>
                      <div className="text-[10px] text-muted-foreground">Skor Permintaan</div>
                    </div>
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                    {canExpand
                      ? (isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)
                      : <Lock className="h-4 w-4 text-amber-500" />}
                  </div>
                </button>

                {isExpanded && canExpand && (
                  <div className="border-t p-4 space-y-3 bg-muted/30">
                    {subLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}
                      </div>
                    ) : subItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Tidak ada data sub-komoditas</p>
                    ) : (
                      subItems.map((sub, subIdx) => {
                        const subBadge = getSignalByPercentile(subIdx, subItems.length);
                        const subArch = ARCHETYPE_CONFIG[sub.archetype];
                        const priceLabel = getPriceLabel(sub.price_ratio);
                        return (
                          <div key={sub.sub_komoditas} className="rounded-lg border bg-card p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xl shrink-0">{sub.icon}</span>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm">{sub.sub_komoditas}</div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                    <span>Rp {sub.spending.toLocaleString("id-ID")}/mgg</span>
                                    <span>•</span>
                                    <span>LQ {sub.lq_pct}%</span>
                                    {priceLabel && (
                                      <>
                                        <span>•</span>
                                        <span className={priceLabel.color}>
                                          {priceLabel.label}
                                          {sub.price_ratio != null && ` (${sub.price_ratio}×)`}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <span className={`text-xs font-medium ${subArch.color}`}>{subArch.label}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-sm">{formatDemandStrength(sub.demand_strength)}</div>
                                <Badge variant="outline" className={`${subBadge.className} text-[10px]`}>
                                  {subBadge.label}
                                </Badge>
                              </div>
                            </div>
                            {features.ide_bisnis && sub.business_ideas.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-muted-foreground mb-1">💡 Ide bisnis terkait kategori ini:</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {sub.business_ideas.map((idea) => (
                                    <Badge key={idea} variant="secondary" className="text-xs">{idea}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-3 text-xs"
                              onClick={() => handleRedirectToMarketIntel(sub)}
                            >
                              Analisis Lokasi Detail <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Locked-rows teaser for free tier */}
          {reportTier === "free" && ranking.length > features.top_kelompok && (
            <div className="rounded-xl border border-dashed border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/10 p-6 text-center">
              <Lock className="mx-auto h-6 w-6 text-amber-500 mb-2" />
              <p className="text-sm font-medium">
                {ranking.length - features.top_kelompok} kelompok lainnya terkunci
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Buka semua kelompok + 220 sub-komoditas + 629 ide bisnis dengan FoodIntel Lengkap
              </p>
              <Button
                size="sm"
                onClick={() => setUpgradeOpen(true)}
                disabled={!currentAnalysisId}
                className="gradient-amber border-0 text-accent-foreground hover:opacity-90"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Upgrade Rp 15.000
              </Button>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" /> Riwayat Analisis FoodIntel
          </h2>
          <p className="text-xs text-muted-foreground">Klik untuk melihat ulang (gratis)</p>
        </div>
        {historyLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Belum ada riwayat analisis</div>
        ) : (
          <div className="divide-y">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => openHistory(h)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <div className="font-medium text-sm">{h.kabupaten_kota}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(h.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {currentAnalysisId && reportTier === "free" && (
        <UpgradeReportDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          currentTier="free"
          analysisId={currentAnalysisId}
          productType="foodintel"
          onUpgraded={reloadCurrentAnalysis}
        />
      )}
    </div>
  );
};

export default FoodOpportunity;
