import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Rocket, Shield, Star, CheckCircle2, MapPin, Clock, Zap, Copy, AlertTriangle, XCircle, ChevronDown, ChevronUp, FileText, Share2, Info, Store, MessageSquare, Users, TrendingUp, Car, Navigation, Target, ShieldAlert, BarChart3, RefreshCw, Scale } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import ScoreBreakdownCard from "@/components/ScoreBreakdownCard";
import type { ScoreBreakdown as NewScoreBreakdown } from "@/types/location-scoring";
import { generateAnalysisPdf } from "@/lib/generateAnalysisPdf";
import { useAuth } from "@/contexts/AuthContext";
import { Crown } from "lucide-react";
import { EconomicPotentialTab, BusinessDecisionTab } from "@/components/EconomicTabs";
import { getFeatures, type PlanFeatures } from "@/lib/feature-gate";
import { mapTierToFeatures } from "@/lib/tier-features-adapter";
import { getAnalysisTier } from "@/lib/purchase-manager";
import { UpgradeTeaser } from "@/components/UpgradeTeaser";
import { UpgradeReportBanner } from "@/components/UpgradeReportBanner";
import { CommodityPricesTab } from "@/components/CommodityPricesTab";
import { HppEstimateSection } from "@/components/HppEstimateSection";
import { isFnBCategory } from "@/lib/hpp-recipes";

interface AnalysisSection {
  section: string;
  content: any;
}

interface StrategicLocation {
  id: string;
  location_name: string;
  district: string | null;
  score: number | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  innovations: string[] | null;
  is_blind_spot: boolean | null;
  blind_spot_reason: string | null;
  rank: number | null;
  lat?: number | null;
  lng?: number | null;
  score_breakdown?: any | null;
  reasoning?: string;
  traffic_summary?: string;
  demographic_summary?: string;
  location_criteria?: string;
  parking_ease?: string;
}

function normalizeScoreBreakdown(raw: any): NewScoreBreakdown | null {
  if (!raw || typeof raw !== "object") return null;

  const competitorList = Array.isArray(raw.competitor_density?.competitors)
    ? raw.competitor_density.competitors.map((item: any) => ({
        name: item?.name || "Unknown",
        address: item?.address || "",
        rating: Number(item?.rating) || 0,
        review_count: Number(item?.review_count ?? item?.totalReviews ?? item?.userRatingCount) || 0,
        distance_meters: Number(item?.distance_meters ?? item?.distanceMeters) || 0,
      }))
    : [];

  const landmarkList = Array.isArray(raw.landmark_potential?.landmarks)
    ? raw.landmark_potential.landmarks.map((item: any) =>
        typeof item === "string"
          ? { name: item, type: "landmark", weight: 0.2 }
          : {
              name: item?.name || "Unknown",
              type: item?.type || "landmark",
              weight: Number(item?.weight) || 0.2,
            }
      )
    : [];

  const competitorDensityScore = Number(raw.competitor_density?.score) || 0;
  const ratingGapScore = Number(raw.rating_gap?.score) || 0;
  const trafficLevelScore = Number(raw.traffic_level?.score) || 0;
  const landmarkPotentialScore = Number(raw.landmark_potential?.score) || 0;

  return {
    competitor_density: {
      score: competitorDensityScore,
      raw_count: Number(raw.competitor_density?.raw_count) || competitorList.length,
      competitors: competitorList,
      explanation: raw.competitor_density?.explanation || raw.competitor_density?.detail || `${competitorList.length} kompetitor ditemukan`,
    },
    rating_gap: {
      score: ratingGapScore,
      avg_rating: Number(raw.rating_gap?.avg_rating ?? raw.rating_gap?.avgRating) || 0,
      explanation: raw.rating_gap?.explanation || raw.rating_gap?.detail || "Data rating kompetitor",
    },
    traffic_level: {
      score: trafficLevelScore,
      traffic_generators: Number(raw.traffic_level?.traffic_generators) || 0,
      congestion_ratio: raw.traffic_level?.congestion_ratio != null ? Number(raw.traffic_level.congestion_ratio) : null,
      avg_review_volume: Number(raw.traffic_level?.avg_review_volume) || 0,
      explanation: raw.traffic_level?.explanation || raw.traffic_level?.detail || `Level traffic ${raw.traffic_level?.level || "tidak tersedia"}`,
    },
    landmark_potential: {
      score: landmarkPotentialScore,
      landmark_count: Number(raw.landmark_potential?.landmark_count) || landmarkList.length,
      landmarks: landmarkList,
      explanation: raw.landmark_potential?.explanation || raw.landmark_potential?.detail || `${landmarkList.length} landmark ditemukan`,
    },
    total_score: Number(raw.total_score ?? raw.total) || Number((competitorDensityScore + ratingGapScore + trafficLevelScore + landmarkPotentialScore).toFixed(1)),
  };
}

const AnalysisDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [reportTier, setReportTier] = useState<string>("free");
  // Per-laporan gating: gunakan tier dari user_purchases yang ter-link ke analysis ini.
  // Fallback ke plan profile lama hanya jika belum ada purchase ter-link.
  const features: PlanFeatures = reportTier ? mapTierToFeatures(reportTier) : getFeatures(profile?.plan || 'free');
  const [project, setProject] = useState<any>(null);
  const [sections, setSections] = useState<AnalysisSection[]>([]);
  const [locations, setLocations] = useState<StrategicLocation[]>([]);
  const [businessInput, setBusinessInput] = useState<any>(null);
  const [checkedActions, setCheckedActions] = useState<Set<number>>(() => {
    const saved = localStorage.getItem(`actions-${id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);
  const [cachedScores, setCachedScores] = useState<Record<string, NewScoreBreakdown>>({});
  const [dataQualityByLabel, setDataQualityByLabel] = useState<Record<string, { overall: 'high'|'medium'|'low'|'failed'; warnings: string[]; from_cache?: boolean; cache_age_days?: number }>>({});
  const [economicData, setEconomicData] = useState<any[]>([]);
  const [decisionData, setDecisionData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset tier dulu agar tidak "bocor" dari laporan sebelumnya saat navigasi antar laporan
    setReportTier("free");
    if (id) getAnalysisTier(id).then(setReportTier).catch(() => setReportTier("free"));
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: proj }, { data: secs }, { data: locs }, { data: bizInput }, { data: scoreCache }, { data: ecoData }, { data: decData }] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("analysis_results").select("*").eq("project_id", id),
        supabase.from("strategic_locations").select("*").eq("project_id", id).order("rank", { ascending: true }),
        supabase.from("business_inputs").select("city, districts, province, product_name, product_description, product_category, target_segments, target_gender, target_age_min, target_age_max, price_range_min, price_range_max").eq("project_id", id).single(),
        supabase.from("location_scores_cache").select("*").eq("project_id", id),
        supabase.from("economic_results").select("*").eq("project_id", id),
        supabase.from("decision_results").select("*").eq("project_id", id),
      ]);
      setEconomicData(ecoData || []);
      setDecisionData(decData || []);
      setProject(proj);
      setBusinessInput(bizInput);
      setSections((secs || []) as AnalysisSection[]);

      // Build data quality map by location label
      const dqSection = (secs || []).find((s: any) => s.section === "location_data_quality");
      if (dqSection?.content && typeof dqSection.content === "object") {
        setDataQualityByLabel(dqSection.content as any);
      }

      // Build cached scores map by location_label
      const scoresMap: Record<string, NewScoreBreakdown> = {};
      for (const row of (scoreCache || []) as any[]) {
        const normalized = normalizeScoreBreakdown({
          competitor_density: {
            score: row.score_competitor_density,
            raw_count: row.raw_competitor_count,
            competitors: row.raw_competitor_names,
            explanation: `${row.raw_competitor_count ?? 0} kompetitor relevan ditemukan`,
          },
          rating_gap: {
            score: row.score_rating_gap,
            avg_rating: row.raw_avg_competitor_rating,
            explanation: `Rating rata-rata kompetitor relevan: ${Number(row.raw_avg_competitor_rating) || 0}/5`,
          },
          traffic_level: {
            score: row.score_traffic_level,
            traffic_generators: row.raw_traffic_generators,
            congestion_ratio: row.raw_congestion_ratio,
            avg_review_volume: row.raw_avg_review_volume,
            explanation: `${row.raw_traffic_generators ?? 0} traffic generator terdekat`,
          },
          landmark_potential: {
            score: row.score_landmark_potential,
            landmark_count: row.raw_landmark_count,
            landmarks: row.raw_landmarks,
            explanation: `${row.raw_landmark_count ?? 0} landmark ditemukan`,
          },
          total_score: row.score_total,
        });
        if (normalized) scoresMap[row.location_label] = normalized;
      }
      setCachedScores(scoresMap);

      // Merge reasoning data from analysis_results into locations
      const reasoningSection = (secs || []).find((s: any) => s.section === "location_reasoning");
      const reasoningData = reasoningSection?.content;
      // Convert array to map by location_name if it's an array
      const reasoningMap: Record<string, any> = {};
      if (Array.isArray(reasoningData)) {
        for (const r of reasoningData) {
          const item = r as any;
          if (item.location_name) reasoningMap[item.location_name] = item;
        }
      } else if (reasoningData && typeof reasoningData === "object") {
        Object.assign(reasoningMap, reasoningData);
      }
      const enrichedLocs = (locs || []).map((loc: any) => ({
        ...loc,
        reasoning: reasoningMap[loc.location_name]?.reasoning || null,
        traffic_summary: reasoningMap[loc.location_name]?.traffic_summary || null,
        demographic_summary: reasoningMap[loc.location_name]?.demographic_summary || null,
        location_criteria: reasoningMap[loc.location_name]?.location_criteria || null,
        parking_ease: reasoningMap[loc.location_name]?.parking_ease || null,
      }));
      setLocations(enrichedLocs as StrategicLocation[]);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleAction = (idx: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      localStorage.setItem(`actions-${id}`, JSON.stringify([...next]));
      return next;
    });
  };

  const getSection = (name: string) => sections.find((s) => s.section === name)?.content;
  const copyText = async (text: string, successMessage = "Teks berhasil disalin!") => {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  };
  const buildGoogleMapsUrl = (name: string, address?: string) => {
    const query = [name, address].filter(Boolean).join(" ").trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const openGoogleMaps = async (urlOrLoc: string | StrategicLocation) => {
    let url: string;
    if (typeof urlOrLoc === "string") {
      url = urlOrLoc;
    } else {
      const loc = urlOrLoc;
      // Always use location name for search to get distinct results per location
      const query = encodeURIComponent(`${loc.location_name}, ${loc.district || ""}, ${project?.project_name || ""}`.replace(/,\s*,/g, ",").trim());
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link Google Maps disalin! Paste di browser untuk membuka.", { duration: 5000 });
    window.open(url, "_blank", "noopener");
  };

  const metadata = getSection("_metadata");
  const usedFallback = metadata?.used_fallback === true;

  const exec = getSection("executive_summary");
  const psycho = getSection("psychographic_analysis");
  const offer = getSection("irresistible_offer");
  const plan = getSection("action_plan");
  const competitorAnalysis = getSection("competitor_analysis");
  const commuteFlow = getSection("commute_flow");

  const strategicLocations = locations.filter((l) => !l.is_blind_spot);
  const blindSpots = locations.filter((l) => l.is_blind_spot);

  const scoreColor = (s: number) => s >= 8 ? "text-green-500" : s >= 7 ? "text-blue-500" : "text-amber-500";
  const scoreBarColor = (s: number) => s >= 8 ? "bg-green-500" : s >= 7 ? "bg-blue-500" : "bg-amber-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="mb-2 text-lg font-semibold">Proyek tidak ditemukan</h2>
        <Button asChild><Link to="/app/dashboard">Kembali ke Dashboard</Link></Button>
      </div>
    );
  }

  // Props untuk teaser di dalam dashboard: pakai flow per-laporan (bayar selisih) jika user adalah pemilik
  const isOwner = project?.user_id === user?.id;
  const upgradeProps = isOwner && id ? { analysisId: id, currentTier: reportTier, onUpgraded: () => getAnalysisTier(id).then(setReportTier) } : undefined;

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Fallback indicator */}
      {usedFallback && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
          <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Hasil analisis menggunakan data simulasi</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">AI engine tidak merespon tepat waktu. Hasil ini menggunakan data contoh dan bukan analisis riil. Anda bisa menjalankan ulang analisis nanti.</p>
          </div>
        </div>
      )}

      {/* Upgrade banner — hanya untuk pemilik laporan & jika tier bukan Pro */}
      {id && reportTier !== "pro" && project?.user_id === user?.id && (
        <UpgradeReportBanner
          currentTier={reportTier}
          analysisId={id}
          onUpgraded={() => {
            // Reload tier untuk re-render dengan fitur baru
            getAnalysisTier(id).then(setReportTier);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{project.project_name}</h1>
            <Badge className="bg-green-500/10 text-green-500">Completed</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Hasil riset komprehensif pasar</p>
          {businessInput && (
            <div className="mt-1.5 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{businessInput.product_name}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{businessInput.product_category}</Badge>
              </div>
              {businessInput.product_description && (
                <p className="text-xs text-muted-foreground ml-5">{businessInput.product_description}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {[
                    businessInput.target_gender === 'all' ? 'Semua gender' : businessInput.target_gender === 'male' ? 'Pria' : businessInput.target_gender === 'female' ? 'Wanita' : businessInput.target_gender,
                    businessInput.target_age_min || businessInput.target_age_max ? `${businessInput.target_age_min || '?'}–${businessInput.target_age_max || '?'} thn` : null,
                  ].filter(Boolean).join(', ')}
                </span>
                {(businessInput.target_segments || []).map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{businessInput.city}:</span>
                {(businessInput.districts || []).map((d: string) => (
                  <Badge key={d} variant="outline" className="text-xs px-2 py-0">{d}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(usedFallback || project?.status === 'failed' || project?.status === 'error') && (
            <Button variant="default" size="sm" className="gap-1.5" onClick={() => navigate(`/app/analysis/${id}/loading?rerun=1`)}>
              <RefreshCw className="h-4 w-4" /> Jalankan Ulang
            </Button>
          )}
          {features.export_pdf ? (
            <Button variant="outline" size="sm" onClick={() => {
              const locationMapping = getSection("location_mapping");
              generateAnalysisPdf({
                projectName: project.project_name,
                businessInput,
                exec,
                psycho,
                offer,
                plan,
                strategicLocations,
                blindSpots,
                competitorAnalysis,
                commuteFlow,
                trafficItems: locationMapping?.traffic || [],
                economicData,
                decisionData,
                cachedScores,
                features,
              });
            }}>
              <FileText className="mr-1.5 h-4 w-4" /> Export PDF
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 opacity-70" onClick={() => { toast.info("Export PDF tersedia untuk paket Growth & Pro."); navigate("/app/upgrade"); }}>
              <Crown className="h-4 w-4 text-amber-500" /> Export PDF
            </Button>
          )}
          {features.comparison_max > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/app/compare?selected=${id}`)}>
              <Scale className="mr-1.5 h-4 w-4" /> Bandingkan
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link disalin!"); }}>
            <Share2 className="mr-1.5 h-4 w-4" /> Bagikan
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto bg-muted">
          <TabsTrigger value="summary" className="flex-1 min-w-0 text-xs sm:text-sm">Ringkasan</TabsTrigger>
          <TabsTrigger value="market" className="flex-1 min-w-0 text-xs sm:text-sm">Profil Pasar</TabsTrigger>
          <TabsTrigger value="battle" className="flex-1 min-w-0 text-xs sm:text-sm">Peta Perang</TabsTrigger>
          <TabsTrigger value="action" className="flex-1 min-w-0 text-xs sm:text-sm">Rencana Aksi</TabsTrigger>
          <TabsTrigger value="economic" className="flex-1 min-w-0 text-xs sm:text-sm">Potensi Ekonomi</TabsTrigger>
          {isFnBCategory(businessInput?.product_category) && (
            <TabsTrigger value="commodity" className="flex-1 min-w-0 text-xs sm:text-sm">Harga Bahan</TabsTrigger>
          )}
          <TabsTrigger value="decision" className="flex-1 min-w-0 text-xs sm:text-sm">Keputusan</TabsTrigger>
        </TabsList>

        {/* TAB 1: Summary */}
        <TabsContent value="summary" className="space-y-4">
          {exec && (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border-l-4 border-l-green-500 bg-card p-5">
                  <div className="mb-2 flex items-center gap-2 text-green-500"><Rocket className="h-4 w-4" /> <span className="text-xs font-semibold uppercase">Peluang Utama</span></div>
                  <p className="text-sm">{exec.main_opportunity}</p>
                </div>
                <div className="rounded-xl border-l-4 border-l-red-500 bg-card p-5">
                  <div className="mb-2 flex items-center gap-2 text-red-500"><Shield className="h-4 w-4" /> <span className="text-xs font-semibold uppercase">Ancaman Terbesar</span></div>
                  <p className="text-sm">{exec.main_threat}</p>
                </div>
                <div className="gradient-navy rounded-xl p-5 text-primary-foreground">
                  <div className="mb-3 flex items-center gap-2 text-amber-500"><Star className="h-4 w-4" /> <span className="text-xs font-semibold uppercase">Skor Lokasi</span></div>
                  <TooltipProvider delayDuration={150}>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Skor Data */}
                      <div className="rounded-lg bg-primary-foreground/5 p-3">
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-primary-foreground/70">
                          Skor Berdasarkan Data
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" aria-label="Info Skor Data"><Info className="h-3 w-3" /></button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Dihitung dari data terukur: populasi, traffic, daya beli, kompetitor. Bisa dibandingkan antar lokasi.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        {(() => {
                          const valid = (decisionData || []).filter((d: any) => typeof d?.market_score === "number");
                          if (valid.length === 0) return <div className="text-2xl font-bold text-primary-foreground/50">—</div>;
                          const avg = valid.reduce((s: number, d: any) => s + Number(d.market_score), 0) / valid.length;
                          const goCount = valid.filter((d: any) => d.decision === "GO").length;
                          const noCount = valid.filter((d: any) => d.decision === "NO").length;
                          const status = goCount > 0 ? "GO" : noCount === valid.length ? "NO" : "CONDITIONAL";
                          const statusLabel = status === "GO" ? "JALANKAN" : status === "NO" ? "TIDAK DIREKOMENDASIKAN" : "PERLU STRATEGI";
                          const statusColor = status === "GO" ? "text-green-400" : status === "NO" ? "text-red-400" : "text-amber-400";
                          return (
                            <>
                              <div className="text-3xl font-bold text-amber-500">{avg.toFixed(1)}<span className="text-sm text-primary-foreground/50">/10</span></div>
                              <div className={`mt-1 text-[10px] font-bold ${statusColor}`}>{statusLabel}</div>
                            </>
                          );
                        })()}
                      </div>
                      {/* Skor AI */}
                      <div className="rounded-lg bg-primary-foreground/5 p-3">
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-primary-foreground/70">
                          Skor Berdasarkan AI
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" aria-label="Info Skor AI"><Info className="h-3 w-3" /></button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Penilaian AI berdasarkan konteks keseluruhan, termasuk faktor kualitatif seperti peluang first-mover dan tren pasar yang tidak tertangkap data.
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-3xl font-bold text-amber-500">{exec.recommendation_score}<span className="text-sm text-primary-foreground/50">/10</span></div>
                        <div className="mt-1 text-[10px] text-primary-foreground/50">Sentimen Kualitatif</div>
                      </div>
                    </div>
                  </TooltipProvider>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Aksi Prioritas Hari Ini</h3>
                <div className="space-y-2">
                  {exec.urgent_actions?.map((action: string, i: number) => (
                    <button key={i} onClick={() => toggleAction(i)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm transition-colors hover:bg-muted/50">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${checkedActions.has(i) ? "text-green-500" : "text-muted-foreground"}`} />
                      <span className={checkedActions.has(i) ? "line-through text-muted-foreground" : ""}>{action}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5">
                <h3 className="mb-3 font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-500" /> Skor Lokasi Strategis</h3>
                <div className="space-y-3">
                  {strategicLocations.map((loc) => (
                    <div key={loc.id} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{loc.rank}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{loc.location_name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openGoogleMaps(loc)} className="text-blue-500 hover:underline" title="Buka di Google Maps"><MapPin className="h-3.5 w-3.5" /></button>
                            <span className={`font-bold ${scoreColor(loc.score || 0)}`}>{loc.score}</span>
                          </div>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-muted">
                          <div className={`h-full rounded-full ${scoreBarColor(loc.score || 0)} transition-all`} style={{ width: `${((loc.score || 0) / 10) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown score — Basic+ */}
              {!features.show_breakdown && (
                <UpgradeTeaser message="Lihat breakdown skor detail per metrik (populasi, traffic, income, kompetitor, kepadatan)" targetPlan="starter" {...upgradeProps} />
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 2: Market Profile */}
        <TabsContent value="market" className="space-y-4">
          {psycho && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-amber-500/5 p-5">
                  <div className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> <span className="font-semibold">Jam Sibuk Siang</span></div>
                  <div className="mb-1 text-lg font-bold">{psycho.buying_window_lunch?.time}</div>
                  <p className="text-sm text-muted-foreground">{psycho.buying_window_lunch?.description}</p>
                </div>
                <div className="gradient-navy rounded-xl p-5">
                  <div className="mb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> <span className="font-semibold text-primary-foreground">Jam Sibuk Malam</span></div>
                  <div className="mb-1 text-lg font-bold text-amber-500">{psycho.buying_window_evening?.time}</div>
                  <p className="text-sm text-primary-foreground/70">{psycho.buying_window_evening?.description}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-accent/5 p-5">
                <div className="mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-accent" /> <span className="font-semibold">Pemicu Beli Utama</span></div>
                <blockquote className="mb-2 text-lg font-medium italic">{psycho.primary_trigger?.quote}</blockquote>
                <p className="text-sm text-muted-foreground">{psycho.primary_trigger?.explanation}</p>
              </div>

              {/* Pain Points */}
              {psycho.pain_points && psycho.pain_points.length > 0 && (
                <div className="rounded-xl border bg-red-500/5 p-5">
                  <div className="mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-red-500" /> <span className="font-semibold">Masalah Utama Target Pasar</span></div>
                  <ul className="space-y-2">
                    {psycho.pain_points.map((pain: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 shrink-0 text-red-500">•</span>
                        <span>{pain}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="mb-3 font-semibold">Tipe Pelanggan Sasaran</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {psycho.segments?.map((seg: any, i: number) => (
                    <div key={i} className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
                      <div className="mb-1 text-2xl">{seg.emoji}</div>
                      <div className="mb-1 font-semibold">{seg.name}</div>
                      <p className="mb-2 text-sm text-muted-foreground">Pemicu: {seg.trigger}</p>
                      <Badge variant="secondary" className="text-xs">Peak: {seg.peak_time}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {offer && (
            <div className="gradient-navy rounded-xl p-5">
              <h3 className="mb-4 font-semibold text-amber-500 flex items-center gap-2"><Zap className="h-4 w-4" /> Penawaran Tak Tertolak</h3>
              <div className="mb-4 rounded-lg bg-primary-foreground/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-primary-foreground/50">Versi Spanduk</p>
                <p className="text-lg font-bold text-primary-foreground">{offer.banner}</p>
                <Button size="sm" variant="ghost" className="mt-2 text-amber-500 hover:text-amber-500/80" onClick={() => copyText(offer.banner)}>
                  <Copy className="mr-1 h-3 w-3" /> Salin Teks Spanduk
                </Button>
              </div>
              <div className="rounded-lg bg-primary-foreground/5 p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-primary-foreground/50">Versi WhatsApp</p>
                <p className="whitespace-pre-line text-sm italic text-primary-foreground/80">{offer.whatsapp}</p>
                <Button size="sm" variant="ghost" className="mt-2 text-amber-500 hover:text-amber-500/80" onClick={() => copyText(offer.whatsapp)}>
                  <Copy className="mr-1 h-3 w-3" /> Salin Teks WhatsApp
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Battle Map */}
        <TabsContent value="battle" className="space-y-4">
          {/* Commute Flow */}
          {commuteFlow && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Navigation className="h-5 w-5 text-blue-500" /> Arus Pulang Kerja Sore
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-blue-500/5 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Arah Utama</p>
                  <p className="text-sm font-medium">{commuteFlow.direction}</p>
                </div>
                <div className="rounded-lg border bg-amber-500/5 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Waktu Puncak</p>
                  <p className="text-sm font-medium">{commuteFlow.peak_time}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Detail</p>
                  <p className="text-sm">{commuteFlow.description}</p>
                </div>
              </div>
            </div>
          )}
          {strategicLocations.map((loc) => (
            <div key={loc.id} className="rounded-xl border bg-card transition-shadow hover:shadow-md">
              <div className="flex w-full items-center justify-between p-4">
                <button onClick={() => setExpandedLocation(expandedLocation === loc.id ? null : loc.id)} className="flex flex-1 items-center justify-between text-left">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-amber text-sm font-bold text-accent-foreground">{loc.rank}</span>
                    <div>
                      <div className="font-semibold">{loc.location_name}</div>
                      <div className="text-xs text-muted-foreground">{loc.district}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${scoreColor(loc.score || 0)} bg-transparent`}>{loc.score}/10</Badge>
                    {expandedLocation === loc.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                <Button variant="ghost" size="sm" className="ml-2 h-7 gap-1 px-2 text-xs text-blue-500 hover:text-blue-600" onClick={() => openGoogleMaps(loc)}>
                  <Navigation className="h-3.5 w-3.5" /> Maps
                </Button>
              </div>
              {expandedLocation === loc.id && (
                <div className="border-t p-4 space-y-4">
                  {dataQualityByLabel[loc.location_name] && (() => {
                    const dq = dataQualityByLabel[loc.location_name];
                    const badgeClass =
                      dq.overall === 'high' ? 'bg-green-100 text-green-800' :
                      dq.overall === 'medium' ? 'bg-blue-100 text-blue-800' :
                      dq.overall === 'low' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800';
                    const label =
                      dq.overall === 'high' ? 'Data Lengkap' :
                      dq.overall === 'medium' ? 'Data Cukup' :
                      dq.overall === 'low' ? 'Data Terbatas' : 'Data Tidak Lengkap';
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <Badge className={badgeClass}>{label}</Badge>
                          {dq.from_cache && (
                            <Badge variant="outline" className="text-xs">
                              Cache {dq.cache_age_days || 0} hari
                            </Badge>
                          )}
                        </div>
                        {dq.warnings && dq.warnings.length > 0 && (
                          <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-3">
                            <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-yellow-700">
                              <AlertTriangle className="h-4 w-4" /> Catatan Kualitas Data
                            </h4>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-yellow-900">
                              {dq.warnings.map((w, i) => (<li key={i}>{w}</li>))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  {features.show_breakdown ? (
                    cachedScores[loc.location_name] ? (
                      <ScoreBreakdownCard
                        location={loc.location_name}
                        district={loc.district || ""}
                        breakdown={cachedScores[loc.location_name]}
                      />
                    ) : normalizeScoreBreakdown(loc.score_breakdown) ? (
                      <ScoreBreakdownCard
                        location={loc.location_name}
                        district={loc.district || ""}
                        breakdown={normalizeScoreBreakdown(loc.score_breakdown)!}
                      />
                    ) : null
                  ) : (
                    <UpgradeTeaser message="Lihat breakdown skor detail per lokasi" targetPlan="starter" {...upgradeProps} />
                  )}
                  {/* Reasoning */}
                  {loc.reasoning && (
                    <div className="rounded-lg border bg-blue-500/5 p-3">
                      <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-500"><TrendingUp className="h-4 w-4" /> Alasan Rekomendasi</h4>
                      <p className="text-sm text-muted-foreground">{loc.reasoning}</p>
                    </div>
                  )}
                  {/* Location Criteria & Parking */}
                  <div className="grid gap-3 md:grid-cols-2">
                    {loc.location_criteria && (
                      <div className="rounded-lg border bg-green-500/5 p-3">
                        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-green-600"><Target className="h-4 w-4" /> Kriteria Pemilihan Lokasi</h4>
                        <p className="text-sm text-muted-foreground">{loc.location_criteria}</p>
                      </div>
                    )}
                    {loc.parking_ease && (
                      <div className="rounded-lg border bg-cyan-500/5 p-3">
                        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-cyan-600"><Car className="h-4 w-4" /> Kemudahan Parkir</h4>
                        <p className="text-sm text-muted-foreground">{loc.parking_ease}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {loc.traffic_summary && (
                      <div className="rounded-lg border bg-amber-500/5 p-3">
                        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-600"><Clock className="h-4 w-4" /> Kondisi Lalu Lintas</h4>
                        <p className="text-sm text-muted-foreground">{loc.traffic_summary}</p>
                      </div>
                    )}
                    {loc.demographic_summary && (
                      <div className="rounded-lg border bg-purple-500/5 p-3">
                        <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-purple-600"><Users className="h-4 w-4" /> Demografi Sekitar</h4>
                        <p className="text-sm text-muted-foreground">{loc.demographic_summary}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-500"><AlertTriangle className="h-4 w-4" /> Kelemahan Kompetitor</h4>
                      <ul className="space-y-1.5">
                        {loc.weaknesses?.map((w: string, i: number) => <li key={i} className="text-sm text-muted-foreground">• {w}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg bg-green-500/5 p-3">
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-500"><CheckCircle2 className="h-4 w-4" /> Inovasi Saya untuk Menang</h4>
                      <ul className="space-y-1.5">
                        {loc.innovations?.map((inn: string, i: number) => <li key={i} className="flex items-start gap-1.5 text-sm"><CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-green-500" /> {inn}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {blindSpots.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-500">
                <XCircle className="h-5 w-5" /> Zona Terlarang — Jangan Buka Lapak di Sini
              </h3>
              <div className="space-y-3">
                {blindSpots.map((bs) => (
                  <div key={bs.id} className="flex items-start gap-2 text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div className="flex-1">
                      <span className="font-medium">{bs.location_name}</span>
                      <p className="text-muted-foreground">{bs.blind_spot_reason}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-blue-500" onClick={() => openGoogleMaps(bs)}>
                      <Navigation className="h-3 w-3" /> Maps
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traffic Data from Google Maps */}
          {(() => {
            const locationMapping = getSection("location_mapping");
            const trafficItems = locationMapping?.traffic || [];
            if (trafficItems.length === 0) return null;
            return (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Car className="h-5 w-5 text-green-500" /> Data Lalu Lintas Rata-rata Harian
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {trafficItems.map((t: any, i: number) => {
                    const levelColor = t.overallTrafficLevel === "sangat tinggi" ? "text-red-500" : t.overallTrafficLevel === "tinggi" ? "text-amber-500" : t.overallTrafficLevel === "sedang" ? "text-blue-500" : "text-green-500";
                    const levelBg = t.overallTrafficLevel === "sangat tinggi" ? "bg-red-500/10" : t.overallTrafficLevel === "tinggi" ? "bg-amber-500/10" : t.overallTrafficLevel === "sedang" ? "bg-blue-500/10" : "bg-green-500/10";
                    return (
                      <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Kec. {t.district}</h4>
                          <Badge className={`${levelBg} ${levelColor} border-0 font-semibold`}>{t.overallTrafficLevel?.toUpperCase()}</Badge>
                        </div>
                        {/* Real metrics if available */}
                        {(t.avgDurationMinutes != null || (t.congestionPercent != null && t.congestionPercent > 0)) && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                              <div className="text-lg font-bold">{t.avgDurationMinutes != null ? t.avgDurationMinutes : "-"} <span className="text-xs font-normal text-muted-foreground">menit</span></div>
                              <div className="text-[10px] text-muted-foreground">Durasi rata-rata (5km)</div>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                              <div className="text-lg font-bold">{t.congestionPercent != null && t.congestionPercent > 0 ? t.congestionPercent : "-"}<span className="text-xs font-normal text-muted-foreground">%</span></div>
                              <div className="text-[10px] text-muted-foreground">Kemacetan vs normal</div>
                            </div>
                          </div>
                        )}
                        {/* Speed breakdown */}
                        {t.speedBreakdown && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-medium text-muted-foreground">Kondisi jalan</div>
                            <div className="flex h-3 overflow-hidden rounded-full">
                              {t.speedBreakdown.normalPct > 0 && <div className="bg-green-500" style={{ width: `${t.speedBreakdown.normalPct}%` }} />}
                              {t.speedBreakdown.slowPct > 0 && <div className="bg-amber-500" style={{ width: `${t.speedBreakdown.slowPct}%` }} />}
                              {t.speedBreakdown.jamPct > 0 && <div className="bg-red-500" style={{ width: `${t.speedBreakdown.jamPct}%` }} />}
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>🟢 Lancar {t.speedBreakdown.normalPct}%</span>
                              <span>🟡 Lambat {t.speedBreakdown.slowPct}%</span>
                              <span>🔴 Macet {t.speedBreakdown.jamPct}%</span>
                            </div>
                          </div>
                        )}
                        {/* Peak hours */}
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Jam sibuk</div>
                          {t.peakHours?.map((ph: any, pi: number) => (
                            <div key={pi} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{ph.time}</span>
                              <Badge variant="outline" className={`text-[10px] px-1.5 ${ph.level === "tinggi" ? "text-amber-500 border-amber-500/30" : ph.level === "rendah" ? "text-green-500 border-green-500/30" : "text-blue-500 border-blue-500/30"}`}>{ph.level}</Badge>
                            </div>
                          ))}
                        </div>
                        {t.routesSampled && <div className="text-[10px] text-muted-foreground text-right">Berdasarkan {t.routesSampled} rute sampel</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Competitor Analysis from Google Maps — Basic+ */}
          {features.competitor_detail && competitorAnalysis?.districts && competitorAnalysis.districts.length > 0 && (
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Store className="h-5 w-5 text-blue-500" /> Data Kompetitor dari Google Maps
              </h3>
              {competitorAnalysis.districts.map((d: any, di: number) => (
                <div key={di} className="rounded-xl border bg-card p-5">
                  <h4 className="mb-3 font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                    Kecamatan {d.district}
                  </h4>
                  <div className="space-y-4">
                    {d.competitors?.map((comp: any, ci: number) => {
                      const mapsUrl = buildGoogleMapsUrl(comp.name, comp.address);

                      return (
                        <div key={ci} className="rounded-lg border bg-muted/30 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-2">
                              <div className="font-semibold">{comp.name}</div>
                              <div className="text-xs text-muted-foreground">{comp.address || "Alamat tidak tersedia"}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => void openGoogleMaps(mapsUrl)}
                                >
                                  <MapPin className="mr-1 h-3.5 w-3.5" />
                                  Buka di Google Maps
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => copyText(mapsUrl, "Link Google Maps berhasil disalin!")}
                                >
                                  <Copy className="mr-1 h-3.5 w-3.5" />
                                  Salin link
                                </Button>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                              <span className="text-sm font-bold">{comp.rating}</span>
                              <span className="text-xs text-muted-foreground">({comp.totalReviews} review)</span>
                            </div>
                          </div>
                          {comp.reviews && comp.reviews.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                                <MessageSquare className="h-3.5 w-3.5" /> Review Pelanggan
                              </div>
                              {comp.reviews.slice(0, 3).map((rev: any, ri: number) => (
                                <div key={ri} className="rounded-md border bg-background p-3">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="text-xs font-medium">{rev.author}</span>
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: 5 }).map((_, si) => (
                                        <Star key={si} className={`h-3 w-3 ${si < (rev.rating || 0) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`} />
                                      ))}
                                    </div>
                                    {rev.time && <span className="text-xs text-muted-foreground">• {rev.time}</span>}
                                  </div>
                                  <p className="text-xs leading-relaxed text-muted-foreground">{rev.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!features.competitor_detail && (
            <UpgradeTeaser message="Lihat daftar kompetitor lengkap beserta rating" targetPlan="starter" {...upgradeProps} />
          )}
        </TabsContent>

        {/* TAB 4: Action Plan */}
        <TabsContent value="action" className="space-y-4">
          {plan ? (
            (() => {
              // Pro tier: tampilkan semua item tanpa cap. Free/Standard: dibatasi action_plan_count.
              const allDailyTasks = (plan.daily_actions || []).flatMap((da: any) => da.tasks || []);
              const allWeeklyKpis = plan.weekly_kpi || [];
              const allWeekItems = [...(plan.week1 || []), ...(plan.week2 || []), ...(plan.month1 || [])];
              const totalItems = allDailyTasks.length + allWeeklyKpis.length + allWeekItems.length;
              const maxActions = reportTier === "pro" ? totalItems : features.action_plan_count;
              const hiddenCount = Math.max(0, totalItems - maxActions);
              let itemsShown = 0;

              return (
                <>
                  {/* Daily Actions */}
                  {plan.daily_actions?.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Clock className="h-5 w-5 text-amber-500" /> Aksi Harian
                      </h3>
                      <div className="grid gap-4 md:grid-cols-3">
                        {plan.daily_actions.map((da: any, i: number) => {
                          const tasksToShow = (da.tasks || []).filter((_: string) => {
                            if (itemsShown >= maxActions) return false;
                            itemsShown++;
                            return true;
                          });
                          if (tasksToShow.length === 0) return null;
                          return (
                            <div key={i} className="rounded-xl border bg-card p-5">
                              <div className="mb-3 flex items-center gap-2">
                                <Badge className="bg-amber-500/10 text-amber-500 border-0">{da.day}</Badge>
                              </div>
                              <ul className="space-y-2">
                                {tasksToShow.map((task: string, ti: number) => (
                                  <li key={ti} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span>{task}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Weekly KPI — show only if still have budget */}
                  {itemsShown < maxActions && plan.weekly_kpi?.length > 0 && (
                    <div className="rounded-xl border bg-card p-5">
                      <h3 className="mb-4 flex items-center gap-2 font-semibold">
                        <Target className="h-5 w-5 text-green-500" /> KPI Mingguan
                      </h3>
                      <div className="space-y-3">
                        {plan.weekly_kpi.slice(0, maxActions - itemsShown).map((kpi: any, i: number) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                            <span className="text-sm font-medium">{kpi.metric}</span>
                            <Badge variant="secondary" className="text-xs">{kpi.target}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Week-based format fallback */}
                  {plan.week1?.length > 0 && (
                    <div className="rounded-xl border bg-card p-5">
                      <h3 className="mb-3 font-semibold">Minggu 1</h3>
                      <ul className="space-y-2">
                        {plan.week1.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.week2?.length > 0 && (
                    <div className="rounded-xl border bg-card p-5">
                      <h3 className="mb-3 font-semibold">Minggu 2</h3>
                      <ul className="space-y-2">
                        {plan.week2.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.month1?.length > 0 && (
                    <div className="rounded-xl border bg-card p-5">
                      <h3 className="mb-3 font-semibold">Bulan 1</h3>
                      <ul className="space-y-2">
                        {plan.month1.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* UpgradeTeaser hanya tampil jika benar-benar ada item ter-hide & belum tier Pro */}
                  {hiddenCount > 0 && reportTier !== "pro" && (
                    <UpgradeTeaser
                      message={`+${hiddenCount} aksi lagi tersedia di paket yang lebih tinggi`}
                      targetPlan={features.insight_level === 'summary' ? 'starter' : 'pro'}
                      {...upgradeProps}
                    />
                  )}
                </>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada rencana aksi</p>
            </div>
          )}
        </TabsContent>

        {/* TAB 5: Potensi Ekonomi */}
        <TabsContent value="economic" className="space-y-4">
          <EconomicPotentialTab
            economic={economicData}
            decision={decisionData}
            features={features}
            v3Meta={getSection('economic_v3_meta') || undefined}
            upgradeProps={upgradeProps}
          />
          {/* HPP Estimasi — F&B only, starter+ tier */}
          {isFnBCategory(businessInput?.product_category)
            && businessInput?.city
            && businessInput?.product_name
            && reportTier !== 'free' && (
              <HppEstimateSection
                productName={businessInput.product_name}
                productCategory={businessInput.product_category}
                cityApp={businessInput.city}
                priceMin={businessInput.price_range_min}
                priceMax={businessInput.price_range_max}
              />
            )}
        </TabsContent>

        {/* TAB: Harga Bahan Pokok (F&B only, all tiers) */}
        {isFnBCategory(businessInput?.product_category) && businessInput?.city && (
          <TabsContent value="commodity" className="space-y-4">
            <CommodityPricesTab cityApp={businessInput.city} />
          </TabsContent>
        )}

        {/* TAB 6: Keputusan Bisnis */}
        <TabsContent value="decision" className="space-y-4">
          <BusinessDecisionTab
            decision={decisionData}
            economic={economicData}
            features={features}
            upgradeProps={upgradeProps}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalysisDashboard;
