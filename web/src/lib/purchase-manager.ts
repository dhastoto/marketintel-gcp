import { supabase } from "@/integrations/supabase/client";
import { TIER_RANK } from "./report-features";

export type ProductType = 'marketintel' | 'foodintel';

export interface AvailablePurchase {
  id: string;
  tier: string;
  product_code: string;
  product_type: string;
}

/**
 * Cek apakah user punya purchase available untuk tipe produk tertentu.
 * Memilih purchase dengan tier tertinggi (Pro > Standard > Free).
 */
export async function getAvailablePurchase(
  userId: string,
  productType: ProductType
): Promise<AvailablePurchase | null> {
  const { data, error } = await supabase
    .from('user_purchases')
    .select('id, tier, product_code, product_type')
    .eq('user_id', userId)
    .eq('product_type', productType)
    .eq('status', 'available');

  if (error || !data || data.length === 0) return null;

  // Sort manual berdasarkan TIER_RANK (Pro tertinggi)
  const sorted = [...data].sort(
    (a, b) => (TIER_RANK[b.tier] ?? 0) - (TIER_RANK[a.tier] ?? 0)
  );
  return sorted[0];
}

/**
 * Hitung jumlah purchase available per tipe produk.
 */
export async function countAvailablePurchases(
  userId: string
): Promise<{ marketintel: number; foodintel: number }> {
  const { data } = await supabase
    .from('user_purchases')
    .select('product_type')
    .eq('user_id', userId)
    .eq('status', 'available');

  const counts = { marketintel: 0, foodintel: 0 };
  (data || []).forEach((row: { product_type: string }) => {
    if (row.product_type === 'marketintel') counts.marketintel++;
    else if (row.product_type === 'foodintel') counts.foodintel++;
  });
  return counts;
}

/**
 * Konsumsi purchase: link ke analisis & set status 'used'.
 */
export async function consumePurchase(
  purchaseId: string,
  analysisId: string
) {
  return supabase
    .from('user_purchases')
    .update({
      status: 'used',
      analysis_id: analysisId,
      used_at: new Date().toISOString(),
    })
    .eq('id', purchaseId);
}

/**
 * Ambil tier dari analisis tertentu (untuk render hasil).
 * Jika ada upgrade, ambil tier tertinggi yang ter-link ke analisis.
 *
 * GCP demo build: `user_purchases` / payment gating is intentionally out of
 * scope (see README), so every report renders fully unlocked instead of
 * silently falling back to 'free' when that table isn't found.
 */
export async function getAnalysisTier(
  _analysisId: string
): Promise<string> {
  return 'pro';
}
