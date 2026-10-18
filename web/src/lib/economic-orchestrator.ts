import { supabase } from "@/integrations/supabase/client";
import { getDistrictPopulation, getCityExpenditure, getAllDistrictStats } from './data-queries';
import { calculateEconomics } from './economic-engine';
import { calculateDecision } from './decision-engine';
import { loadParams } from './engine-params';
import { logAnalysisError } from './analysis-error-logger';

export interface EconomicAnalysisInput {
  province: string;
  city: string;
  districts: string[];
  base_price_min: number;
  base_price_max: number;
  initial_capital: number;
  monthly_cost: number;
  target_margin_pct: number;
  product_category?: string;
  product_name?: string;
  business_scale?: string;
  employee_count?: number;
  operating_hours?: number;
  location_data_quality?: Record<string, {
    overall: 'high' | 'medium' | 'low' | 'failed';
    warnings: string[];
  }>;
}

export interface ExistingScore {
  traffic_score: number;      // 0-2.5
  competitor_gap: number;     // 0-2.5
  competitor_count: number;
  avg_competitor_rating?: number;
}

export async function runEconomicAnalysis(
  projectId: string,
  input: EconomicAnalysisInput,
  existingScores: Map<string, ExistingScore>,
  userId?: string
) {
  // Clean old results
  await supabase.from('economic_results').delete().eq('project_id', projectId);
  await supabase.from('decision_results').delete().eq('project_id', projectId);

  // Load engine parameters from database
  const engineParams = await loadParams();

  // Load CAPEX/OPEX benchmark for this category + scale (single fetch)
  const businessScaleKey = input.business_scale || 'mikro';
  const productCatKey = input.product_category || '';
  const catMap: Record<string, string> = {
    makanan_minuman: 'makanan_minuman', fashion_aksesoris: 'fashion', jasa_layanan: 'jasa',
    elektronik_gadget: 'elektronik', kecantikan_kesehatan: 'kecantikan',
    pertanian_peternakan: 'pertanian', pendidikan_kursus: 'pendidikan',
  };
  const dbCatKey = catMap[productCatKey] || productCatKey || 'jasa';
  const { data: capexBenchmark } = await supabase
    .from('capex_opex_benchmarks')
    .select('capex_min, capex_max, capex_items, opex_min, opex_max, opex_items')
    .eq('category', dbCatKey)
    .eq('business_scale', businessScaleKey)
    .maybeSingle();

  const cityExp = await getCityExpenditure(input.province, input.city);
  const cityStats = await getAllDistrictStats(input.province, input.city);

  // Log if city-level data not found
  if (userId && !cityExp) {
    await logAnalysisError({
      userId, source: 'expenditure', errorType: 'city_not_found',
      errorMessage: `Data expenditure tidak ditemukan untuk ${input.province}/${input.city}`,
      kabupatenKotaInput: input.city, province: input.province,
      context: { project_id: projectId },
    });
  }
  if (userId && cityStats.total_city_population <= 1) {
    await logAnalysisError({
      userId, source: 'population', errorType: 'city_not_found',
      errorMessage: `Data populasi kota tidak ditemukan untuk ${input.province}/${input.city}`,
      kabupatenKotaInput: input.city, province: input.province,
      context: { project_id: projectId },
    });
  }

  const results = [];

  // === MODAL EFFECTIVE ===
  // Jika user TIDAK isi modal (=0/null), pakai benchmark midpoint sebagai modal efektif
  // untuk semua perhitungan (working capital, BEP, profit). User akan tetap melihat
  // bahwa angka berasal dari benchmark via `capex_check.severity === 'missing'`.
  const userProvidedCapital = input.initial_capital && input.initial_capital > 0;
  const benchmarkMidCapex = capexBenchmark
    ? Math.round((Number(capexBenchmark.capex_min) + Number(capexBenchmark.capex_max)) / 2)
    : 0;
  const effectiveCapital = userProvidedCapital ? input.initial_capital : benchmarkMidCapex;

  for (const district of input.districts) {
    const distPop = await getDistrictPopulation(input.province, input.city, district);

    if (!distPop) {
      console.warn(`[Economic] Data populasi ${district} tidak ditemukan`);
      if (userId) {
        await logAnalysisError({
          userId, source: 'population', errorType: 'district_not_found',
          errorMessage: `Data populasi kecamatan tidak ditemukan: ${input.province}/${input.city}/${district}`,
          kabupatenKotaInput: input.city, province: input.province, district,
          context: { project_id: projectId },
        });
      }
      continue;
    }

    const existing = existingScores.get(district) || {
      traffic_score: 1.25, competitor_gap: 1.25, competitor_count: 5, avg_competitor_rating: 0,
    };

    // Normalize traffic_score from 0-2.5 to 0-1 for hybrid model
    const trafficScoreNormalized = existing.traffic_score / 2.5;

    const eco = calculateEconomics({
      district,
      population: distPop.total_population,
      location_type: distPop.location_type,
      city_avg_expenditure: cityExp?.avg_expenditure || 10000,
      expenditure_level: cityExp?.level || 'middle',
      total_city_population: cityStats.total_city_population,
      city_avg_density: cityStats.avg_density,
      district_density_per_km2: distPop.avg_density_per_km2,
      district_area_km2: distPop.area_km2,
      district_village_count: distPop.village_count,
      competitor_count: existing.competitor_count,
      avg_competitor_rating: existing.avg_competitor_rating || 0,
      base_price_min: input.base_price_min,
      base_price_max: input.base_price_max,
      initial_capital: effectiveCapital,
      monthly_cost: input.monthly_cost,
      target_margin_pct: input.target_margin_pct,
      traffic_score: trafficScoreNormalized,
      product_category: input.product_category,
      product_name: input.product_name,
      business_scale: input.business_scale || 'mikro',
      employee_count: input.employee_count,
      operating_hours: input.operating_hours,
      capex_benchmark: capexBenchmark ? {
        capex_min: Number(capexBenchmark.capex_min),
        capex_max: Number(capexBenchmark.capex_max),
        capex_items: capexBenchmark.capex_items,
        opex_min: Number(capexBenchmark.opex_min),
        opex_max: Number(capexBenchmark.opex_max),
        opex_items: capexBenchmark.opex_items,
      } : null,
    }, engineParams);

    // max_income = expenditure per kapita × location factor tertinggi (CBD=1.4)
    const maxIncome = Math.round((cityExp?.avg_expenditure || 10000) * 1.4);

    const dec = calculateDecision({
      population: distPop.total_population,
      max_population: cityStats.max_population,
      traffic_score_from_existing: existing.traffic_score,
      estimated_income: eco.income.estimatedIncome,
      max_income: maxIncome,
      competitor_gap_from_existing: existing.competitor_gap,
      density_proxy: distPop.total_population / Math.max(1, distPop.village_count),
      max_density: cityStats.max_population / Math.max(1, distPop.village_count),
    });

    // === FINANCIAL REALITY CHECK ===
    // Market score hanya mengukur potensi pasar — tapi keputusan akhir harus
    // mempertimbangkan apakah bisnis layak secara finansial dengan modal & biaya yg ada.
    const netProfit = eco.profitBep.monthlyNetProfit;
    const capexSeverity = eco.profitBep.capexCheck?.severity; // 'missing' | 'low' | 'adequate' | undefined
    // Hanya hitung underfunded kalau user MEMANG mengisi modal terlalu kecil ('low').
    // Saat 'missing' (user tidak isi), kita sudah substitusi dengan benchmark midpoint
    // → tidak fair menghukum decision.
    const isUnderfunded = capexSeverity === 'low';
    const isLossMaking = netProfit < 0;

    const dqOverall = input.location_data_quality?.[district]?.overall;
    const isLowQualityData = dqOverall === 'low' || dqOverall === 'failed';

    if (isLossMaking || isUnderfunded || isLowQualityData) {
      const reasons: string[] = [];
      if (isLossMaking) {
        reasons.push(`profit bulanan negatif (Rp ${(netProfit/1_000_000).toFixed(1)} juta)`);
      }
      if (isUnderfunded) {
        reasons.push('modal di bawah benchmark industri');
      }
      if (isLowQualityData) {
        reasons.push('kualitas data lokasi rendah');
      }
      const reasonText = reasons.join(' & ');

      // Severe: rugi DAN modal jauh di bawah → NO
      // Moderate: salah satu → CONDITIONAL (GO didowngrade, NO tetap NO)
      if (isLossMaking && isUnderfunded) {
        dec.decision = {
          decision: 'NO',
          reason: `Pasar potensial (skor ${dec.scores.marketScore}/10), tapi ${reasonText}. Tidak layak dijalankan dengan kondisi saat ini.`,
        };
      } else if (dec.decision.decision === 'GO') {
        dec.decision = {
          decision: 'CONDITIONAL',
          reason: `Pasar potensial (skor ${dec.scores.marketScore}/10), namun ${reasonText}. Perlu penyesuaian sebelum eksekusi.`,
        };
      }

      // Update insight agar konsisten dengan decision baru
      let fix = isUnderfunded
        ? 'tambah modal sesuai benchmark atau turunkan skala bisnis'
        : 'naikkan harga, kurangi opex, atau pilih lokasi dengan biaya operasional lebih rendah';
      if (isLowQualityData && !isLossMaking && !isUnderfunded) {
        fix = 'analisis ulang lokasi untuk dapatkan data yang lebih akurat';
      }
      dec.insight.recommendation = `Sebelum eksekusi: ${fix}.`;
      dec.insight.summary = `${dec.insight.strength}, namun ${reasonText} — ${fix}.`;
    }

    results.push({ district, distPop, economics: eco, decision: dec });

    // Save to DB
    await supabase.from('economic_results').insert({
      project_id: projectId, district,
      population_total: distPop.total_population,
      village_count: distPop.village_count,
      urban_village_count: distPop.urban_village_count,
      rural_village_count: distPop.rural_village_count,
      location_type: distPop.location_type,
      city_expenditure_avg: cityExp?.avg_expenditure || 0,
      expenditure_level: cityExp?.level || 'middle',
      estimated_district_income: eco.income.estimatedIncome,
      mobility_rate: eco.customers.mobilityRate,
      capture_rate: eco.customers.captureRate,
      estimated_daily_customers: eco.customers.dailyCustomers,
      base_price: Math.round((input.base_price_min + input.base_price_max) / 2),
      income_multiplier: eco.revenue.incomeMultiplier,
      avg_transaction: eco.revenue.avgTransaction,
      estimated_daily_revenue: eco.revenue.dailyRevenue,
      estimated_monthly_revenue: eco.revenue.monthlyRevenue,
      recommended_price_min: eco.pricing.recommendedMin,
      recommended_price_max: eco.pricing.recommendedMax,
      pricing_strategy: eco.pricing.strategy,
      estimated_margin_pct: input.target_margin_pct,
      estimated_monthly_cost: input.monthly_cost,
      estimated_monthly_profit: eco.profitBep.monthlyProfit,
      initial_capital: input.initial_capital,
      bep_days: eco.profitBep.bepDays,
      omzet_topdown: eco.hybrid.omzet_topdown,
      omzet_bottomup: eco.hybrid.omzet_bottomup,
      omzet_konservatif: eco.hybrid.omzet_konservatif,
      omzet_moderat: eco.hybrid.omzet_moderat,
      omzet_optimistis: eco.hybrid.omzet_optimistis,
      target_ratio: eco.topDown.targetRatio,
      category_spending_ratio: eco.topDown.categorySpendingRatio,
      conversion_rate: eco.bottomUp.conversionRate,
      competitor_quality_factor: eco.topDown.competitorQualityFactor,
    });

    // Save V3 metadata (trade area, capacity, sanity, profit benchmark) as analysis_result
    await supabase.from('analysis_results').insert({
      project_id: projectId,
      section: 'economic_v3_meta',
      content: {
        trade_area: eco.tradeArea,
        capacity_info: eco.capacityInfo,
        sanity_info: eco.sanityInfo,
        input_warnings: eco.inputWarnings || [],
        business_scale: eco.businessScale,
        capital_source: userProvidedCapital ? 'user' : 'benchmark',
        capital_user_input: input.initial_capital || 0,
        capital_effective: effectiveCapital,
        profit_benchmark: {
          benchmarkGrossMargin: eco.profitBep.benchmarkGrossMargin,
          benchmarkNetMargin: eco.profitBep.benchmarkNetMargin,
          benchmarkOpexRatio: eco.profitBep.benchmarkOpexRatio,
          monthlyGrossProfit: eco.profitBep.monthlyGrossProfit,
          monthlyOpex: eco.profitBep.monthlyOpex,
          monthlyNetProfit: eco.profitBep.monthlyNetProfit,
          adjustedMonthlyRevenue: eco.profitBep.adjustedMonthlyRevenue,
        },
        working_capital: eco.profitBep.workingCapital,
        margin_comparison: eco.profitBep.marginComparison,
        opex_info: eco.profitBep.opexInfo,
        capex_check: eco.profitBep.capexCheck,
      } as any,
    });

    await supabase.from('decision_results').insert({
      project_id: projectId, district,
      population_score: dec.scores.populationScore,
      traffic_score: dec.scores.trafficScore,
      income_score: dec.scores.incomeScore,
      competitor_gap_score: dec.scores.competitorGapScore,
      density_score: dec.scores.densityScore,
      market_score: dec.scores.marketScore,
      decision: dec.decision.decision,
      decision_reason: dec.decision.reason,
      tradeoff_label: dec.tradeoff.label,
      tradeoff_detail: dec.tradeoff.detail,
      insight_strength: dec.insight.strength,
      insight_weakness: dec.insight.weakness,
      insight_recommendation: dec.insight.recommendation,
      insight_summary: dec.insight.summary,
    });
  }

  return results;
}
