// Adapter: konversi tier per-laporan (free/standard/pro) ke struktur PlanFeatures
// yang sudah dipakai di komponen-komponen analysis dashboard.
// Ini menjembatani sistem gating baru (per-purchase) dengan UI lama tanpa rewrite total.

import { getMarketIntelFeatures, type MarketIntelTier } from "./report-features";
import type { PlanFeatures, InsightLevel } from "./feature-gate";

const INSIGHT_LEVEL_BY_TIER: Record<MarketIntelTier, InsightLevel> = {
  free: "summary",
  standard: "standard",
  pro: "detailed",
};

export function mapTierToFeatures(tier: string): PlanFeatures {
  const t = (["free", "standard", "pro"].includes(tier) ? tier : "free") as MarketIntelTier;
  const f = getMarketIntelFeatures(t);

  return {
    insight_level: INSIGHT_LEVEL_BY_TIER[t],
    show_all_insights: true,
    show_breakdown: f.market_score_breakdown,
    show_raw_data: t === "pro",
    show_wc_analysis: f.working_capital,
    comparison_max: f.compare_lokasi ? 3 : 0,
    export_pdf: f.export_pdf,
    action_plan_count: f.rencana_aksi_count,
    competitor_detail: f.kompetitor_detail,
    omzet_range: f.omzet_tiga_range,
    confidence_badge: f.omzet_confidence,
    bep_detail: f.bep,
  };
}

/**
 * Tentukan target tier upgrade untuk laporan saat ini.
 * - free → standard (Rp 29.000)
 * - standard → pro (Rp 20.000 selisih)
 * - pro → tidak bisa upgrade
 */
export function getUpgradeTarget(currentTier: string): {
  target: MarketIntelTier;
  price: number;
} | null {
  if (currentTier === "free") return { target: "standard", price: 29000 };
  if (currentTier === "standard") return { target: "pro", price: 20000 };
  return null;
}
