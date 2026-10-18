import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Loader2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatDemandStrength, getArchetype, ARCHETYPE_CONFIG, getSignalByPercentile, type MarketArchetype } from "@/lib/foodintel-constants";
import { useCtaTarget } from "@/hooks/useCtaTarget";

function slugToCity(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

interface RankingItem {
  kelompok_label: string;
  spending: number;
  avg_nasional: number;
  lq_pct: number;
  demand_strength: number;
  archetype: MarketArchetype;
}

const CityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const cityName = slugToCity(slug || "");
  const ctaFood = useCtaTarget("food");

  const { data, isLoading } = useQuery({
    queryKey: ["city-page", slug],
    queryFn: async () => {
      // Try exact match, then try finding the resolved name
      const { data: foodData } = await supabase
        .from("bps_food_data")
        .select("kelompok, kelompok_label, value_amount")
        .eq("kabupaten_kota", cityName)
        .eq("is_total", true)
        .eq("metric_type", "pengeluaran")
        .gt("value_amount", 0)
        .order("value_amount", { ascending: false });

      if (!foodData || foodData.length === 0) return null;

      const kelompokList = [...new Set(foodData.map((f) => f.kelompok))];
      const { data: avgData } = await supabase
        .from("bps_national_averages")
        .select("kelompok, sub_komoditas, avg_nasional")
        .in("kelompok", kelompokList)
        .eq("metric_type", "pengeluaran");

      const avgMap = new Map<string, number>();
      avgData?.forEach((a) => avgMap.set(`${a.kelompok}::${a.sub_komoditas}`, Number(a.avg_nasional)));

      const items: RankingItem[] = foodData.map((f) => {
        const spending = Number(f.value_amount);
        const avg = avgMap.get(`${f.kelompok}::${f.kelompok_label}`) || 0;
        const lq = avg > 0 ? spending / avg : 0;
        const lq_pct = Math.round(lq * 100);
        const demand_strength = avg > 0 ? Math.round((spending * spending) / avg) : 0;
        return { kelompok_label: f.kelompok_label, spending, avg_nasional: avg, lq_pct, demand_strength, archetype: "weak" as MarketArchetype };
      });

      const medSpend = median(items.map((i) => i.spending));
      const medLq = median(items.map((i) => i.lq_pct / 100));

      return items
        .map((item) => ({
          ...item,
          archetype: getArchetype(item.spending, item.lq_pct / 100, medSpend, medLq),
        }))
        .sort((a, b) => b.demand_strength - a.demand_strength)
        .slice(0, 5);
    },
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });

  const totalSpending = data?.reduce((s, i) => s + i.spending, 0) || 0;
  const topItem = data?.[0];

  return (
    <PublicLayout>
      <SEOHead
        title={`Peluang Bisnis Makanan di ${cityName} 2025 — MarketIntel`}
        description={`Analisis peluang bisnis makanan di ${cityName} berdasarkan data BPS Susenas 2025.${topItem ? ` ${topItem.kelompok_label} spending ${topItem.lq_pct}% di atas rata-rata nasional.` : ""}`}
        canonical={`/kota/${slug}`}
      />
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Peluang Bisnis Makanan di {cityName}</h1>
        <p className="text-muted-foreground mb-8">Data berdasarkan BPS Susenas 2025</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Data belum tersedia untuk {cityName}.</p>
            <Button asChild><Link to={ctaFood}>Coba analisis kota lain</Link></Button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="rounded-xl border bg-card p-6 mb-8">
              <h2 className="font-bold mb-3">Ringkasan</h2>
              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">Rp {totalSpending.toLocaleString("id-ID")}</div>
                  <div className="text-xs text-muted-foreground">/kapita/minggu (top 5)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{topItem?.lq_pct || 0}%</div>
                  <div className="text-xs text-muted-foreground">LQ teratas vs nasional</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{topItem?.kelompok_label}</div>
                  <div className="text-xs text-muted-foreground">Komoditas terkuat</div>
                </div>
              </div>
            </div>

            {/* Top 5 */}
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-accent" />Top 5 Kelompok Komoditas</h2>
            <div className="space-y-3 mb-8">
              {data.map((item, idx) => {
                const badge = getSignalByPercentile(idx, data.length);
                const arch = ARCHETYPE_CONFIG[item.archetype];
                return (
                  <div key={item.kelompok_label} className="rounded-xl border bg-card p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{item.kelompok_label}</div>
                      <div className="text-xs text-muted-foreground">
                        Rp {item.spending.toLocaleString("id-ID")}/kapita/minggu • LQ {item.lq_pct}%
                      </div>
                      <span className={`text-xs font-medium ${arch.color}`}>{arch.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold">{formatDemandStrength(item.demand_strength)}</div>
                      <Badge variant="outline" className={`${badge.className} text-[10px]`}>{badge.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA */}
            <div className="rounded-xl border bg-accent/5 p-6 text-center mb-8">
              <h2 className="font-bold mb-2">Ingin lihat detail lengkap 220+ komoditas dan ide bisnis?</h2>
              <p className="text-sm text-muted-foreground mb-4">Gunakan fitur Cari Peluang untuk analisis lengkap.</p>
              <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
                <Link to={ctaFood}>Analisis Lengkap {cityName} <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>

            {/* City-specific FAQ */}
            <h2 className="text-xl font-bold mb-4">FAQ tentang {cityName}</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="faq-1">
                <AccordionTrigger className="text-left">Bisnis makanan apa yang paling laku di {cityName}?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Berdasarkan data BPS 2025, spending tertinggi di {cityName} ada di kategori {topItem?.kelompok_label} dengan index {topItem?.lq_pct}% terhadap rata-rata nasional.
                  Ini menunjukkan preferensi konsumen yang kuat untuk kategori tersebut.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="faq-2">
                <AccordionTrigger className="text-left">Berapa besar pasar makanan di {cityName}?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Total spending makanan (top 5 kategori) di {cityName} mencapai Rp {totalSpending.toLocaleString("id-ID")}/kapita/minggu berdasarkan data BPS Susenas 2025.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </div>
    </PublicLayout>
  );
};

export default CityPage;
