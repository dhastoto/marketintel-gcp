// Feature gating per-laporan (menggantikan plan-based gating dari feature-gate.ts)
// Dipanggil sebelum render hasil analisis berdasarkan tier purchase yang dipakai.

export type MarketIntelTier = 'free' | 'standard' | 'pro';
export type FoodIntelTier = 'free' | 'standard';

export interface MarketIntelFeatures {
  market_score_number: boolean;
  market_score_breakdown: boolean;
  omzet_range: boolean;
  omzet_tiga_range: boolean;
  omzet_confidence: boolean;
  kompetitor_jumlah: boolean;
  kompetitor_detail: boolean;
  customer_estimasi: boolean;
  customer_breakdown: boolean;
  go_nogo_label: boolean;
  go_nogo_penjelasan: boolean;
  rekomendasi_harga: boolean;
  rencana_aksi_count: number;
  bep: boolean;
  working_capital: boolean;
  benchmark_margin: boolean;
  compare_lokasi: boolean;
  export_pdf: boolean;
  can_upgrade_to: MarketIntelTier[];
  upgrade_prices: Record<string, number>;
}

export function getMarketIntelFeatures(tier: MarketIntelTier): MarketIntelFeatures {
  const base = {
    market_score_number: true,
    omzet_range: true,
    kompetitor_jumlah: true,
    customer_estimasi: true,
    go_nogo_label: true,
  };

  if (tier === 'free') {
    return {
      ...base,
      market_score_breakdown: false,
      omzet_tiga_range: false,
      omzet_confidence: false,
      kompetitor_detail: false,
      customer_breakdown: false,
      go_nogo_penjelasan: false,
      rekomendasi_harga: false,
      rencana_aksi_count: 3,
      bep: false,
      working_capital: false,
      benchmark_margin: false,
      compare_lokasi: false,
      export_pdf: false,
      can_upgrade_to: ['standard', 'pro'],
      upgrade_prices: { standard: 29000, pro: 49000 },
    };
  }

  if (tier === 'standard') {
    return {
      ...base,
      market_score_breakdown: true,
      omzet_tiga_range: true,
      omzet_confidence: true,
      kompetitor_detail: true,
      customer_breakdown: true,
      go_nogo_penjelasan: true,
      rekomendasi_harga: true,
      rencana_aksi_count: 7,
      bep: false,
      working_capital: false,
      benchmark_margin: false,
      compare_lokasi: false,
      export_pdf: true,
      can_upgrade_to: ['pro'],
      upgrade_prices: { pro: 20000 }, // selisih 49K - 29K
    };
  }

  // Pro — semua dibuka
  return {
    ...base,
    market_score_breakdown: true,
    omzet_tiga_range: true,
    omzet_confidence: true,
    kompetitor_detail: true,
    customer_breakdown: true,
    go_nogo_penjelasan: true,
    rekomendasi_harga: true,
    rencana_aksi_count: 10,
    bep: true,
    working_capital: true,
    benchmark_margin: true,
    compare_lokasi: true,
    export_pdf: true,
    can_upgrade_to: [],
    upgrade_prices: {},
  };
}

export interface FoodIntelFeatures {
  top_kelompok: number;
  insight_paragraf: number;
  sub_komoditas_detail: boolean;
  ide_bisnis: boolean;
  lq_detail: boolean;
  export_pdf: boolean;
  can_upgrade_to: FoodIntelTier[];
  upgrade_price: number;
}

export function getFoodIntelFeatures(tier: FoodIntelTier): FoodIntelFeatures {
  if (tier === 'free') {
    return {
      top_kelompok: 5,
      insight_paragraf: 1,
      sub_komoditas_detail: false,
      ide_bisnis: false,
      lq_detail: false,
      export_pdf: false,
      can_upgrade_to: ['standard'],
      upgrade_price: 15000,
    };
  }
  return {
    top_kelompok: 13,
    insight_paragraf: 5,
    sub_komoditas_detail: true,
    ide_bisnis: true,
    lq_detail: true,
    export_pdf: true,
    can_upgrade_to: [],
    upgrade_price: 0,
  };
}

export const TIER_LABELS: Record<string, string> = {
  free: 'Gratis',
  standard: 'Standar',
  pro: 'Pro',
};

export const TIER_RANK: Record<string, number> = {
  free: 0,
  standard: 1,
  pro: 2,
};
