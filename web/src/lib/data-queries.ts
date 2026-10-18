import { supabase } from "@/integrations/supabase/client";

// ============================================================
// HELPER: Normalize strings for fuzzy matching
// ============================================================
function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[\s\-\.]+/g, '').trim();
}

// ============================================================
// HELPER: Fuzzy city matching
// Handles cases like "Purwokerto" → "Banyumas", "Kota Tangerang" → "Tangerang"
// ============================================================

const cityNameCache = new Map<string, string>();

async function resolveCityName(
  table: 'population_data' | 'expenditure_per_capita',
  province: string,
  city: string
): Promise<string> {
  const cacheKey = `${table}:${province}:${city}`;
  if (cityNameCache.has(cacheKey)) return cityNameCache.get(cacheKey)!;

  // Try exact match first
  const { data: exact } = await supabase
    .from(table)
    .select('city')
    .eq('province', province)
    .eq('city', city)
    .limit(1)
    .maybeSingle();

  if (exact?.city) {
    cityNameCache.set(cacheKey, city);
    return city;
  }

  // Try with "Kota " / "Kab. " prefix
  for (const prefix of ['Kota ', 'Kab. ']) {
    const prefixed = `${prefix}${city}`;
    const { data } = await supabase
      .from(table)
      .select('city')
      .eq('province', province)
      .eq('city', prefixed)
      .limit(1)
      .maybeSingle();

    if (data?.city) {
      cityNameCache.set(cacheKey, prefixed);
      return prefixed;
    }
  }

  // Try stripping prefix if city already has one
  const stripped = city.replace(/^(Kota |Kab\. |Kabupaten )/i, '');
  if (stripped !== city) {
    const { data } = await supabase
      .from(table)
      .select('city')
      .eq('province', province)
      .eq('city', stripped)
      .limit(1)
      .maybeSingle();
    if (data?.city) {
      cityNameCache.set(cacheKey, stripped);
      return stripped;
    }
  }

  // ILIKE fallback (partial match)
  const { data: fuzzy } = await supabase
    .from(table)
    .select('city')
    .eq('province', province)
    .ilike('city', `%${city}%`)
    .limit(1)
    .maybeSingle();

  if (fuzzy?.city) {
    cityNameCache.set(cacheKey, fuzzy.city);
    return fuzzy.city;
  }

  // ILIKE reverse: try if the DB city name contains the input or vice versa
  // e.g., input "Purwokerto" won't match "Banyumas" — need broader search
  // Fetch all cities in province and do normalized comparison
  const { data: allCities } = await supabase
    .from(table)
    .select('city')
    .eq('province', province)
    .limit(500);

  if (allCities && allCities.length > 0) {
    const normalizedInput = normalizeForMatch(city);
    const uniqueCities = [...new Set(allCities.map(c => c.city).filter(Boolean))] as string[];
    
    // Try normalized exact match (handles spacing/dash differences)
    const normalizedMatch = uniqueCities.find(c => normalizeForMatch(c) === normalizedInput);
    if (normalizedMatch) {
      cityNameCache.set(cacheKey, normalizedMatch);
      return normalizedMatch;
    }
  }

  // Final: cache original and return as-is
  cityNameCache.set(cacheKey, city);
  return city;
}

// ============================================================
// HELPER: Fuzzy district matching
// Handles spacing/dash differences: "Kedung Banteng" → "Kedungbanteng"
// ============================================================

const districtNameCache = new Map<string, string>();

async function resolveDistrictName(
  province: string,
  resolvedCity: string,
  district: string
): Promise<string> {
  const cacheKey = `district:${province}:${resolvedCity}:${district}`;
  if (districtNameCache.has(cacheKey)) return districtNameCache.get(cacheKey)!;

  // Try exact match
  const { data: exact } = await supabase
    .from('population_data')
    .select('district')
    .eq('province', province)
    .eq('city', resolvedCity)
    .eq('district', district)
    .limit(1)
    .maybeSingle();

  if (exact?.district) {
    districtNameCache.set(cacheKey, district);
    return district;
  }

  // Fetch all districts in this city and do normalized comparison
  const { data: allDistricts } = await supabase
    .from('population_data')
    .select('district')
    .eq('province', province)
    .eq('city', resolvedCity);

  if (allDistricts && allDistricts.length > 0) {
    const normalizedInput = normalizeForMatch(district);
    const uniqueDistricts = [...new Set(allDistricts.map(d => d.district))] as string[];

    // Normalized exact match (handles spacing, dashes)
    const match = uniqueDistricts.find(d => normalizeForMatch(d) === normalizedInput);
    if (match) {
      districtNameCache.set(cacheKey, match);
      return match;
    }

    // ILIKE-style: contains check
    const containsMatch = uniqueDistricts.find(d => {
      const nd = normalizeForMatch(d);
      return nd.includes(normalizedInput) || normalizedInput.includes(nd);
    });
    if (containsMatch) {
      districtNameCache.set(cacheKey, containsMatch);
      return containsMatch;
    }
  }

  // Return as-is
  districtNameCache.set(cacheKey, district);
  return district;
}

// ============================================================
// QUERY POPULASI KECAMATAN
// Aggregate dari population_data (level desa) ke level kecamatan
// ============================================================

export interface DistrictPopulation {
  district: string;
  total_population: number;
  village_count: number;
  urban_village_count: number;
  rural_village_count: number;
  location_type: 'rural' | 'residential' | 'urban' | 'cbd';
  avg_density_per_km2: number;
  area_km2: number;
}

export async function getDistrictPopulation(
  province: string,
  city: string,
  district: string
): Promise<DistrictPopulation | null> {
  const resolvedCity = await resolveCityName('population_data', province, city);
  const resolvedDistrict = await resolveDistrictName(province, resolvedCity, district);

  const { data: villages, error } = await supabase
    .from('population_data')
    .select('village, village_code, status, male_population, female_population, total_population, density_per_km2')
    .eq('province', province)
    .eq('city', resolvedCity)
    .eq('district', resolvedDistrict);

  if (error || !villages || villages.length === 0) {
    console.warn(`[Population] No data for ${province}/${resolvedCity}/${resolvedDistrict} (input: ${city}/${district})`);
    return null;
  }

  let totalPop = 0;
  let urbanCount = 0;
  let ruralCount = 0;
  let totalAreaKm2 = 0;
  let densitySumWeighted = 0;
  let densityWeightPop = 0;

  for (const v of villages) {
    const pop = v.total_population || ((v.male_population || 0) * 2);
    totalPop += pop;

    const dens = Number(v.density_per_km2) || 0;
    if (dens > 0) {
      // Village area = pop / density
      totalAreaKm2 += pop / dens;
      densitySumWeighted += dens * pop;
      densityWeightPop += pop;
    }

    const status = (v.status || '').toLowerCase();
    if (
      status === 'urban' ||
      status === 'perkotaan' ||
      status === 'kelurahan' ||
      status === '1'
    ) {
      urbanCount++;
    } else {
      ruralCount++;
    }
  }

  const urbanRatio = villages.length > 0 ? urbanCount / villages.length : 0;

  let locationType: DistrictPopulation['location_type'];
  if (urbanRatio >= 0.9) locationType = 'cbd';
  else if (urbanRatio >= 0.7) locationType = 'urban';
  else if (urbanRatio >= 0.4) locationType = 'residential';
  else locationType = 'rural';

  // Population-weighted average density (people/km²)
  const avgDensity = densityWeightPop > 0 ? densitySumWeighted / densityWeightPop : 0;
  // Total district area = sum of village areas (pop/density)
  const areaKm2 = totalAreaKm2 > 0 ? totalAreaKm2 : (avgDensity > 0 ? totalPop / avgDensity : 0);

  return {
    district,
    total_population: totalPop,
    village_count: villages.length,
    urban_village_count: urbanCount,
    rural_village_count: ruralCount,
    location_type: locationType,
    avg_density_per_km2: Math.round(avgDensity),
    area_km2: Math.round(areaKm2 * 100) / 100,
  };
}

// ============================================================
// QUERY PENGELUARAN KOTA
// ============================================================

/**
 * Classify monthly per-capita expenditure into income level.
 * Thresholds based on BPS expenditure distribution:
 * - Low: < Rp 800.000/bulan
 * - High: > Rp 1.500.000/bulan
 * - Middle: everything else
 */
function classifyIncomeLevel(monthlyExpenditure: number): 'low' | 'middle' | 'high' {
  if (monthlyExpenditure < 800_000) return 'low';
  if (monthlyExpenditure > 1_500_000) return 'high';
  return 'middle';
}

export interface CityExpenditure {
  city: string;
  avg_expenditure: number;
  level: string;
  year: number;
}

export async function getCityExpenditure(
  province: string,
  city: string
): Promise<CityExpenditure | null> {
  const resolvedCity = await resolveCityName('expenditure_per_capita', province, city);

  const { data, error } = await supabase
    .from('expenditure_per_capita')
    .select('city, level, male_expenditure, female_expenditure, year')
    .eq('province', province)
    .eq('city', resolvedCity)
    .order('year', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Fallback: try province-level data
    const { data: provData } = await supabase
      .from('expenditure_per_capita')
      .select('city, level, male_expenditure, female_expenditure, year')
      .eq('province', province)
      .eq('level', 'province')
      .order('year', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!provData) return null;

    const avgExp = Math.round(
      ((Number(provData.male_expenditure) || 0) + (Number(provData.female_expenditure) || 0)) / 2 * 1000 / 12
    );

    return {
      city,
      avg_expenditure: avgExp,
      level: classifyIncomeLevel(avgExp),
      year: provData.year,
    };
  }

  const avgExp = Math.round(
    ((Number(data.male_expenditure) || 0) + (Number(data.female_expenditure) || 0)) / 2 * 1000 / 12
  );

  return {
    city: data.city || city,
    avg_expenditure: avgExp,
    level: classifyIncomeLevel(avgExp),
    year: data.year,
  };
}

// ============================================================
// QUERY SEMUA KECAMATAN DI KOTA (untuk normalisasi max)
// ============================================================

export async function getAllDistrictStats(
  province: string,
  city: string
): Promise<{
  max_population: number;
  avg_density: number;
  total_city_population: number;
  districts: Array<{ district: string; population: number }>;
}> {
  const resolvedCity = await resolveCityName('population_data', province, city);

  const { data: allVillages } = await supabase
    .from('population_data')
    .select('district, male_population, total_population')
    .eq('province', province)
    .eq('city', resolvedCity);

  if (!allVillages || allVillages.length === 0) {
    return { max_population: 1, avg_density: 1, total_city_population: 1, districts: [] };
  }

  const districtMap = new Map<string, number>();
  for (const v of allVillages) {
    const pop = v.total_population || ((v.male_population || 0) * 2);
    districtMap.set(v.district, (districtMap.get(v.district) || 0) + pop);
  }

  const districts = Array.from(districtMap.entries())
    .map(([district, population]) => ({ district, population }));

  const populations = districts.map(d => d.population);
  const totalPop = populations.reduce((a, b) => a + b, 0);

  return {
    max_population: Math.max(...populations, 1),
    avg_density: Math.round(totalPop / districts.length),
    total_city_population: totalPop,
    districts,
  };
}
