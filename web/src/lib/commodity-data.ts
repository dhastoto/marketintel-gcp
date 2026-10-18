import { supabase } from "@/integrations/supabase/client";

export interface CommodityPrice {
  komoditas: string;
  harga_terkini: number;
  het: number | null;
  harga_sebelumnya: number | null;
  perubahan_pct: number | null;
  tanggal_data: string;
  kabupaten_kota: string;
  provinsi: string;
}

export interface CommodityWithStatus extends CommodityPrice {
  status: "di_bawah_het" | "di_atas_het" | "tanpa_het";
  selisih_het_pct: number | null;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/^kota\s+/, "")
    .replace(/^kab\.\s*/, "")
    .replace(/^kabupaten\s+/, "")
    .replace(/^adm\.\s*/, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface ResolvedCommodityLocation {
  kode_wilayah: string;
  nama_kemendag: string;
}

/**
 * Resolve nama kabupaten/kota app → kode_wilayah + nama di commodity_prices.
 * kode_wilayah dipakai untuk filter karena unik (mencegah collision Kab. vs Kota
 * yang dinormalisasi ke nama yang sama, mis. "Tangerang").
 */
export async function resolveCommodityLocation(
  cityApp: string,
): Promise<ResolvedCommodityLocation | null> {
  if (!cityApp) return null;

  // 1) Exact match by nama_app
  const { data: exact } = await supabase
    .from("location_mapping")
    .select("nama_kemendag, kode_wilayah")
    .eq("nama_app", cityApp)
    .limit(1);

  if (exact && exact.length > 0 && exact[0].kode_wilayah) {
    const { count } = await supabase
      .from("commodity_prices")
      .select("*", { count: "exact", head: true })
      .eq("kode_wilayah", exact[0].kode_wilayah);
    if (count && count > 0) {
      return {
        kode_wilayah: exact[0].kode_wilayah,
        nama_kemendag: exact[0].nama_kemendag ?? cityApp,
      };
    }
  }

  // 2) Via nama_normalized
  const normalized = norm(cityApp);
  const { data: byNorm } = await supabase
    .from("location_mapping")
    .select("nama_kemendag, kode_wilayah")
    .eq("nama_normalized", normalized)
    .limit(5);

  if (byNorm && byNorm.length > 0) {
    for (const row of byNorm) {
      if (!row.kode_wilayah) continue;
      const { count } = await supabase
        .from("commodity_prices")
        .select("*", { count: "exact", head: true })
        .eq("kode_wilayah", row.kode_wilayah);
      if (count && count > 0) {
        return {
          kode_wilayah: row.kode_wilayah,
          nama_kemendag: row.nama_kemendag ?? cityApp,
        };
      }
    }
  }

  // 3) Fallback: cari di commodity_prices via kabupaten_kota_raw (yang masih lengkap)
  const { data: directRaw } = await supabase
    .from("commodity_prices")
    .select("kode_wilayah, kabupaten_kota_raw")
    .ilike("kabupaten_kota_raw", `%${cityApp}%`)
    .limit(1);

  if (directRaw && directRaw.length > 0 && directRaw[0].kode_wilayah) {
    return {
      kode_wilayah: directRaw[0].kode_wilayah,
      nama_kemendag: directRaw[0].kabupaten_kota_raw ?? cityApp,
    };
  }

  return null;
}

export async function fetchCommodityPrices(cityApp: string): Promise<CommodityWithStatus[]> {
  const resolved = await resolveCommodityLocation(cityApp);
  if (!resolved) return [];

  const { data, error } = await supabase
    .from("commodity_prices")
    .select(
      "komoditas, harga_terkini, het, harga_sebelumnya, perubahan_pct, tanggal_data, kabupaten_kota, provinsi",
    )
    .eq("kode_wilayah", resolved.kode_wilayah)
    .order("komoditas", { ascending: true });

  if (error || !data) return [];

  // Dedup defensif: jika tetap ada >1 baris untuk komoditas yang sama
  // (mis. data lama belum bersih), ambil yang paling baru tanggal_data-nya.
  const byKomoditas = new Map<string, typeof data[number]>();
  for (const row of data) {
    const existing = byKomoditas.get(row.komoditas);
    if (!existing || new Date(row.tanggal_data) > new Date(existing.tanggal_data)) {
      byKomoditas.set(row.komoditas, row);
    }
  }

  return Array.from(byKomoditas.values()).map((row) => {
    let status: CommodityWithStatus["status"] = "tanpa_het";
    let selisih: number | null = null;
    if (row.het && Number(row.het) > 0) {
      selisih = ((Number(row.harga_terkini) - Number(row.het)) / Number(row.het)) * 100;
      status = Number(row.harga_terkini) > Number(row.het) ? "di_atas_het" : "di_bawah_het";
    }
    return {
      ...row,
      harga_terkini: Number(row.harga_terkini),
      het: row.het ? Number(row.het) : null,
      harga_sebelumnya: row.harga_sebelumnya ? Number(row.harga_sebelumnya) : null,
      perubahan_pct: row.perubahan_pct ? Number(row.perubahan_pct) : null,
      status,
      selisih_het_pct: selisih,
    };
  });
}
