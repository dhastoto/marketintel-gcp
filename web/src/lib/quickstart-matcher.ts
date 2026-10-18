import { CITIES_BY_PROVINCE, DISTRICTS_BY_CITY, PROVINCES } from "@/lib/constants";

export interface ParsedBusiness {
  business_name: string;
  category: string;
  kabupaten_kota: string;
  kecamatan?: string | null;
  provinsi?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  business_scale?: string | null;
  confidence: "high" | "medium" | "low";
  notes?: string | null;
}

export interface MatchedLocation {
  province: string;
  city: string;
  district: string | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^kota\s+/, "")
    .replace(/^kab\.\s*/, "")
    .replace(/^kabupaten\s+/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Match parsed location against constants.ts province → city → district hierarchy.
 * Returns null if city cannot be located.
 */
export function matchLocation(parsed: ParsedBusiness): MatchedLocation | null {
  const targetCity = norm(parsed.kabupaten_kota);

  // Search all cities across provinces
  let foundProvince: string | null = null;
  let foundCity: string | null = null;

  // Prefer the province AI suggested
  const provinceCandidates = parsed.provinsi
    ? [
        PROVINCES.find((p) => norm(p) === norm(parsed.provinsi!)) || null,
        ...PROVINCES.filter((p) => norm(p) !== norm(parsed.provinsi!)),
      ].filter(Boolean) as string[]
    : PROVINCES;

  for (const prov of provinceCandidates) {
    const cities = CITIES_BY_PROVINCE[prov] || [];
    // Exact normalized match first
    let city = cities.find((c) => norm(c) === targetCity);
    if (!city) {
      // Try contains
      city = cities.find((c) => norm(c).includes(targetCity) || targetCity.includes(norm(c)));
    }
    if (city) {
      foundProvince = prov;
      foundCity = city;
      break;
    }
  }

  if (!foundProvince || !foundCity) return null;

  // Match district if AI provided one
  let foundDistrict: string | null = null;
  if (parsed.kecamatan) {
    const districts = DISTRICTS_BY_CITY[foundCity] || [];
    const target = norm(parsed.kecamatan);
    foundDistrict =
      districts.find((d) => norm(d) === target) ||
      districts.find((d) => norm(d).includes(target) || target.includes(norm(d))) ||
      null;
  }

  return { province: foundProvince, city: foundCity, district: foundDistrict };
}
