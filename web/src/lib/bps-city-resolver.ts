import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a city name from the master dropdown list to the matching
 * name in bps_food_data. Handles prefix differences like:
 * - "Palembang" → "Kota Palembang"
 * - "Kota Bandung" → "Kota Bandung" (exact)
 * - "Kab. Solok" → "Solok" (strip prefix)
 * - "Bandung" → "Bandung" (kabupaten, no prefix in BPS)
 */

const bpsCityCache = new Map<string, string | null>();

export async function resolveBpsCityName(inputCity: string): Promise<string | null> {
  if (bpsCityCache.has(inputCity)) return bpsCityCache.get(inputCity)!;

  // 1. Try exact match
  const { data: exact } = await supabase
    .from("bps_food_data")
    .select("kabupaten_kota")
    .eq("kabupaten_kota", inputCity)
    .limit(1)
    .maybeSingle();

  if (exact?.kabupaten_kota) {
    bpsCityCache.set(inputCity, inputCity);
    return inputCity;
  }

  // 2. Try adding "Kota " prefix (e.g. "Palembang" → "Kota Palembang")
  const withKota = `Kota ${inputCity}`;
  const { data: kotaMatch } = await supabase
    .from("bps_food_data")
    .select("kabupaten_kota")
    .eq("kabupaten_kota", withKota)
    .limit(1)
    .maybeSingle();

  if (kotaMatch?.kabupaten_kota) {
    bpsCityCache.set(inputCity, withKota);
    return withKota;
  }

  // 3. Try stripping "Kota " prefix (e.g. "Kota Bandung" → "Bandung" for kabupaten match)
  const stripped = inputCity.replace(/^(Kota |Kab\. |Kabupaten |Adm\. )/i, "");
  if (stripped !== inputCity) {
    const { data: strippedMatch } = await supabase
      .from("bps_food_data")
      .select("kabupaten_kota")
      .eq("kabupaten_kota", stripped)
      .limit(1)
      .maybeSingle();

    if (strippedMatch?.kabupaten_kota) {
      bpsCityCache.set(inputCity, stripped);
      return stripped;
    }

    // Also try "Kota " + stripped
    const kotaStripped = `Kota ${stripped}`;
    const { data: kotaStrippedMatch } = await supabase
      .from("bps_food_data")
      .select("kabupaten_kota")
      .eq("kabupaten_kota", kotaStripped)
      .limit(1)
      .maybeSingle();

    if (kotaStrippedMatch?.kabupaten_kota) {
      bpsCityCache.set(inputCity, kotaStripped);
      return kotaStripped;
    }
  }

  // 4. ILIKE fallback — partial match
  const { data: fuzzy } = await supabase
    .from("bps_food_data")
    .select("kabupaten_kota")
    .ilike("kabupaten_kota", `%${stripped}%`)
    .limit(1)
    .maybeSingle();

  if (fuzzy?.kabupaten_kota) {
    bpsCityCache.set(inputCity, fuzzy.kabupaten_kota);
    return fuzzy.kabupaten_kota;
  }

  // 5. Normalize: remove spaces/dashes and compare
  const normalize = (s: string) => s.toLowerCase().replace(/[\s\-\.]+/g, "");
  const normalizedInput = normalize(stripped);

  const { data: allCities } = await supabase
    .from("bps_food_data")
    .select("kabupaten_kota")
    .limit(1000);

  if (allCities) {
    const unique = [...new Set(allCities.map((c) => c.kabupaten_kota))];
    const match = unique.find((c) => {
      const nc = normalize(c.replace(/^(Kota |Kab\. |Kabupaten )/i, ""));
      return nc === normalizedInput;
    });
    if (match) {
      bpsCityCache.set(inputCity, match);
      return match;
    }
  }

  // Not found
  bpsCityCache.set(inputCity, null);
  return null;
}
