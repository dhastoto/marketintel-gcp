export const MARKETINTEL_CREDIT_COST = 2;
export const FOODINTEL_CREDIT_COST = 1;

// ============ ARCHETYPE ============

export type MarketArchetype = 'core' | 'niche' | 'mass' | 'weak';

export const ARCHETYPE_CONFIG: Record<MarketArchetype, { label: string; color: string; bg: string; border: string }> = {
  core:  { label: 'Core Opportunity',  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  niche: { label: 'Niche Opportunity', color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20' },
  mass:  { label: 'Mass Market',       color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
  weak:  { label: 'Weak Market',       color: 'text-muted-foreground',              bg: 'bg-muted',         border: 'border-border' },
};

/**
 * Determine archetype from median-relative position.
 * spending >= median AND lq >= median → core, etc.
 */
export function getArchetype(
  spending: number,
  lq: number,
  medianSpending: number,
  medianLq: number
): MarketArchetype {
  const highSpend = spending >= medianSpending;
  const highLq = lq >= medianLq;
  if (highSpend && highLq) return 'core';
  if (!highSpend && highLq) return 'niche';
  if (highSpend && !highLq) return 'mass';
  return 'weak';
}

// ============ SIGNAL BADGES (percentile) ============

export function getSignalByPercentile(index: number, totalItems: number) {
  const percentile = ((totalItems - index) / totalItems) * 100;
  if (percentile >= 75) return { label: "🔥 Potensi Tinggi",  className: "bg-red-500/10 text-red-500 border-red-500/20" };
  if (percentile >= 50) return { label: "✅ Potensi Sedang",  className: "bg-green-500/10 text-green-500 border-green-500/20" };
  if (percentile >= 25) return { label: "➡️ Potensi Rendah",  className: "bg-amber-500/10 text-amber-500 border-amber-500/20" };
  return { label: "⬇️ Potensi Minim", className: "bg-muted text-muted-foreground border-border" };
}

// ============ FORMATTERS ============

/** Format demand strength score */
export function formatDemandStrength(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return "–";
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(0);
}

/** @deprecated Use formatDemandStrength */
export const formatExcess = formatDemandStrength;

/** Format market size (Rp/minggu) */
export function formatMarketSize(weeklyRp: number | null | undefined): string | null {
  if (weeklyRp == null || isNaN(weeklyRp)) return null;
  if (weeklyRp >= 1_000_000_000) return `Rp ${(weeklyRp / 1_000_000_000).toFixed(1)} M/minggu`;
  if (weeklyRp >= 1_000_000) return `Rp ${(weeklyRp / 1_000_000).toFixed(0)} jt/minggu`;
  return `Rp ${weeklyRp.toLocaleString('id-ID')}/minggu`;
}

/** Price ratio label */
export function getPriceLabel(priceRatio: number | null) {
  if (priceRatio === null || priceRatio === undefined) return null;
  if (priceRatio > 1.0) return { label: '💎 Cenderung Premium', color: 'text-amber-500' };
  return { label: '📦 Cenderung Value', color: 'text-blue-500' };
}

export const KELOMPOK_LABELS: Record<string, string> = {
  daging: "Daging",
  ikan_seafood: "Ikan & Seafood",
  telur_susu: "Telur & Susu",
  makanan_jadi: "Makanan Jadi",
  buah: "Buah-buahan",
  kacang: "Kacang-kacangan",
  bahan_minuman: "Bahan Minuman",
  bumbu: "Bumbu",
  padi: "Padi & Tepung",
  umbi: "Umbi-umbian",
};
