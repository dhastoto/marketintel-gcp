import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Loader2, Sparkles, Store, Users, TrendingUp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { CheckoutModal } from "@/components/CheckoutModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  product_type: "marketintel" | "foodintel";
  tier: "free" | "standard" | "pro";
  price: number;
  features: Record<string, unknown>;
  sort_order: number;
}

interface Bundle {
  id: string;
  code: string;
  name: string;
  description: string | null;
  items: Array<{ product_code: string; qty: number }>;
  price: number;
  original_price: number;
  discount_pct: number | null;
  badge: string | null;
  sort_order: number;
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const MARKETINTEL_FEATURES = {
  free: {
    included: [
      "Market Score (angka)",
      "Estimasi omzet (range)",
      "Jumlah kompetitor",
      "Estimasi customer",
      "Go/No-Go (label)",
      "Insight 1 paragraf",
      "3 rencana aksi",
    ],
    excluded: ["Breakdown detail", "Export PDF", "Bandingkan lokasi"],
  },
  standard: {
    included: [
      "Market Score + breakdown",
      "Omzet 3 range + confidence",
      "Kompetitor: nama, rating, lokasi",
      "Customer breakdown detail",
      "Go/No-Go + penjelasan",
      "Rekomendasi harga",
      "7 rencana aksi",
      "Export PDF",
    ],
    excluded: ["Simulasi BEP", "Working capital", "Bandingkan lokasi"],
  },
  pro: {
    included: [
      "Semua fitur Standar",
      "Simulasi BEP",
      "Working capital check",
      "Benchmark margin industri",
      "Bandingkan lokasi",
      "10 rencana aksi + timeline",
      "Export PDF lengkap",
    ],
    excluded: [],
  },
};

const FOODINTEL_FEATURES = {
  free: {
    included: ["Top 5 kelompok komoditas", "Insight 1 paragraf", "Ranking kabupaten/kota"],
    excluded: ["220+ sub-komoditas", "629 ide bisnis", "LQ detail", "Export PDF"],
  },
  standard: {
    included: [
      "13 kelompok lengkap",
      "220+ sub-komoditas",
      "629 ide bisnis konkret",
      "LQ detail + ranking",
      "Cross-commodity dependencies",
      "Export PDF",
    ],
    excluded: [],
  },
};

const FAQ = [
  {
    q: "Apakah laporan yang sudah dibeli bisa expire?",
    a: "Tidak. Laporan bisa diakses kapan saja, tidak ada batas waktu.",
  },
  {
    q: "Bisa upgrade dari Standar ke Pro?",
    a: "Ya, cukup bayar selisih Rp 20.000 untuk analisis yang sudah Anda beli sebagai Standar. Data langsung terbuka tanpa perlu re-run analisis.",
  },
  {
    q: "Metode pembayaran apa saja?",
    a: "GoPay, OVO, DANA, ShopeePay, transfer bank (BCA, BNI, Mandiri, BRI), QRIS, dan kartu kredit/debit.",
  },
  {
    q: "Apakah ada refund?",
    a: "Untuk pembelian berbayar, hubungi support@marketintel.id dalam 7 hari setelah pembelian.",
  },
];

const HargaPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("foodintel");

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as unknown as Product[];
    },
  });

  const { data: bundles, isLoading: loadingBundles } = useQuery({
    queryKey: ["public-bundles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as unknown as Bundle[];
    },
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"single" | "bundle">("single");
  const [checkoutCode, setCheckoutCode] = useState<string | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);

  const resolveAmount = (code: string, type: "single" | "bundle"): number => {
    if (type === "single") return (products || []).find((x) => x.code === code)?.price ?? 0;
    return (bundles || []).find((x) => x.code === code)?.price ?? 0;
  };

  useEffect(() => {
    if (!user) return;
    // Wait until products & bundles loaded so resolveAmount returns real price (not 0)
    if (!products || !bundles) return;

    const buy = searchParams.get("buy");
    const bundle = searchParams.get("bundle");
    if (buy) {
      const amount = resolveAmount(buy, "single");
      if (amount <= 0) return; // produk belum tersedia / kode invalid → jangan buka modal kosong
      setCheckoutType("single");
      setCheckoutCode(buy);
      setCheckoutAmount(amount);
      setCheckoutOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("buy");
      setSearchParams(next, { replace: true });
    } else if (bundle) {
      const amount = resolveAmount(bundle, "bundle");
      if (amount <= 0) return;
      setCheckoutType("bundle");
      setCheckoutCode(bundle);
      setCheckoutAmount(amount);
      setCheckoutOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("bundle");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams, setSearchParams, products, bundles]);

  const handleBuy = (productCode: string, type: "single" | "bundle") => {
    if (!user) {
      const param = type === "single" ? "buy" : "bundle";
      navigate(`/login?redirect=/harga&${param}=${productCode}`);
      return;
    }
    setCheckoutType(type);
    setCheckoutCode(productCode);
    setCheckoutAmount(resolveAmount(productCode, type));
    setCheckoutOpen(true);
  };

  const marketintelProducts = (products || []).filter((p) => p.product_type === "marketintel");
  const foodintelProducts = (products || []).filter((p) => p.product_type === "foodintel");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "MarketIntel",
    description: "Platform analisis pasar berbasis data untuk UMKM Indonesia",
    offers: (products || []).map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: String(p.price),
      priceCurrency: "IDR",
    })),
  };

  return (
    <PublicLayout>
      <SEOHead
        title="Harga MarketIntel — Mulai dari Rp 0 | Bayar Per Laporan"
        description="Analisis lokasi bisnis mulai Rp 29.000 per laporan. Tanpa kredit, tanpa langganan. 1 analisis gratis saat mendaftar."
        canonical="/harga"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Harga yang Jelas, Tanpa Ribet</h1>
          <p className="text-lg text-muted-foreground">
            Bayar per laporan. Tidak ada kredit. Tidak ada langganan. Beli saat butuh.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-4 mb-10 h-12">
            <TabsTrigger value="foodintel" className="text-sm md:text-base">
              FoodIntel
            </TabsTrigger>
            <TabsTrigger value="marketintel" className="text-sm md:text-base">
              MarketIntel
            </TabsTrigger>
            <TabsTrigger value="directory" className="text-sm md:text-base">
              Directory
            </TabsTrigger>
            <TabsTrigger value="bundles" className="text-sm md:text-base">
              Paket Hemat
            </TabsTrigger>
          </TabsList>

          {/* Notice: paid purchases only apply to NEW analyses */}
          {user && (
            <div className="max-w-4xl mx-auto mb-6 rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              <strong>Catatan:</strong> Pembelian baru di halaman ini berlaku untuk analisis <strong>baru</strong>.
              Untuk membuka fitur penuh laporan lama, klik tombol <strong>Upgrade</strong> di laporan tersebut (lebih
              murah, hanya bayar selisih).
            </div>
          )}

          {/* === MARKETINTEL === */}
          <TabsContent value="marketintel">
            {loadingProducts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {marketintelProducts.map((p) => {
                  const feat = MARKETINTEL_FEATURES[p.tier];
                  const highlight = p.tier === "standard";
                  const isFreeForLoggedIn = p.tier === "free" && !!user;
                  return (
                    <ProductCard
                      key={p.code}
                      name={p.name}
                      price={p.price}
                      priceLabel={p.tier === "free" ? "1× saat mendaftar" : "per analisis"}
                      included={feat.included}
                      excluded={feat.excluded}
                      ctaText={
                        isFreeForLoggedIn
                          ? "✓ Sudah Diberikan Saat Daftar"
                          : p.tier === "free"
                            ? "Daftar Gratis →"
                            : `Beli ${p.tier === "standard" ? "Standar" : "Pro"} →`
                      }
                      ctaAction={() =>
                        p.tier === "free"
                          ? navigate(user ? "/app/dashboard" : "/register")
                          : handleBuy(p.code, "single")
                      }
                      ctaDisabled={isFreeForLoggedIn}
                      highlight={highlight}
                      footer={p.tier === "pro" ? "Upgrade dari Standar: +Rp 20.000 saja" : undefined}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === FOODINTEL === */}
          <TabsContent value="foodintel">
            {loadingProducts ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {foodintelProducts.map((p) => {
                  const feat = FOODINTEL_FEATURES[p.tier as "free" | "standard"];
                  const highlight = p.tier === "standard";
                  const isFreeForLoggedIn = p.tier === "free" && !!user;
                  return (
                    <ProductCard
                      key={p.code}
                      name={p.name}
                      price={p.price}
                      priceLabel={p.tier === "free" ? "1× saat mendaftar" : "per kota"}
                      included={feat.included}
                      excluded={feat.excluded}
                      ctaText={
                        isFreeForLoggedIn
                          ? "✓ Sudah Diberikan Saat Daftar"
                          : p.tier === "free"
                            ? "Daftar Gratis →"
                            : "Beli Lengkap →"
                      }
                      ctaAction={() =>
                        p.tier === "free"
                          ? navigate(user ? "/app/dashboard" : "/register")
                          : handleBuy(p.code, "single")
                      }
                      ctaDisabled={isFreeForLoggedIn}
                      highlight={highlight}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* === DIRECTORY SEARCH === */}
          <TabsContent value="directory">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-600 dark:text-purple-400 mb-4">
                  <Store className="h-4 w-4" /> Produk B2B — Distributor & Produsen
                </div>
                <h2 className="text-2xl font-bold mb-2">Directory Search</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Temukan outlet retail yang relevan dengan produk Anda di seluruh Indonesia — lengkap dengan data pasar dan BPS spending.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-10">
                {/* Free tier */}
                <div className="rounded-xl border border-border bg-card p-6 flex flex-col">
                  <h3 className="text-lg font-bold mb-1">Gratis</h3>
                  <div className="text-3xl font-bold mb-1">Rp 0</div>
                  <p className="text-sm text-muted-foreground mb-4">Saat mendaftar</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {[
                      "Market size: total penduduk & KK",
                      "BPS spending per kapita (makanan)",
                      "Ranking potensi per kecamatan",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />{f}
                      </li>
                    ))}
                    {[
                      "Direktori toko (nama, alamat, telepon)",
                      "Export CSV",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground/60">
                        <X className="h-4 w-4 mt-0.5 shrink-0" /><span className="line-through">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="/app/directory">Coba Sekarang →</a>
                  </Button>
                </div>

                {/* Paid tier */}
                <div className="relative rounded-xl border border-accent gradient-navy p-6 flex flex-col shadow-xl shadow-accent/10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-amber px-4 py-1 text-xs font-bold text-accent-foreground whitespace-nowrap">
                    AKSES PENUH
                  </div>
                  <h3 className="text-lg font-bold mb-1 text-primary-foreground">Berbayar</h3>
                  <div className="text-3xl font-bold mb-1 text-primary-foreground">Harga B2B</div>
                  <p className="text-sm text-primary-foreground/60 mb-4">Sesuai volume & kebutuhan</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    {[
                      "Semua fitur gratis",
                      "Direktori lengkap: nama, alamat, telepon",
                      "Pencarian multi-wilayah & multi-keyword",
                      "Rating & status operasional outlet",
                      "Export CSV tanpa batas",
                      "Cache hasil — tidak bayar 2x per wilayah",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-primary-foreground/90">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
                    <a href="/kontak">Hubungi Kami untuk Harga →</a>
                  </Button>
                </div>
              </div>

              {/* Feature highlights */}
              <div className="rounded-xl border bg-muted/30 p-6">
                <h3 className="font-semibold mb-4 text-center">Cocok untuk siapa?</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: Store, title: "Distributor FMCG", desc: "Pemetaan toko & warung untuk ekspansi area distribusi baru." },
                    { icon: Users, title: "Produsen Makanan", desc: "Temukan outlet potensial untuk menitipkan produk ke toko lokal." },
                    { icon: TrendingUp, title: "Tim Sales", desc: "Data akurat: alamat, telepon, dan rating setiap outlet di wilayah target." },
                  ].map((c) => (
                    <div key={c.title} className="text-center p-4">
                      <c.icon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                      <p className="font-semibold text-sm mb-1">{c.title}</p>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* === BUNDLES === */}
          <TabsContent value="bundles">
            {loadingBundles ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {(bundles || []).map((b) => (
                  <BundleCard key={b.code} bundle={b} onBuy={() => handleBuy(b.code, "bundle")} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Comparison Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <div className="rounded-2xl border bg-card p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Berapa biaya riset pasar tanpa MarketIntel?</h2>
            <div className="space-y-3 text-sm md:text-base">
              <ComparisonRow label="Survey lokasi sendiri" cost="2 hari + Rp 50–100K bensin" />
              <ComparisonRow label="Konsultan bisnis" cost="Rp 5–50 juta per studi" />
              <ComparisonRow label="Riset market online" cost="10+ jam tanpa struktur" />
              <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-accent/10 border border-accent/30">
                <span className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" /> MarketIntel Standar
                </span>
                <span className="font-bold text-accent">Rp 29.000 — 5 menit — data BPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">FAQ Harga</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        purchaseType={checkoutType}
        code={checkoutCode}
        baseAmount={checkoutAmount}
        onSuccess={() => {
          setCheckoutOpen(false);
          navigate("/app/my-reports");
        }}
      />
    </PublicLayout>
  );
};

// ============ Sub-components ============

interface ProductCardProps {
  name: string;
  price: number;
  priceLabel: string;
  included: string[];
  excluded: string[];
  ctaText: string;
  ctaAction: () => void;
  ctaDisabled?: boolean;
  highlight?: boolean;
  footer?: string;
}

const ProductCard = ({
  name,
  price,
  priceLabel,
  included,
  excluded,
  ctaText,
  ctaAction,
  ctaDisabled,
  highlight,
  footer,
}: ProductCardProps) => (
  <div
    className={cn(
      "relative rounded-xl border p-6 flex flex-col",
      highlight ? "border-accent gradient-navy shadow-xl shadow-accent/10" : "border-border bg-card",
    )}
  >
    {highlight && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-amber px-4 py-1 text-xs font-bold text-accent-foreground whitespace-nowrap">
        PALING POPULER
      </div>
    )}
    <h2 className={cn("mb-1 text-lg font-bold", highlight && "text-primary-foreground")}>{name}</h2>
    <div className={cn("mb-4", highlight && "text-primary-foreground")}>
      <span className="text-3xl font-bold">{formatRp(price)}</span>
      <div className={cn("text-sm mt-1", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {priceLabel}
      </div>
    </div>
    <ul className="mb-6 space-y-2 flex-1">
      {included.map((f) => (
        <li
          key={f}
          className={cn("flex items-start gap-2 text-sm", highlight ? "text-primary-foreground/90" : "text-foreground")}
        >
          <Check className={cn("h-4 w-4 mt-0.5 shrink-0", highlight ? "text-amber-400" : "text-accent")} />
          <span>{f}</span>
        </li>
      ))}
      {excluded.map((f) => (
        <li
          key={f}
          className={cn(
            "flex items-start gap-2 text-sm",
            highlight ? "text-primary-foreground/40" : "text-muted-foreground/60",
          )}
        >
          <X className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="line-through">{f}</span>
        </li>
      ))}
    </ul>
    <Button
      onClick={ctaAction}
      disabled={ctaDisabled}
      className={cn(
        "w-full",
        highlight && !ctaDisabled && "gradient-amber border-0 text-accent-foreground hover:opacity-90",
      )}
      variant={ctaDisabled ? "secondary" : highlight ? "default" : "outline"}
    >
      {ctaText}
    </Button>
    {footer && (
      <p className={cn("text-xs mt-3 text-center", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {footer}
      </p>
    )}
  </div>
);

const BundleCard = ({ bundle, onBuy }: { bundle: Bundle; onBuy: () => void }) => {
  const highlight = bundle.badge === "Best Value" || bundle.badge === "Paling Populer";
  return (
    <div
      className={cn(
        "relative rounded-xl border p-6 flex flex-col",
        highlight ? "border-accent gradient-navy shadow-xl" : "border-border bg-card",
      )}
    >
      {bundle.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-amber px-4 py-1 text-xs font-bold text-accent-foreground whitespace-nowrap">
          {bundle.badge.toUpperCase()}
        </div>
      )}
      <h2 className={cn("mb-1 text-lg font-bold", highlight && "text-primary-foreground")}>{bundle.name}</h2>
      <p className={cn("text-sm mb-4", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
        {bundle.description}
      </p>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold", highlight && "text-primary-foreground")}>
            {formatRp(bundle.price)}
          </span>
          <span
            className={cn("text-sm line-through", highlight ? "text-primary-foreground/50" : "text-muted-foreground")}
          >
            {formatRp(bundle.original_price)}
          </span>
        </div>
        {bundle.discount_pct && (
          <Badge variant="secondary" className="mt-2 bg-accent/20 text-accent border-accent/30">
            Hemat {bundle.discount_pct}%
          </Badge>
        )}
      </div>

      <ul className="mb-6 space-y-2 flex-1">
        {bundle.items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2 text-sm",
              highlight ? "text-primary-foreground/90" : "text-foreground",
            )}
          >
            <Check className={cn("h-4 w-4 mt-0.5 shrink-0", highlight ? "text-amber-400" : "text-accent")} />
            <span>
              {item.qty}× {productCodeToLabel(item.product_code)}
            </span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onBuy}
        className={cn("w-full", highlight && "gradient-amber border-0 text-accent-foreground hover:opacity-90")}
        variant={highlight ? "default" : "outline"}
      >
        Beli Paket →
      </Button>
    </div>
  );
};

const ComparisonRow = ({ label, cost }: { label: string; cost: string }) => (
  <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-muted/30">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{cost}</span>
  </div>
);

const productCodeToLabel = (code: string): string => {
  const map: Record<string, string> = {
    marketintel_standard: "MarketIntel Standar",
    marketintel_pro: "MarketIntel Pro",
    foodintel_lengkap: "FoodIntel Lengkap",
  };
  return map[code] || code;
};

export default HargaPage;
