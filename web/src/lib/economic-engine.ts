// ============================================================
// ECONOMIC ENGINE V3 — Trade Area, Capacity Cap, Sanity Check
// ============================================================

import { getParam } from './engine-params';
import { resolveCategory, type CategoryKey } from './category-params';

type Params = Map<string, number>;

// Map old category keys to DB category keys
function mapCategoryToDbKey(categoryKey: CategoryKey): string {
  const map: Record<string, string> = {
    makanan_minuman: 'makanan_minuman',
    fashion_aksesoris: 'fashion',
    jasa_layanan: 'jasa',
    elektronik_gadget: 'elektronik',
    kecantikan_kesehatan: 'kecantikan',
    pertanian_peternakan: 'pertanian',
    pendidikan_kursus: 'pendidikan',
    default: 'jasa',
  };
  return map[categoryKey] || 'jasa';
}

// ============================================================
// AFFORDABILITY RATE
// ============================================================
function getAffordabilityRate(params: Params, avgPrice: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0.03;
  const ratio = avgPrice / monthlyIncome;
  const t1 = getParam(params, '_global', 'afford_tier1_ratio_max', 0.01);
  const t2 = getParam(params, '_global', 'afford_tier2_ratio_max', 0.03);
  const t3 = getParam(params, '_global', 'afford_tier3_ratio_max', 0.10);
  const t4 = getParam(params, '_global', 'afford_tier4_ratio_max', 0.25);
  const t5 = getParam(params, '_global', 'afford_tier5_ratio_max', 0.50);
  if (ratio <= t1) return getParam(params, '_global', 'afford_tier1_rate', 0.70);
  if (ratio <= t2) return getParam(params, '_global', 'afford_tier2_rate', 0.50);
  if (ratio <= t3) return getParam(params, '_global', 'afford_tier3_rate', 0.30);
  if (ratio <= t4) return getParam(params, '_global', 'afford_tier4_rate', 0.15);
  if (ratio <= t5) return getParam(params, '_global', 'afford_tier5_rate', 0.07);
  return getParam(params, '_global', 'afford_tier6_rate', 0.03);
}

// ============================================================
// COMPETITOR QUALITY — rating-based
// ============================================================
function getCompetitorQualityFactor(params: Params, avgCompetitorRating: number): number {
  if (avgCompetitorRating <= 0) return 1.0;
  if (avgCompetitorRating < 3.5) return getParam(params, '_global', 'comp_quality_rating_below_3_5', 1.3);
  if (avgCompetitorRating < 4.0) return getParam(params, '_global', 'comp_quality_rating_3_5_to_4_0', 1.1);
  if (avgCompetitorRating < 4.3) return getParam(params, '_global', 'comp_quality_rating_4_0_to_4_3', 1.0);
  if (avgCompetitorRating < 4.6) return getParam(params, '_global', 'comp_quality_rating_4_3_to_4_6', 0.85);
  return getParam(params, '_global', 'comp_quality_rating_above_4_6', 0.7);
}

// ============================================================
// INCOME LEVEL CLASSIFICATION
// ============================================================
function classifyIncomeLevel(params: Params, expenditurePerCapita: number, dbLevel: string | null): string {
  if (dbLevel && ['low', 'middle', 'high'].includes(dbLevel.toLowerCase())) return dbLevel.toLowerCase();
  const lowMax = getParam(params, '_global', 'income_threshold_low_max', 800000);
  const highMin = getParam(params, '_global', 'income_threshold_high_min', 1800000);
  if (expenditurePerCapita < lowMax) return 'low';
  if (expenditurePerCapita > highMin) return 'high';
  return 'middle';
}

// ============================================================
// DENSITY MULTIPLIER
// ============================================================
function getDensityMultiplier(params: Params, density: number): number {
  const veryLow = getParam(params, '_global', 'density_very_low_max', 500);
  const low = getParam(params, '_global', 'density_low_max', 2000);
  const medium = getParam(params, '_global', 'density_medium_max', 8000);
  const high = getParam(params, '_global', 'density_high_max', 15000);
  if (density < veryLow) return getParam(params, '_global', 'density_mult_very_low', 0.4);
  if (density < low) return getParam(params, '_global', 'density_mult_low', 0.7);
  if (density < medium) return getParam(params, '_global', 'density_mult_medium', 1.0);
  if (density < high) return getParam(params, '_global', 'density_mult_high', 1.2);
  return getParam(params, '_global', 'density_mult_very_high', 1.4);
}

// ============================================================
// EFFECTIVE POPULATION (trade area)
// ============================================================
function calculateEffectivePopulation(
  params: Params,
  totalPopulation: number,
  areaKm2: number,
  businessScale: string,
  density: number
): { effectivePopulation: number; tradeRadiusM: number; tradeAreaKm2: number; reductionFactor: number } {
  const tradeRadiusM = getParam(params, '_global', `trade_radius_${businessScale}`, 1000);

  if (tradeRadiusM === 0 || businessScale === 'besar') {
    return { effectivePopulation: totalPopulation, tradeRadiusM: 0, tradeAreaKm2: areaKm2, reductionFactor: 1.0 };
  }

  const tradeRadiusKm = tradeRadiusM / 1000;
  const tradeAreaKm2 = Math.PI * tradeRadiusKm * tradeRadiusKm;
  const effectiveAreaKm2 = areaKm2 > 0 ? areaKm2 : (totalPopulation / Math.max(1, density));
  const reductionFactor = Math.min(1.0, tradeAreaKm2 / Math.max(0.1, effectiveAreaKm2));
  const effectivePopulation = Math.max(500, Math.round(totalPopulation * reductionFactor));

  return { effectivePopulation, tradeRadiusM, tradeAreaKm2, reductionFactor };
}

// ============================================================
// SANITY CHECK
// ============================================================
function applySanityCheck(
  params: Params, category: string, businessScale: string, omzet: number
): { finalOmzet: number; wasCapped: boolean; wasFloored: boolean; capValue: number | null; floorValue: number | null; warningMessage: string | null } {
  const capValue = getParam(params, category, `sanity_max_${businessScale}`, 0);
  const floorValue = getParam(params, category, `sanity_min_${businessScale}`, 0);

  let finalOmzet = omzet;
  let wasCapped = false;
  let wasFloored = false;
  let warningMessage: string | null = null;

  if (capValue > 0 && omzet > capValue) {
    finalOmzet = capValue;
    wasCapped = true;
    warningMessage = `Estimasi melebihi benchmark untuk bisnis skala ${businessScale}. Estimasi asli Rp ${(omzet / 1000000).toFixed(0)} juta di-cap ke Rp ${(capValue / 1000000).toFixed(0)} juta. Untuk omzet lebih tinggi, pertimbangkan upgrade skala bisnis.`;
  }

  if (floorValue > 0 && omzet < floorValue && omzet > 0) {
    finalOmzet = floorValue;
    wasFloored = true;
    warningMessage = `Estimasi Rp ${(omzet / 1000000).toFixed(1)} juta di bawah minimum viable untuk skala ${businessScale}. Dinaikkan ke floor Rp ${(floorValue / 1000000).toFixed(0)} juta. Area ini mungkin memerlukan strategi tambahan (delivery, online) untuk mencapai omzet minimum.`;
  }

  return { finalOmzet, wasCapped, wasFloored, capValue: capValue > 0 ? capValue : null, floorValue: floorValue > 0 ? floorValue : null, warningMessage };
}

// ============================================================
// INPUT INTERFACE
// ============================================================
export interface EconomicInput {
  district: string;
  population: number;
  location_type: 'rural' | 'residential' | 'urban' | 'cbd';
  city_avg_expenditure: number;
  expenditure_level: string;
  total_city_population: number;
  city_avg_density: number;
  district_village_count: number;
  district_density_per_km2?: number;
  district_area_km2?: number;
  competitor_count: number;
  avg_competitor_rating?: number;
  base_price_min: number;
  base_price_max: number;
  initial_capital: number;
  monthly_cost: number;
  target_margin_pct: number;
  traffic_score?: number;
  product_category?: string;
  product_name?: string;
  business_scale?: string;
  employee_count?: number;
  operating_hours?: number;
  capex_benchmark?: CapexOpexBenchmark | null;
}

// ============================================================
// ESTIMATE DISTRICT INCOME
// ============================================================
function estimateDistrictIncome(params: Params, input: EconomicInput) {
  const locFactor = getParam(params, '_global', `location_multiplier_${input.location_type}`, 1.0);
  const estimatedIncome = Math.round(input.city_avg_expenditure * locFactor);
  const incomeLevel = classifyIncomeLevel(params, estimatedIncome, input.expenditure_level);
  return { estimatedIncome, incomeLevel };
}

// ============================================================
// TOP-DOWN MODEL
// ============================================================
function calculateTopDown(
  params: Params, dbCat: string, input: EconomicInput,
  effectivePopulation: number, incomePerCapita: number, incomeLevel: string, avgPrice: number
) {
  const isDurable = getParam(params, dbCat, 'is_durable', 0) === 1;
  const popBasis = getParam(params, dbCat, 'population_basis', 1);
  let effPop = effectivePopulation;
  if (popBasis === 2) effPop = Math.round(effectivePopulation / getParam(params, dbCat, 'household_divisor', 3.8));

  const targetMarketRatio = getParam(params, dbCat, `target_market_${input.location_type}`, 0.05);
  const spendingKey = incomeLevel === 'low' ? 'spending_ratio_low' : incomeLevel === 'high' ? 'spending_ratio_high' : 'spending_ratio_mid';
  const spendingRatio = getParam(params, dbCat, spendingKey, 0.05);

  const competitorCount = Math.max(0, input.competitor_count);
  const baseShareMin = getParam(params, '_global', 'base_share_min', 0.02);
  const baseShareMax = getParam(params, '_global', 'base_share_max', 0.30);
  let baseShare = 1 / (competitorCount + 1);
  baseShare = Math.min(baseShareMax, Math.max(baseShareMin, baseShare));

  const avgRating = input.avg_competitor_rating || 0;
  const competitorQualityFactor = getCompetitorQualityFactor(params, avgRating);
  const adjustedShare = baseShare * competitorQualityFactor;
  const trafficScore = Math.min(1, Math.max(0, input.traffic_score ?? 0.5));
  const locationFactor = getParam(params, '_global', `location_multiplier_${input.location_type}`, 1.0);

  let tam: number;
  if (isDurable) {
    const affordRate = getAffordabilityRate(params, avgPrice, incomePerCapita);
    const targetMarket = effPop * affordRate;
    const replacementCycle = getParam(params, dbCat, 'replacement_cycle_years', 2.5);
    const annualDemand = replacementCycle > 0 ? targetMarket / replacementCycle : 0;
    tam = (annualDemand * avgPrice) / 12;
  } else {
    tam = effPop * targetMarketRatio * (incomePerCapita * spendingRatio);
  }

  const omzetTopdown = Math.round(tam * adjustedShare * trafficScore);

  return {
    TAM: Math.round(tam * 12), baseShare: parseFloat(baseShare.toFixed(4)),
    adjustedShare: parseFloat(adjustedShare.toFixed(4)), competitorQualityFactor,
    locationFactor, targetRatio: targetMarketRatio, categorySpendingRatio: spendingRatio,
    visibilityScore: trafficScore, omzetTopdown,
  };
}

// ============================================================
// BOTTOM-UP MODEL
// ============================================================
function calculateBottomUp(
  params: Params, dbCat: string, input: EconomicInput,
  effectivePopulation: number, businessScale: string, density: number, avgTransaction: number
) {
  const mobilityProxy = getParam(params, '_global', `mobility_proxy_${input.location_type}`, 0.012);
  const trafficScore = Math.min(1, Math.max(0.3, input.traffic_score ?? 0.5));

  let conversionRate = getParam(params, dbCat, `conversion_${input.location_type}`, 0.03);

  const isDurable = getParam(params, dbCat, 'is_durable', 0) === 1;
  if (isDurable) {
    const replacementCycle = getParam(params, dbCat, 'replacement_cycle_years', 2.5);
    if (replacementCycle > 0) conversionRate *= (1 / (replacementCycle * 12));
  }

  // Affordability adjustment for expensive items
  const avgPrice = Math.round((input.base_price_min + input.base_price_max) / 2);
  const income = input.city_avg_expenditure * getParam(params, '_global', `location_multiplier_${input.location_type}`, 1.0);
  if (avgPrice / Math.max(1, income) > 0.10) {
    conversionRate *= getAffordabilityRate(params, avgPrice, income);
  }

  const popBasis = getParam(params, dbCat, 'population_basis', 1);
  let basePop = effectivePopulation;
  if (popBasis === 2) basePop = Math.round(effectivePopulation / getParam(params, dbCat, 'household_divisor', 3.8));

  // Density multiplier
  const densityMult = getDensityMultiplier(params, density);

  // Competitor factor
  const compFactor = getCompetitorQualityFactor(params, input.avg_competitor_rating || 0);

  // Bottom-up funnel: population × mobility × conversion × adjustments
  // mobilityProxy = % populasi yang pass-by per hari (rural: 0.4%, urban: 2.8%)
  // conversionRate = % yang convert dari yang pass-by (sudah di-tune 30x)
  const rawCustomers = Math.round(
    basePop * mobilityProxy * conversionRate * densityMult * trafficScore * compFactor
  );

  // Capacity cap (per category × scale, fall back ke global)
  let capacityCap = getParam(params, dbCat, `capacity_${businessScale}`, 0);
  if (capacityCap === 0) {
    capacityCap = getParam(params, '_global', `capacity_${businessScale}`, 200);
  }
  const isCapacityCapped = rawCustomers > capacityCap;
  const dailyCustomers = Math.max(1, Math.min(rawCustomers, capacityCap));

  const omzetBottomup = Math.round(dailyCustomers * avgTransaction * 30);

  return {
    dailyTraffic: Math.round(basePop * mobilityProxy * trafficScore),
    conversionRate: parseFloat(conversionRate.toFixed(6)),
    dailyCustomers, omzetBottomup, mobilityProxy,
    capacityCap, isCapacityCapped, rawCustomers,
    densityMult, compFactor,
  };
}

// ============================================================
// PRICE RECOMMENDATION
// ============================================================
function recommendPrice(basePriceMin: number, basePriceMax: number, incomeLevel: string) {
  const baseline = Math.round((basePriceMin + basePriceMax) / 2);
  // Amplitudo lebih konservatif (10-25% adjustment, bukan 30-50%)
  if (incomeLevel === 'low') return {
    recommendedMin: Math.round(basePriceMin * 0.85),
    recommendedMax: Math.round(baseline * 0.90),
    strategy: 'value' as const
  };
  if (incomeLevel === 'high') return {
    recommendedMin: Math.round(baseline * 1.10),
    recommendedMax: Math.round(basePriceMax * 1.25),
    strategy: 'premium' as const
  };
  return {
    recommendedMin: basePriceMin,
    recommendedMax: basePriceMax,
    strategy: 'baseline' as const
  };
}

// ============================================================
// CAPEX/OPEX BENCHMARK (from DB, passed via input)
// ============================================================
export interface CapexOpexBenchmark {
  capex_min: number;
  capex_max: number;
  capex_items: string | null;
  opex_min: number;
  opex_max: number;
  opex_items: string | null;
}

// ============================================================
// PROFIT & BEP V2 — Benchmark-based margins
// ============================================================
function calculateProfitAndBEP(
  params: Params, dbCat: string, monthlyRevenue: number,
  targetMarginPct: number, monthlyCost: number, initialCapital: number,
  avgPrice: number, dailyCustomers: number,
  capexBenchmark: CapexOpexBenchmark | null,
  businessScale: string
) {
  const benchmarkGrossMargin = getParam(params, dbCat, 'benchmark_gross_margin', 0.50);
  const benchmarkNetMargin = getParam(params, dbCat, 'benchmark_net_margin', 0.20);
  const benchmarkOpexRatio = getParam(params, dbCat, 'benchmark_opex_ratio', 0.30);
  // Working capital buffer (per category, fall back ke global)
  let bufferDays = getParam(params, dbCat, 'working_capital_buffer_days', 0);
  if (bufferDays === 0) {
    bufferDays = getParam(params, '_global', 'working_capital_buffer_days', 14);
  }

  // dailyCustomers yang masuk sudah cappedDailyCustomers dari calculateEconomics.
  // Working capital check pakai dailyCustomers yang sama.
  const hppPerUnit = Math.round(avgPrice * (1 - benchmarkGrossMargin));
  const dailyProductionCost = dailyCustomers * hppPerUnit;
  const workingCapitalNeeded = dailyProductionCost * bufferDays;
  const isCapitalAdequate = initialCapital >= workingCapitalNeeded;
  const capitalGap = isCapitalAdequate ? 0 : workingCapitalNeeded - initialCapital;
  let affordableCustomers = dailyCustomers;
  if (!isCapitalAdequate && hppPerUnit > 0 && bufferDays > 0) {
    affordableCustomers = Math.max(1, Math.floor(initialCapital / (hppPerUnit * bufferDays)));
  }
  const actualDailyCustomers = Math.min(dailyCustomers, affordableCustomers);
  // adjustedMonthlyRevenue = MIN(dari customer flow, dari sanity-capped omzet).
  // Kalau working capital constraint kena, revenue bisa turun di bawah monthlyRevenue.
  // Kalau tidak, revenue = monthlyRevenue (sanity-capped).
  const customerFlowRevenue = actualDailyCustomers * avgPrice * 30;
  const adjustedMonthlyRevenue = Math.min(customerFlowRevenue, monthlyRevenue);

  // === OPEX FALLBACK ===
  // Honor user input if > 0; otherwise use benchmark avg; finally ratio fallback.
  const OPEX_RATIO_FALLBACK: Record<string, number> = {
    makanan_minuman: 0.30, grocery: 0.15, fashion: 0.30, jasa: 0.35,
    otomotif: 0.25, kesehatan: 0.35, kecantikan: 0.35, elektronik: 0.15,
    pendidikan: 0.40, pertanian: 0.25,
  };
  let monthlyOpex: number;
  let opexSource: 'user' | 'benchmark_table' | 'benchmark_ratio';
  if (monthlyCost && monthlyCost > 0) {
    monthlyOpex = monthlyCost;
    opexSource = 'user';
  } else if (capexBenchmark) {
    monthlyOpex = Math.round((capexBenchmark.opex_min + capexBenchmark.opex_max) / 2);
    opexSource = 'benchmark_table';
  } else {
    const ratio = OPEX_RATIO_FALLBACK[dbCat] ?? 0.30;
    monthlyOpex = Math.round(adjustedMonthlyRevenue * ratio);
    opexSource = 'benchmark_ratio';
  }

  // OPEX proportional check pakai per-category ratio dari OPEX_RATIO_FALLBACK
  // (mencegah underestimate saat revenue tinggi, sesuai struktur biaya kategori)
  const categoryOpexRatio = OPEX_RATIO_FALLBACK[dbCat] ?? 0.30;
  const revenueProportionalOpex = Math.round(adjustedMonthlyRevenue * categoryOpexRatio);
  if (revenueProportionalOpex > monthlyOpex) {
    monthlyOpex = revenueProportionalOpex;
    opexSource = 'benchmark_ratio';
  }

  // Profit: gross from benchmark margin; net = gross - opex (use REAL opex, not just ratio)
  const monthlyGrossProfit = Math.round(adjustedMonthlyRevenue * benchmarkGrossMargin);
  const monthlyNetProfit = monthlyGrossProfit - monthlyOpex;
  const dailyNetProfit = Math.round(monthlyNetProfit / 30);

  // === CAPEX ADEQUACY CHECK (vs benchmark table) ===
  let capexCheck: {
    isAdequate: boolean;
    benchmark: CapexOpexBenchmark | null;
    warningMessage: string | null;
    severity: 'ok' | 'low' | 'missing';
  } = { isAdequate: true, benchmark: capexBenchmark, warningMessage: null, severity: 'ok' };

  if (capexBenchmark) {
    if (!initialCapital || initialCapital <= 0) {
      capexCheck = {
        isAdequate: false, benchmark: capexBenchmark, severity: 'missing',
        warningMessage: `Modal awal belum diisi. Benchmark untuk skala ${businessScale}: Rp ${(capexBenchmark.capex_min/1_000_000).toFixed(0)} – ${(capexBenchmark.capex_max/1_000_000).toFixed(0)} juta.`,
      };
    } else if (initialCapital < capexBenchmark.capex_min) {
      capexCheck = {
        isAdequate: false, benchmark: capexBenchmark, severity: 'low',
        warningMessage: `Modal Anda (Rp ${(initialCapital/1_000_000).toFixed(1)} juta) di bawah benchmark minimum Rp ${(capexBenchmark.capex_min/1_000_000).toFixed(0)} juta untuk bisnis skala ${businessScale}. Pertimbangkan tambah modal atau turunkan skala.`,
      };
    }
  }

  // Margin comparison
  const isUserOverOptimistic = targetMarginPct > (benchmarkNetMargin * 100 + 10);
  const marginWarning = isUserOverOptimistic
    ? `Margin yang Anda input (${targetMarginPct}%) di atas benchmark industri (net margin rata-rata: ${Math.round(benchmarkNetMargin * 100)}%). Estimasi profit menggunakan benchmark untuk hasil yang lebih realistis.`
    : null;

  // BEP
  const viabilityThreshold = getParam(params, dbCat, 'bep_viability_days', 365);
  let bepDays = 999, bepMonths = 999, isViable = false;
  if (dailyNetProfit > 0 && initialCapital > 0) {
    bepDays = Math.ceil(initialCapital / dailyNetProfit);
    bepMonths = parseFloat((bepDays / 30).toFixed(1));
    isViable = bepDays <= viabilityThreshold;
  }

  return {
    monthlyProfit: monthlyNetProfit, dailyProfit: dailyNetProfit,
    bepDays, bepMonths, isViable, viabilityThreshold,
    benchmarkGrossMargin, benchmarkNetMargin, benchmarkOpexRatio,
    monthlyGrossProfit, monthlyOpex, monthlyNetProfit,
    adjustedMonthlyRevenue,
    opexInfo: { source: opexSource, value: monthlyOpex },
    capexCheck,
    workingCapital: {
      hppPerUnit, dailyProductionCost, bufferDays, workingCapitalNeeded,
      isCapitalAdequate, capitalGap,
      affordableCustomersPerDay: affordableCustomers,
      actualDailyCustomers,
    },
    marginComparison: {
      userMargin: targetMarginPct, benchmarkNetMargin,
      isUserOverOptimistic, warningMessage: marginWarning,
    },
  };
}

// ============================================================
// MAIN ENTRY
// ============================================================

// Default density per location type — fallback aman saat input data missing
const LOCATION_DENSITY_DEFAULT: Record<string, number> = {
  rural: 500,
  residential: 5000,
  urban: 8000,
  cbd: 12000,
};

// Default area km² minimum (mencegah area 0 atau negatif)
const MIN_AREA_KM2 = 1.0;

export function calculateEconomics(input: EconomicInput, engineParams?: Map<string, number>) {
  const params = engineParams || new Map<string, number>();
  const categoryKey = resolveCategory(input.product_category || '', input.product_name);
  const dbCat = mapCategoryToDbKey(categoryKey);
  const businessScale = input.business_scale || 'mikro';

  // === INPUT VALIDATION & WARNING COLLECTION ===
  const inputWarnings: string[] = [];
  if (!input.base_price_min || input.base_price_min <= 0 ||
      !input.base_price_max || input.base_price_max <= 0) {
    inputWarnings.push('Harga produk (min/max) belum diisi atau bernilai 0. Estimasi mungkin tidak akurat.');
  }
  if (!input.population || input.population <= 0) {
    inputWarnings.push('Populasi kecamatan tidak tersedia. Estimasi pakai default minimum.');
  }

  const income = estimateDistrictIncome(params, input);
  // basePrice tanpa income multiplier — income effect sudah ada di:
  // (1) top-down via incomePerCapita × spendingRatio
  // (2) recommendPrice() yang adjust min/max sesuai income level
  // Tidak perlu triple-count di avgTransaction.
  const basePrice = Math.max(1, Math.round((input.base_price_min + input.base_price_max) / 2));
  const avgTransaction = basePrice;
  // Note: incomeMultiplier masih di-display untuk transparansi tapi tidak dipakai
  const incomeMultiplierKey = `income_multiplier_${income.incomeLevel}`;
  const incomeMultiplier = getParam(params, '_global', incomeMultiplierKey, 1.0);

  // === SAFE DENSITY (hierarchy: district → city → location_type default) ===
  let density: number;
  if (input.district_density_per_km2 && input.district_density_per_km2 > 0) {
    density = input.district_density_per_km2;
  } else if (input.city_avg_density && input.city_avg_density > 0) {
    density = input.city_avg_density;
    inputWarnings.push('Density kecamatan tidak tersedia, pakai rata-rata kota.');
  } else {
    density = LOCATION_DENSITY_DEFAULT[input.location_type] ?? 1000;
    inputWarnings.push(`Density tidak tersedia, pakai default ${density}/km² untuk lokasi ${input.location_type}.`);
  }

  // === SAFE AREA KM² (minimum floor) ===
  let areaKm2: number;
  if (input.district_area_km2 && input.district_area_km2 > 0) {
    areaKm2 = input.district_area_km2;
  } else if (density > 0 && input.population > 0) {
    areaKm2 = Math.max(MIN_AREA_KM2, input.population / density);
    inputWarnings.push('Area km² kecamatan tidak tersedia, dihitung dari populasi/density.');
  } else {
    areaKm2 = MIN_AREA_KM2;
    inputWarnings.push(`Area km² tidak bisa dihitung, pakai default ${MIN_AREA_KM2} km².`);
  }


  // STEP 1: Calculate effective population (trade area)
  const effPop = calculateEffectivePopulation(params, input.population, areaKm2, businessScale, density);

  console.log(`[Economic V3] ${input.district}: dbCat="${dbCat}", scale="${businessScale}", pop=${input.population}, area=${areaKm2.toFixed(2)}km², density=${density.toFixed(0)}/km² → effPop=${effPop.effectivePopulation} (radius=${effPop.tradeRadiusM}m, reduction=${(effPop.reductionFactor * 100).toFixed(1)}%)`);

  // STEP 2: Top-down with effective population
  const topDown = calculateTopDown(params, dbCat, input, effPop.effectivePopulation, income.estimatedIncome, income.incomeLevel, basePrice);

  // STEP 3: Bottom-up with effective population + capacity cap
  const bottomUp = calculateBottomUp(params, dbCat, input, effPop.effectivePopulation, businessScale, density, avgTransaction);

  // STEP 4: Hybrid
  const konservatifRaw = Math.min(topDown.omzetTopdown, bottomUp.omzetBottomup);
  const moderatRaw = Math.round((topDown.omzetTopdown + bottomUp.omzetBottomup) / 2);
  const optimistisRaw = Math.max(topDown.omzetTopdown, bottomUp.omzetBottomup);

  // STEP 5: Confidence (4 tier, lebih realistic)
  const gap = Math.abs(topDown.omzetTopdown - bottomUp.omzetBottomup) / Math.max(1, moderatRaw);
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  let confidenceReason: string;
  if (gap < 0.10) {
    confidence = 'HIGH';
    confidenceReason = 'Model top-down dan bottom-up sangat sepakat (gap <10%) — estimasi reliable';
  } else if (gap < 0.25) {
    confidence = 'MEDIUM';
    confidenceReason = 'Ada perbedaan moderat antara kedua model (gap 10-25%) — estimasi cukup reliable';
  } else if (gap < 0.50) {
    confidence = 'LOW';
    confidenceReason = 'Kedua model berselisih cukup besar (gap 25-50%) — estimasi perlu review parameter';
  } else {
    confidence = 'VERY_LOW';
    confidenceReason = 'Kedua model berselisih sangat jauh (gap >50%) — estimasi kurang reliable';
  }

  // STEP 6: Sanity check (cap + floor)
  const sanityK = applySanityCheck(params, dbCat, businessScale, konservatifRaw);
  const sanityM = applySanityCheck(params, dbCat, businessScale, moderatRaw);
  const sanityO = applySanityCheck(params, dbCat, businessScale, optimistisRaw);

  const hybrid = {
    omzet_konservatif: sanityK.finalOmzet,
    omzet_moderat: sanityM.finalOmzet,
    omzet_optimistis: sanityO.finalOmzet,
    omzet_topdown: topDown.omzetTopdown,
    omzet_bottomup: bottomUp.omzetBottomup,
    confidence,
    confidenceReason,
  };

  const pricing = recommendPrice(input.base_price_min, input.base_price_max, income.incomeLevel);

  // STEP 6.5: Cap dailyCustomers ke implied value dari capped revenue.
  // Konsistensi: customers.dailyCustomers, profit, BEP semua berbasis omzet sanity-capped.
  const impliedDailyFromCappedRevenue = avgTransaction > 0
    ? Math.max(1, Math.round(hybrid.omzet_moderat / 30 / avgTransaction))
    : bottomUp.dailyCustomers;
  const cappedDailyCustomers = Math.min(bottomUp.dailyCustomers, impliedDailyFromCappedRevenue);

  const profitBep = calculateProfitAndBEP(
    params, dbCat,
    hybrid.omzet_moderat,
    input.target_margin_pct,
    input.monthly_cost,
    input.initial_capital,
    basePrice,
    cappedDailyCustomers,
    input.capex_benchmark ?? null,
    businessScale
  );

  const revenue = {
    incomeMultiplier, avgTransaction,
    dailyRevenue: Math.round(hybrid.omzet_moderat / 30),
    monthlyRevenue: hybrid.omzet_moderat,
  };

  const customers = {
    mobilityRate: bottomUp.mobilityProxy,
    captureRate: bottomUp.conversionRate,
    reachFactor: topDown.targetRatio,
    reachablePopulation: Math.round(effPop.effectivePopulation * topDown.targetRatio),
    dailyCustomers: cappedDailyCustomers,
    rawCustomersFromBottomUp: bottomUp.dailyCustomers,
  };

  return {
    income, customers, revenue, pricing, profitBep, topDown, bottomUp, hybrid,
    isDurable: getParam(params, dbCat, 'is_durable', 0) === 1,
    categoryKey: dbCat, categoryLabel: dbCat,
    categoryMethod: getParam(params, dbCat, 'is_durable', 0) === 1 ? 'market_penetration' : 'traffic_conversion',
    confidence, confidenceReason,
    // V3 additions
    tradeArea: {
      totalPopulation: input.population,
      effectivePopulation: effPop.effectivePopulation,
      tradeRadiusM: effPop.tradeRadiusM,
      reductionFactor: effPop.reductionFactor,
    },
    capacityInfo: {
      capacityCap: bottomUp.capacityCap,
      isCapacityCapped: bottomUp.isCapacityCapped,
      rawCustomers: bottomUp.rawCustomers,
    },
    sanityInfo: {
      wasCapped: sanityM.wasCapped,
      wasFloored: sanityM.wasFloored,
      warningMessage: sanityM.warningMessage,
      capValue: sanityM.capValue,
      floorValue: sanityM.floorValue,
    },
    businessScale,
    inputWarnings,
  };
}
