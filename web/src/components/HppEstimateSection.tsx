import { useEffect, useState } from "react";
import { fetchCommodityPrices, type CommodityWithStatus } from "@/lib/commodity-data";
import { detectRecipe, type RecipeStandard } from "@/lib/hpp-recipes";
import { Calculator, AlertCircle, CheckCircle, Info } from "lucide-react";

interface HppEstimateSectionProps {
  productName: string;
  productCategory?: string | null;
  cityApp: string;
  priceMin?: number | null;
  priceMax?: number | null;
}

const fmtRp = (n: number | null | undefined) => {
  if (n == null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
};

interface IngredientCost {
  komoditas: string;
  gram_per_porsi: number;
  optional: boolean;
  harga_per_kg: number | null;
  cost_per_porsi: number;
  matched: boolean;
}

export const HppEstimateSection = ({ productName, productCategory, cityApp, priceMin, priceMax }: HppEstimateSectionProps) => {
  const [recipe, setRecipe] = useState<RecipeStandard | null>(null);
  const [prices, setPrices] = useState<CommodityWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = detectRecipe(productName, productCategory || undefined);
    setRecipe(r);
    if (!r) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchCommodityPrices(cityApp).then((rows) => {
      if (!cancelled) {
        setPrices(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productName, productCategory, cityApp]);

  if (loading) return null;
  // Resep tidak terdeteksi → tidak tampilkan section (graceful)
  if (!recipe) return null;
  // Tidak ada data harga komoditas untuk lokasi → tidak tampilkan section (graceful)
  if (prices.length === 0) return null;

  // Hitung cost per ingredient
  const ingredientCosts: IngredientCost[] = recipe.ingredients.map((ing) => {
    const price = prices.find((p) => p.komoditas === ing.komoditas);
    const harga_per_kg = price ? price.harga_terkini : null;
    const cost = harga_per_kg ? (harga_per_kg / 1000) * ing.gram_per_porsi : 0;
    return {
      komoditas: ing.komoditas,
      gram_per_porsi: ing.gram_per_porsi,
      optional: !!ing.optional,
      harga_per_kg,
      cost_per_porsi: cost,
      matched: harga_per_kg != null,
    };
  });

  const matchedCount = ingredientCosts.filter((c) => c.matched).length;
  // Butuh minimal 50% bahan utama match agar HPP bermakna
  if (matchedCount < Math.ceil(recipe.ingredients.length * 0.5)) return null;

  const bahanCost = ingredientCosts.reduce((sum, c) => sum + c.cost_per_porsi, 0);
  const overheadCost = bahanCost * (recipe.overhead_pct / 100);
  const totalHpp = bahanCost + overheadCost;

  const avgPrice = priceMin && priceMax ? (priceMin + priceMax) / 2 : null;
  const margin = avgPrice ? avgPrice - totalHpp : null;
  const marginPct = avgPrice && margin != null ? (margin / avgPrice) * 100 : null;
  const marginHealthy = marginPct != null && marginPct >= 50;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Calculator className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-bold text-base">Estimasi HPP per Porsi</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Resep: <strong>{recipe.label}</strong> · Berdasarkan harga komoditas terkini di lokasi target
          </p>
        </div>
      </div>

      {/* Tabel bahan */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Bahan</th>
              <th className="px-3 py-2 font-semibold text-right">Porsi</th>
              <th className="px-3 py-2 font-semibold text-right">Harga/kg</th>
              <th className="px-3 py-2 font-semibold text-right">Biaya</th>
            </tr>
          </thead>
          <tbody>
            {ingredientCosts.map((c) => (
              <tr key={c.komoditas} className={`border-t ${!c.matched ? "opacity-50" : ""}`}>
                <td className="px-3 py-2">
                  {c.komoditas}
                  {c.optional && <span className="text-[10px] text-muted-foreground ml-1">(opsional)</span>}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">{c.gram_per_porsi}g</td>
                <td className="px-3 py-2 text-right text-muted-foreground">{c.matched ? fmtRp(c.harga_per_kg) : "n/a"}</td>
                <td className="px-3 py-2 text-right font-medium">{c.matched ? fmtRp(c.cost_per_porsi) : "-"}</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30">
              <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold">Subtotal Bahan Baku</td>
              <td className="px-3 py-2 text-right font-semibold">{fmtRp(bahanCost)}</td>
            </tr>
            <tr className="border-t bg-muted/30">
              <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold">
                Overhead ({recipe.overhead_pct}% — gas, kemasan, listrik)
              </td>
              <td className="px-3 py-2 text-right font-semibold">{fmtRp(overheadCost)}</td>
            </tr>
            <tr className="border-t bg-primary/10">
              <td colSpan={3} className="px-3 py-2.5 text-right text-sm font-bold">Total HPP per Porsi</td>
              <td className="px-3 py-2.5 text-right text-base font-bold text-primary">{fmtRp(totalHpp)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Margin analysis */}
      {avgPrice && margin != null && marginPct != null && (
        <div className={`rounded-lg p-3 ${marginHealthy ? "bg-green-500/10" : margin > 0 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
          <div className="flex items-start gap-2">
            {marginHealthy ? (
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${margin > 0 ? "text-amber-600" : "text-red-600"}`} />
            )}
            <div className="flex-1 text-xs space-y-1">
              <p className={`font-semibold ${marginHealthy ? "text-green-700 dark:text-green-400" : margin > 0 ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}>
                Harga jual rata-rata: {fmtRp(avgPrice)} · Margin kotor: {fmtRp(margin)} ({marginPct.toFixed(0)}%)
              </p>
              <p className="text-muted-foreground">
                {marginHealthy
                  ? "Margin sehat untuk F&B (target ideal ≥50% kotor untuk menutup operasional & profit)."
                  : margin > 0
                  ? "Margin di bawah target ideal F&B (50%). Pertimbangkan naikkan harga atau efisiensi bahan."
                  : "⚠️ HPP melebihi harga jual! Cek ulang resep atau naikkan harga jual."}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Estimasi berbasis resep standar UMKM dan harga SP2KP Kemendag. Resep aktual Anda dapat berbeda.
          Belum termasuk biaya tenaga kerja & sewa tempat (lihat OPEX di benchmark).
        </p>
      </div>
    </div>
  );
};
