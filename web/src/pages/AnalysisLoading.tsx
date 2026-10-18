import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateMockAnalysis } from "@/lib/mockAnalysis";
import { runInputGuardrail } from "@/lib/guardrails/inputGuardrail";
import { runOutputGuardrail } from "@/lib/guardrails/outputGuardrail";
import { runEconomicAnalysis, type ExistingScore } from "@/lib/economic-orchestrator";
import { CheckCircle2, Circle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const steps = [
  "Validasi input bisnis...",
  "Menentukan koordinat kecamatan...",
  "Menganalisis kepadatan kompetitor...",
  "Menganalisis gap rating kompetitor...",
  "Mengukur level traffic area...",
  "Mendeteksi landmark strategis...",
  "Mengirim data riil ke AI Engine...",
  "AI sedang menyusun analisis...",
  "Menghitung potensi ekonomi & keputusan...",
  "Memfinalisasi dashboard...",
];

const tips = [
  "Tahukah Anda? 80% UMKM yang melakukan riset pasar tumbuh 2x lebih cepat.",
  "Tips: Lokasi strategis bisa meningkatkan penjualan hingga 300%.",
  "Data kompetitor riil dari Google Maps sedang diambil...",
  "Tips: Penawaran terbatas (scarcity) meningkatkan konversi hingga 40%.",
  "Skor lokasi dihitung dari 4 metrik data riil Google Maps.",
  "AI sedang menganalisis ribuan data point untuk rekomendasi terbaik.",
];

// Geocoding: konversi kecamatan → koordinat
function estimateCoordinates(city: string, district: string): { lat: number; lng: number } {
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    "jakarta": { lat: -6.2088, lng: 106.8456 },
    "bandung": { lat: -6.9175, lng: 107.6191 },
    "surabaya": { lat: -7.2575, lng: 112.7521 },
    "medan": { lat: 3.5952, lng: 98.6722 },
    "semarang": { lat: -6.9666, lng: 110.4196 },
    "yogyakarta": { lat: -7.7956, lng: 110.3695 },
    "makassar": { lat: -5.1477, lng: 119.4327 },
    "palembang": { lat: -2.9761, lng: 104.7754 },
    "tangerang": { lat: -6.1783, lng: 106.63 },
    "depok": { lat: -6.4025, lng: 106.7942 },
    "bekasi": { lat: -6.2383, lng: 106.9756 },
    "bogor": { lat: -6.5971, lng: 106.806 },
    "malang": { lat: -7.9786, lng: 112.6317 },
    "denpasar": { lat: -8.6705, lng: 115.2126 },
  };
  const cityLower = city.toLowerCase().replace(/kota |kabupaten /g, "");
  const coords = cityCoords[cityLower] || { lat: -6.2, lng: 106.85 };
  let hash = 0;
  for (let i = 0; i < district.length; i++) hash = (hash * 31 + district.charCodeAt(i)) % 1000;
  return {
    lat: coords.lat + (hash % 50 - 25) * 0.001,
    lng: coords.lng + ((hash * 7) % 50 - 25) * 0.001,
  };
}

// Try Google Geocoding API first, fallback to hash-based
async function geocodeDistrict(
  district: string, city: string
): Promise<{ lat: number; lng: number }> {
  try {
    const { data } = await supabase.functions.invoke("google-maps-analysis", {
      body: {
        action: "geocode",
        params: { query: `${district}, ${city}, Indonesia` },
      },
    });
    if (data?.lat && data?.lng) return { lat: data.lat, lng: data.lng };
  } catch { /* fallback */ }
  return estimateCoordinates(city, district);
}

async function geocodeSpecificLocation(
  locationName: string,
  district: string,
  city: string
): Promise<{ lat: number; lng: number }> {
  try {
    const { data } = await supabase.functions.invoke("google-maps-analysis", {
      body: {
        action: "geocode",
        params: { query: `${locationName}, ${district}, ${city}, Indonesia` },
      },
    });
    if (data?.lat && data?.lng) return { lat: data.lat, lng: data.lng };
  } catch {
    /* fallback */
  }

  const districtCenter = await geocodeDistrict(district, city);
  const seed = `${locationName}|${district}|${city}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 10000;

  return {
    lat: districtCenter.lat + ((hash % 25) - 12) * 0.00035,
    lng: districtCenter.lng + ((((hash * 7) % 25) - 12)) * 0.00035,
  };
}

const AnalysisLoading = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [guardrailError, setGuardrailError] = useState<string | null>(null);
  const [scoringDetail, setScoringDetail] = useState("");

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 4000);

      const runAnalysis = async () => {
      const startTime = Date.now();
      let analysisRunId: string | null = null;

      try {
        // ========== STEP 0: Load input ==========
        setActiveStep(0);
        const { data: input } = await supabase
          .from("business_inputs")
          .select("*")
          .eq("project_id", id)
          .single();

        if (!input) { navigate(`/app/analysis/${id}`, { replace: true }); return; }

        // Guard: jangan jalankan ulang (dan hapus hasil lama) bila proyek sudah selesai,
        // kecuali diminta eksplisit lewat ?rerun=1 (mis. tombol "Jalankan Ulang").
        const isExplicitRerun = new URLSearchParams(window.location.search).get("rerun") === "1";
        if (!isExplicitRerun) {
          const { data: proj } = await supabase.from("projects").select("status").eq("id", id!).single();
          const { count: existingResults } = await supabase
            .from("analysis_results")
            .select("id", { count: "exact", head: true })
            .eq("project_id", id!);
          if (proj?.status === "completed" && (existingResults ?? 0) > 0) {
            navigate(`/app/analysis/${id}`, { replace: true });
            return;
          }
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        // Calculate run_number for this project
        const { count: prevRuns } = await supabase
          .from("analysis_runs")
          .select("id", { count: "exact", head: true })
          .eq("project_id", id!);

        // Create analysis run record
        const { data: runData } = await supabase.from("analysis_runs").insert({
          project_id: id!,
          user_id: user?.id || '',
          run_number: (prevRuns || 0) + 1,
          districts_analyzed: input.districts,
          status: 'running',
        }).select("id").single();

        analysisRunId = runData?.id || null;

        // ========== STEP 1: INPUT GUARDRAIL ==========
        const inputGuard = runInputGuardrail(input);
        if (!inputGuard.passed) {
          setGuardrailError(inputGuard.errors.join(", "));
          toast.error("Input tidak valid: " + inputGuard.errors[0]);
          setTimeout(() => navigate(`/app/analysis/${id}`), 3000);
          return;
        }

        // Clean up old data
        await supabase.from("analysis_results").delete().eq("project_id", id!);
        await supabase.from("strategic_locations").delete().eq("project_id", id!);
        await supabase.from("location_scores_cache").delete().eq("project_id", id!);
        await supabase.from("economic_results").delete().eq("project_id", id!);
        await supabase.from("decision_results").delete().eq("project_id", id!);

        // ========== STEP 2: GEOCODING ==========
        setActiveStep(1);
        const districtLocations: Array<{ label: string; district: string; latitude: number; longitude: number }> = [];
        for (const district of input.districts) {
          setScoringDetail(`Geocoding: ${district}`);
          const coords = await geocodeDistrict(district, input.city);
          districtLocations.push({
            label: `Pusat ${district}`,
            district,
            latitude: coords.lat,
            longitude: coords.lng,
          });
        }
        console.log("[Geocoding] Resolved coordinates:", districtLocations);

        // ========== STEP 3-6: LOCATION SCORING via Edge Function ==========
        setActiveStep(2);
        let scoringResults: any[] = [];

        try {
          const { data: checkResult } = await supabase.functions.invoke("google-maps-analysis", {
            body: { action: "check_api_key", params: {} },
          });
          const hasGoogleMaps = !!checkResult?.available;

          if (hasGoogleMaps) {
            setScoringDetail("Memulai scoring lokasi...");

            const { data: scoreData, error: scoreError } = await supabase.functions.invoke("score-locations", {
              body: {
                projectId: id,
                locations: districtLocations,
                productCategory: input.product_category,
                productName: input.product_name,
                productDescription: input.product_description,
                radiusMeters: 1000,
                city: input.city || "",
                districts: input.districts || [],
              },
            });

            if (scoreError) {
              console.error("Score locations error:", scoreError);
            } else if (scoreData?.scores) {
              // Defensive: some cached rows can come back with JSONB array
              // fields serialized as strings; normalize to real arrays so
              // downstream .map()/.slice() calls never crash the whole flow.
              const toArray = (v: any) => {
                if (Array.isArray(v)) return v;
                if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
                return [];
              };
              scoringResults = scoreData.scores.map((s: any) => ({
                ...s,
                competitor_density: { ...s.competitor_density, competitors: toArray(s.competitor_density?.competitors) },
                landmark_potential: { ...s.landmark_potential, landmarks: toArray(s.landmark_potential?.landmarks) },
              }));
              console.log("[Scoring] Results:", scoringResults.map((s: any) => `${s.label}: ${s.total_score}`));
            }

            // Update steps progressively
            setActiveStep(3);
            setScoringDetail("Rating gap kompetitor...");
            await new Promise(r => setTimeout(r, 500));
            setActiveStep(4);
            setScoringDetail("Level traffic...");
            await new Promise(r => setTimeout(r, 500));
            setActiveStep(5);
            setScoringDetail("Deteksi landmark...");
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (e) {
          console.error("Scoring failed:", e);
        }

        // ========== STEP 7: AI ANALYSIS with scoring data ==========
        setActiveStep(6);
        setScoringDetail("Menyiapkan konteks data riil...");

        // Build scoring context for AI
        let scoringContext = "";
        if (scoringResults.length > 0) {
          scoringContext = "\n\n--- DATA SKOR LOKASI DARI GOOGLE MAPS (DATA RIIL) ---\n";
          for (const s of scoringResults) {
            scoringContext += `\n📍 ${s.label} (${s.district}):\n`;
            scoringContext += `  Skor Total: ${s.total_score}/10\n`;
            scoringContext += `  🏪 Kepadatan Kompetitor: ${s.competitor_density.score}/2.5 — ${s.competitor_density.explanation}\n`;
            if (s.competitor_density.competitors?.length > 0) {
              scoringContext += `     Kompetitor: ${s.competitor_density.competitors.slice(0, 5).map((c: any) => `${c.name} (${c.rating}★, ${c.review_count} review)`).join(", ")}\n`;
            }
            scoringContext += `  ⭐ Gap Rating: ${s.rating_gap.score}/2.5 — ${s.rating_gap.explanation}\n`;
            scoringContext += `  🚗 Traffic: ${s.traffic_level.score}/2.5 — ${s.traffic_level.explanation}\n`;
            scoringContext += `  🏛️ Landmark: ${s.landmark_potential.score}/2.5 — ${s.landmark_potential.explanation}\n`;
            if (s.landmark_potential.landmarks?.length > 0) {
              scoringContext += `     Landmark: ${s.landmark_potential.landmarks.slice(0, 5).map((l: any) => l.name).join(", ")}\n`;
            }
          }
          scoringContext += `\nGUNAKAN data skor di atas sebagai DASAR analisis lokasi. Jangan mengarang data sendiri.\n`;
        }

        // Also build competitor context from scoring data
        let competitorData: any[] = [];
        let trafficData: any[] = [];
        for (const s of scoringResults) {
          if (s.competitor_density?.competitors?.length > 0) {
            competitorData.push({
              district: s.district,
              competitors: s.competitor_density.competitors.map((c: any) => ({
                name: c.name,
                rating: c.rating,
                totalReviews: c.review_count,
                address: c.address || "",
                reviews: (c.reviews || []).map((r: any) => ({
                  rating: r.rating || 0,
                  text: r.text || "",
                })),
              })),
            });
          }
          trafficData.push({
            district: s.district,
            overallTrafficLevel: s.traffic_level.score >= 2.0 ? "tinggi" :
              s.traffic_level.score >= 1.2 ? "sedang" : "rendah",
            peakHours: [
              { time: "07:00-09:00", level: "tinggi", description: "Jam berangkat kerja" },
              { time: "11:30-13:30", level: "sedang", description: "Jam makan siang" },
              { time: "16:30-19:00", level: "tinggi", description: "Jam pulang kerja" },
            ],
            congestionPercent: s.traffic_level.congestion_ratio
              ? Math.round(Math.max(0, (s.traffic_level.congestion_ratio - 1)) * 100)
              : null,
            avgDurationMinutes: s.traffic_level.avg_duration_seconds
              ? parseFloat((s.traffic_level.avg_duration_seconds / 60).toFixed(1))
              : null,
            routesSampled: null,
          });
        }

        setActiveStep(7);
        setScoringDetail("AI sedang menyusun analisis...");

        let analysis: any;
        let usedFallback = false;
        let qualityData: any = null;

        try {
          const { data: aiResult, error: aiError } = await supabase.functions.invoke("ai-analysis", {
            body: {
              businessInput: input,
              competitorData,
              trafficData,
              scoringContext, // Pass scoring data as extra context
            },
          });

          if (aiError?.message?.includes("Input tidak valid") || aiResult?.guardrail === "input_blocked") {
            setGuardrailError(aiResult?.details?.join(", ") || "Input ditolak");
            toast.error("Input ditolak: " + (aiResult?.details?.[0] || "Konten terlarang"));
            setTimeout(() => navigate(`/app/analysis/${id}`), 3000);
            return;
          }

          if (aiError || !aiResult?.success) {
            throw new Error(aiError?.message || aiResult?.error || "AI analysis failed");
          }

          analysis = aiResult.analysis;
          qualityData = aiResult.quality || null;

          const clientQuality = runOutputGuardrail(input, analysis);
          if (clientQuality.action === "block") throw new Error("Output blocked by safety guardrail");
        } catch (aiErr) {
          console.warn("AI analysis failed, using mock fallback:", aiErr);
          usedFallback = true;
          const mock = generateMockAnalysis({
            product_name: input.product_name,
            product_category: input.product_category,
            product_description: input.product_description,
            price_range_min: input.price_range_min,
            price_range_max: input.price_range_max,
            unique_selling_point: input.unique_selling_point,
            business_scale: input.business_scale,
            monthly_budget: input.monthly_budget,
            target_age_min: input.target_age_min ?? 18,
            target_age_max: input.target_age_max ?? 45,
            target_gender: input.target_gender ?? "semua",
            target_segments: input.target_segments,
            province: input.province,
            city: input.city,
            districts: input.districts,
            specific_locations: input.specific_locations,
            known_competitors: input.known_competitors,
          });
          analysis = {
            executive_summary: mock.executiveSummary,
            demographic_analysis: mock.demographicAnalysis,
            psychographic_analysis: mock.psychographicAnalysis,
            irresistible_offer: mock.irresistibleOffer,
            action_plan: mock.actionPlan,
            locations: mock.locations,
          };
        }

        // ========== STEP 8: SAVE & DISPLAY ==========
        setActiveStep(9);
        setScoringDetail("Menyimpan hasil...");

        const sections: Array<{ section: string; content: any }> = [
          { section: "executive_summary", content: analysis.executive_summary },
          { section: "demographic_analysis", content: analysis.demographic_analysis },
          { section: "psychographic_analysis", content: analysis.psychographic_analysis },
          { section: "irresistible_offer", content: analysis.irresistible_offer },
          { section: "action_plan", content: analysis.action_plan },
        ];

        if (competitorData.length > 0) {
          sections.push({
            section: "competitor_analysis",
            content: {
              source: "google_maps_scoring",
              districts: competitorData.map((d) => ({
                district: d.district,
                competitors: d.competitors,
              })),
            },
          });
        }

        if (trafficData.length > 0) {
          sections.push({
            section: "location_mapping",
            content: { source: "google_maps_scoring", traffic: trafficData },
          });
        }

        if (analysis.commute_flow) {
          sections.push({ section: "commute_flow", content: analysis.commute_flow });
        }

        sections.push({
          section: "_metadata",
          content: {
            used_fallback: usedFallback,
            generated_at: new Date().toISOString(),
            quality_score: qualityData?.score || null,
            quality_action: qualityData?.action || null,
            quality_flags: qualityData?.flags || [],
            scoring_data_available: scoringResults.length > 0,
          },
        });

        for (const s of sections) {
          await supabase.from("analysis_results").insert({
            project_id: id!,
            section: s.section,
            content: s.content,
          });
        }

        // Save strategic locations using SCORING data for ranks
        const locations = analysis.locations || [];
        const blindSpots = locations.filter((l: any) => l.is_blind_spot);
        const candidates = locations.filter((l: any) => !l.is_blind_spot);

        // Match AI candidates to scoring results by district as initial ranking
        const scoredCandidates = candidates.map((loc: any) => {
          const districtScore = scoringResults.find((s: any) =>
            s.district.toLowerCase() === (loc.district || "").toLowerCase()
          );
          const realScore = districtScore?.total_score || 5;
          const scoreBreakdown = districtScore ? {
            competitor_density: districtScore.competitor_density,
            rating_gap: districtScore.rating_gap,
            traffic_level: districtScore.traffic_level,
            landmark_potential: districtScore.landmark_potential,
            total: districtScore.total_score,
          } : null;

          return { loc, realScore, scoreBreakdown };
        });

        // Initial top 3 by district-level score, then re-score by exact location coordinates
        scoredCandidates.sort((a: any, b: any) => b.realScore - a.realScore);
        let topLocations = scoredCandidates.slice(0, 3);

        const topLocationInputs = await Promise.all(
          topLocations.map(async ({ loc }: any) => {
            const district = loc.district || input.districts[0];
            const coords = (loc.lat && loc.lng)
              ? { lat: loc.lat, lng: loc.lng }
              : await geocodeSpecificLocation(loc.location_name, district, input.city);
            return {
              label: loc.location_name,
              district,
              latitude: coords.lat,
              longitude: coords.lng,
            };
          })
        );

        const topLocationCoordsMap = Object.fromEntries(
          topLocationInputs.map((item) => [item.label, { lat: item.latitude, lng: item.longitude }])
        );

        if (topLocationInputs.length > 0) {
        try {
          const { data: finalScoreData, error: finalScoreError } = await supabase.functions.invoke("score-locations", {
            body: {
              projectId: id,
              locations: topLocationInputs,
              productCategory: input.product_category,
              productName: input.product_name,
              productDescription: input.product_description,
              radiusMeters: 1000,
              city: input.city || "",
              districts: input.districts || [],
            },
          });

          if (finalScoreError) {
            console.error("Final location scoring error:", finalScoreError);
          } else if (finalScoreData?.scores?.length) {
            const finalScoreMap = Object.fromEntries(
              finalScoreData.scores.map((s: any) => [
                s.label,
                {
                  realScore: s.total_score,
                  scoreBreakdown: {
                    competitor_density: s.competitor_density,
                    rating_gap: s.rating_gap,
                    traffic_level: s.traffic_level,
                    landmark_potential: s.landmark_potential,
                    total: s.total_score,
                  },
                },
              ])
            );

            topLocations = topLocations
              .map((item: any) => ({
                ...item,
                realScore: finalScoreMap[item.loc.location_name]?.realScore ?? item.realScore,
                scoreBreakdown: finalScoreMap[item.loc.location_name]?.scoreBreakdown ?? item.scoreBreakdown,
              }))
              .sort((a: any, b: any) => b.realScore - a.realScore);

            console.log("[Location Selection] Final exact-location scores:", topLocations.map((t: any) => `${t.loc.location_name} (${t.realScore})`));
          }
        } catch (finalScoreErr) {
          console.error("Final exact-location scoring failed:", finalScoreErr);
        }
        } // end if topLocationInputs.length > 0

        console.log(`[Location Selection] ${candidates.length} candidates → top 3:`,
          topLocations.map((t: any) => `${t.loc.location_name} (${t.realScore})`));

        const locationReasoningMap: Record<string, any> = {};

        for (let i = 0; i < topLocations.length; i++) {
          const { loc, realScore, scoreBreakdown } = topLocations[i];
          const coords = topLocationCoordsMap[loc.location_name] || estimateCoordinates(input.city, loc.district || input.districts[0]);
          locationReasoningMap[loc.location_name] = {
            reasoning: loc.reasoning || null,
            traffic_summary: loc.traffic_summary || null,
            demographic_summary: loc.demographic_summary || null,
            location_criteria: loc.location_criteria || null,
            parking_ease: loc.parking_ease || null,
          };

          await supabase.from("strategic_locations").insert({
            project_id: id!,
            location_name: loc.location_name,
            district: loc.district || input.districts[0],
            score: realScore,
            lat: coords.lat,
            lng: coords.lng,
            strengths: loc.strengths || [],
            weaknesses: loc.weaknesses || [],
            innovations: loc.innovations || [],
            is_blind_spot: false,
            blind_spot_reason: null,
            rank: i + 1,
            score_breakdown: scoreBreakdown,
          });
        }

        // Save blind spots
        for (const loc of blindSpots) {
          const coords = estimateCoordinates(input.city, loc.district || input.districts[0]);
          const districtScore = scoringResults.find((s: any) =>
            s.district.toLowerCase() === (loc.district || "").toLowerCase()
          );
          locationReasoningMap[loc.location_name] = {
            reasoning: loc.reasoning || null,
            traffic_summary: loc.traffic_summary || null,
            demographic_summary: loc.demographic_summary || null,
            location_criteria: loc.location_criteria || null,
            parking_ease: loc.parking_ease || null,
          };

          await supabase.from("strategic_locations").insert({
            project_id: id!,
            location_name: loc.location_name,
            district: loc.district || input.districts[0],
            score: Math.min(loc.score || 2, 4),
            lat: loc.lat || coords.lat,
            lng: loc.lng || coords.lng,
            strengths: [],
            weaknesses: loc.weaknesses || [],
            innovations: [],
            is_blind_spot: true,
            blind_spot_reason: loc.blind_spot_reason || null,
            rank: null,
            score_breakdown: districtScore ? {
              competitor_density: districtScore.competitor_density,
              rating_gap: districtScore.rating_gap,
              traffic_level: districtScore.traffic_level,
              landmark_potential: districtScore.landmark_potential,
              total: districtScore.total_score,
            } : null,
          });
        }

        // Update recommendation_score from real scores
        if (topLocations.length > 0 && analysis.executive_summary) {
          const avgScore = Math.round(
            (topLocations.reduce((sum: number, t: any) => sum + t.realScore, 0) / topLocations.length) * 10
          ) / 10;
          analysis.executive_summary.recommendation_score = avgScore;

          await supabase.from("analysis_results")
            .delete()
            .eq("project_id", id!)
            .eq("section", "executive_summary");
          await supabase.from("analysis_results").insert({
            project_id: id!,
            section: "executive_summary",
            content: analysis.executive_summary,
          });
        }

        if (Object.keys(locationReasoningMap).length > 0) {
          await supabase.from("analysis_results").insert({
            project_id: id!,
            section: "location_reasoning",
            content: locationReasoningMap,
          });
        }

        // ========== STEP 9: ECONOMIC & DECISION ENGINE ==========
        setActiveStep(8);
        setScoringDetail("Menghitung estimasi ekonomi...");

        try {
          const rawEcoParams = localStorage.getItem(`economic-params-${id}`);
          const ecoParams = rawEcoParams ? JSON.parse(rawEcoParams) : null;

          // Build existing scores map from scoringResults — AGGREGATE per district
          // (sebelumnya bug: overwrite per lokasi, lokasi terakhir menang & bisa outlier
          // misal "Pusat" dengan 1 kompetitor → competitor_gap_score 10/10 padahal lokasi lain ramai)
          const grouped = new Map<string, typeof scoringResults>();
          for (const s of scoringResults) {
            if (!grouped.has(s.district)) grouped.set(s.district, [] as any);
            (grouped.get(s.district) as any).push(s);
          }
          const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          const existingScoresMap = new Map<string, ExistingScore>();
          for (const [district, items] of grouped) {
            existingScoresMap.set(district, {
              traffic_score: avg(items.map(s => s.traffic_level?.score || 1.25)),
              competitor_gap: avg(items.map(s => s.rating_gap?.score || 1.25)),
              competitor_count: Math.round(avg(items.map(s => s.competitor_density?.raw_count || 5))),
              avg_competitor_rating: avg(items.map(s => s.rating_gap?.avg_rating || 0).filter(v => v > 0)),
            });
          }

          // Aggregate data_quality per district — pilih level terburuk
          const QUALITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1, failed: 0 };
          const dataQualityMap: Record<string, { overall: 'high' | 'medium' | 'low' | 'failed'; warnings: string[] }> = {};
          for (const [district, items] of grouped) {
            const qualities = items.map((s: any) => s.data_quality).filter(Boolean);
            if (qualities.length === 0) continue;
            const worst = qualities.reduce((acc: any, q: any) =>
              QUALITY_RANK[q.overall] < QUALITY_RANK[acc.overall] ? q : acc
            );
            const allWarnings = Array.from(new Set(qualities.flatMap((q: any) => q.warnings || [])));
            dataQualityMap[district] = { overall: worst.overall, warnings: allWarnings };
          }

          // Build per-location quality map (by label) untuk dashboard UI
          const dataQualityByLabel: Record<string, any> = {};
          for (const s of scoringResults) {
            if (s.data_quality) {
              dataQualityByLabel[s.label] = {
                overall: s.data_quality.overall,
                warnings: s.data_quality.warnings || [],
                from_cache: !!s.from_cache,
                cache_age_days: s.cache_age_days || 0,
              };
            }
          }
          if (Object.keys(dataQualityByLabel).length > 0) {
            await supabase.from("analysis_results").insert({
              project_id: id!,
              section: "location_data_quality",
              content: dataQualityByLabel,
            });
          }


          await runEconomicAnalysis(
            id!,
            {
              province: input.province,
              city: input.city,
              districts: input.districts,
              base_price_min: ecoParams?.base_price_min || input.price_range_min || 10000,
              base_price_max: ecoParams?.base_price_max || input.price_range_max || 50000,
              // Pass 0 when user leaves blank — engine/UI will use benchmark scenarios
              initial_capital: ecoParams?.initial_capital ?? 0,
              monthly_cost: ecoParams?.monthly_cost ?? input.monthly_budget ?? 0,
              // Wizard tidak meminta margin — pass 0 supaya engine pakai benchmark net margin dari DB (capex_opex_benchmarks)
              target_margin_pct: ecoParams?.target_margin_pct ?? 0,
              product_category: input.product_category,
              product_name: input.product_name,
              business_scale: ecoParams?.business_scale || input.business_scale || 'mikro',
              employee_count: ecoParams?.employee_count || 1,
              operating_hours: ecoParams?.operating_hours || 8,
              location_data_quality: dataQualityMap,
            },
            existingScoresMap,
            user?.id
          );

          // Clean up localStorage
          localStorage.removeItem(`economic-params-${id}`);
          console.log("[Economic] Analysis completed");
        } catch (ecoErr) {
          console.warn("[Economic] Engine failed, skipping:", ecoErr);
        }

        // Mark analysis run as completed
        if (analysisRunId) {
          await supabase.from("analysis_runs").update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
          }).eq("id", analysisRunId);
        }

        await supabase.from("projects").update({ status: "completed" }).eq("id", id!);
      } catch (err) {
        console.error("Analysis error:", err);

        // Mark analysis run as failed
        if (analysisRunId) {
          await supabase.from("analysis_runs").update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            error_message: err instanceof Error ? err.message : String(err),
          }).eq("id", analysisRunId);
        }
      }

      navigate(`/app/analysis/${id}`, { replace: true });
    };

    runAnalysis();

    return () => {
      clearInterval(tipInterval);
    };
  }, [id, navigate]);

  return (
    <div className="fixed inset-0 gradient-navy-dark flex items-center justify-center">
      <div className="mx-auto max-w-md px-4 text-center">
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-accent/20 border-t-accent" />
          <div className="absolute inset-2 animate-pulse rounded-full gradient-amber opacity-20" />
        </div>

        {guardrailError ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/20">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-destructive">Input Ditolak</h1>
            <p className="mb-4 text-sm text-primary-foreground/60">{guardrailError}</p>
            <p className="text-xs text-primary-foreground/40">Mengalihkan ke dashboard...</p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-primary-foreground">Menganalisis Data Anda...</h1>
            <p className="mb-2 text-sm text-primary-foreground/50">AI Engine + Data Riil Google Maps</p>
            {scoringDetail && (
              <p className="mb-6 text-xs text-amber-500/80 animate-pulse">{scoringDetail}</p>
            )}
          </>
        )}

        <div className="mb-8 space-y-3 text-left">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm transition-all ${i < activeStep ? "text-green-500" : i === activeStep ? "text-amber-500" : "text-primary-foreground/30"}`}>
              {i < activeStep ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : i === activeStep ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Circle className="h-4 w-4 shrink-0" />
              )}
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-4">
          <p className="text-sm text-primary-foreground/60 transition-all">{tips[tipIndex]}</p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisLoading;
