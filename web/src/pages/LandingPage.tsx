import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import {
  BarChart3, MapPin, Sword, Lightbulb, Flame, CheckSquare, ChevronRight,
  Check, Loader2, Search, UtensilsCrossed, TrendingUp, ArrowRight,
  Database, Globe, LayoutGrid, ShoppingBag, Store
} from "lucide-react";
import { usePlans } from "@/hooks/usePlans";
import { useCtaTarget } from "@/hooks/useCtaTarget";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    q: "Apa itu MarketIntel?",
    a: "MarketIntel adalah platform analisis pasar berbasis data untuk UMKM di Indonesia. Menggunakan data BPS Susenas 2025 dan Google Maps API, MarketIntel membantu pelaku usaha menentukan lokasi bisnis terbaik dan menemukan peluang bisnis makanan yang paling potensial di 514 kabupaten/kota.",
  },
  {
    q: 'Apa bedanya "Analisis Lokasi" dan "Cari Peluang"?',
    a: "Analisis Lokasi untuk Anda yang sudah punya ide bisnis dan ingin validasi lokasi spesifik — hasilnya berupa estimasi omzet, analisis kompetitor, dan rekomendasi Go/No-Go. Cari Peluang untuk Anda yang belum tahu mau jual apa — sistem merekomendasikan bisnis makanan paling potensial di kabupaten/kota pilihan Anda berdasarkan data BPS.",
  },
  {
    q: "Data apa yang digunakan?",
    a: "Data pengeluaran konsumen dari BPS Susenas 2025 (514 kab/kota, 220+ komoditas), data kompetitor dan traffic dari Google Maps API, serta data populasi BPS.",
  },
  {
    q: "Berapa biayanya?",
    a: "Gratis untuk analisis pertama. Paket berbayar mulai dari Rp 15.000 untuk Cari Peluang dan Rp 29.000 untuk Analisis Lokasi. Lihat halaman Harga untuk detail paket.",
  },
  {
    q: "Apakah data bisa dipercaya?",
    a: "Data bersumber dari BPS (Badan Pusat Statistik) yang merupakan lembaga resmi pemerintah Indonesia, dikombinasikan dengan data real-time dari Google Maps.",
  },
  {
    q: "Siapa yang cocok menggunakan MarketIntel?",
    a: "Pelaku UMKM yang ingin membuka usaha makanan, calon pengusaha yang mencari peluang bisnis, serta konsultan bisnis yang membutuhkan data analisis pasar untuk klien mereka.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MarketIntel",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Platform analisis pasar dan rekomendasi bisnis makanan berbasis data BPS untuk UMKM Indonesia.",
    url: "https://marketintel.id",
    offers: { "@type": "AggregateOffer", lowPrice: "0", highPrice: "149000", priceCurrency: "IDR", offerCount: "4" },
    author: { "@type": "Organization", name: "MarketIntel", url: "https://marketintel.id" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

const LandingPage = () => {
  const { data: plans, isLoading: plansLoading } = usePlans();
  const ctaAnalysis = useCtaTarget("analysis");
  const ctaFood = useCtaTarget("food");
  const ctaDashboard = useCtaTarget("dashboard");

  return (
    <PublicLayout>
      <SEOHead
        title="MarketIntel — Riset Pasar & Analisis Lokasi Bisnis UMKM"
        description="Analisis potensi lokasi usaha Anda dengan AI. Estimasi omzet, analisis kompetitor, dan rekomendasi Go/No-Go berbasis data BPS & Google Maps."
        canonical="/"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <section className="gradient-navy-dark relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-500">
              <Flame className="h-4 w-4" /> Platform Intelijen Pasar #1 untuk UMKM
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Riset Pasar Instan untuk{" "}
              <span className="text-gradient-amber">Bisnis Makanan</span> Anda
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-primary-foreground/70">
              Analisis lokasi, estimasi omzet, dan rekomendasi peluang bisnis makanan — berbasis data BPS &amp; Google Maps, bukan asumsi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="gradient-amber rounded-full border-0 px-8 text-lg text-accent-foreground shadow-lg shadow-amber-500/25 hover:scale-[1.02] hover:opacity-90" asChild>
                <Link to={ctaAnalysis}>Mulai Analisis Gratis <ChevronRight className="ml-1 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20" asChild>
                <Link to={ctaFood}>Cari Peluang Bisnis <ArrowRight className="ml-1 h-5 w-5" /></Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-primary-foreground/50">2 kredit gratis • Tanpa kartu kredit</p>
          </div>

          {/* Two Mode Cards */}
          <div className="mx-auto mt-12 max-w-4xl grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 backdrop-blur hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-amber-500/20 p-2.5"><Search className="h-6 w-6 text-amber-500" /></div>
                <div>
                  <h3 className="font-bold text-primary-foreground">Sudah Punya Ide Bisnis?</h3>
                  <p className="text-xs text-primary-foreground/50">Analisis Lokasi Detail</p>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/60 mb-4">Validasi lokasi Anda dengan data kompetitor, estimasi omzet, dan rekomendasi Go/No-Go.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "8.7", label: "Skor Pasar", color: "text-amber-500" },
                  { val: "5", label: "Lokasi Top", color: "text-green-500" },
                  { val: "GO", label: "Keputusan", color: "text-blue-500" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-primary-foreground/10 p-3 text-center">
                    <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-[10px] text-primary-foreground/40">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 backdrop-blur hover:border-amber-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-lg bg-amber-500/20 p-2.5"><UtensilsCrossed className="h-6 w-6 text-amber-500" /></div>
                <div>
                  <h3 className="font-bold text-primary-foreground">Belum Tahu Mau Jual Apa?</h3>
                  <p className="text-xs text-primary-foreground/50">Cari Peluang Bisnis Makanan</p>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/60 mb-4">Temukan bisnis makanan paling potensial di kota Anda dari data 514 kab/kota dan 220+ komoditas.</p>
              <div className="space-y-2">
                {[
                  { name: "Ayam Geprek", badge: "Potensi Tinggi", icon: Flame },
                  { name: "Coffee Shop", badge: "Potensi Sedang", icon: Check },
                  { name: "Bakso Premium", badge: "Potensi Sedang", icon: Check },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-primary-foreground/10 px-3 py-2">
                    <span className="text-xs text-primary-foreground/70">{item.name}</span>
                    <span className="flex items-center gap-1 text-[10px] text-amber-400"><item.icon className="h-3 w-3" /> {item.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">Bagaimana Cara Kerjanya?</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">Tiga langkah sederhana untuk mendapatkan analisis pasar Anda</p>
          <div className="mx-auto max-w-3xl grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Pilih Lokasi", desc: "Ketik alamat atau pilih kab/kota dari 514 daerah di Indonesia.", icon: MapPin },
              { step: "2", title: "Analisis Otomatis", desc: "Sistem analisis kompetitor, demand, dan estimasi omzet dalam hitungan menit.", icon: BarChart3 },
              { step: "3", title: "Dapatkan Rekomendasi", desc: "Laporan lengkap: Go/No-Go, estimasi omzet, BEP, dan peluang bisnis.", icon: CheckSquare },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10">
                  <s.icon className="h-7 w-7 text-accent" />
                </div>
                <div className="text-4xl font-black text-accent/15 mb-2">{s.step}</div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">Berbasis Data Resmi, Bukan Asumsi</h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
            MarketIntel menggunakan data pengeluaran konsumen dari Survei Sosial Ekonomi Nasional (Susenas) BPS 2025 yang mencakup 514 kabupaten/kota dan 220+ komoditas makanan, dikombinasikan dengan data lokasi real-time dari Google Maps.
          </p>
          <div className="mx-auto max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Database, label: "BPS Susenas", val: "2025" },
              { icon: Globe, label: "Google Maps", val: "API" },
              { icon: LayoutGrid, label: "Kab/Kota", val: "514" },
              { icon: ShoppingBag, label: "Komoditas", val: "220+" },
            ].map((d) => (
              <div key={d.label} className="rounded-xl border bg-card p-5 text-center">
                <d.icon className="mx-auto mb-2 h-6 w-6 text-accent" />
                <div className="text-2xl font-bold">{d.val}</div>
                <div className="text-xs text-muted-foreground">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">Apa yang Anda Dapatkan?</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">Tiga produk untuk membantu keputusan bisnis Anda berbasis data</p>
          <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-6">
            {/* FoodIntel */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="rounded-lg bg-amber-500/10 p-2"><UtensilsCrossed className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <h3 className="font-bold">Cari Peluang Bisnis Makanan</h3>
                  <p className="text-xs text-muted-foreground">1 kredit per kab/kota</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Belum tahu mau jual apa? Temukan bisnis makanan paling potensial di kota Anda dari data 514 kab/kota dan 220+ komoditas makanan. Data: BPS Susenas 2025.</p>
              <ul className="space-y-2 mb-4">
                {["Ranking potensi per kota", "Ide bisnis siap jalan", "Signal kekuatan permintaan"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" />{f}</li>
                ))}
              </ul>
              <Button variant="outline" size="sm" asChild><Link to={ctaFood}>Cari Peluang <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
            {/* MarketIntel */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="rounded-lg bg-accent/10 p-2"><Search className="h-5 w-5 text-accent" /></div>
                <div>
                  <h3 className="font-bold">Analisis Lokasi Detail</h3>
                  <p className="text-xs text-muted-foreground">2 kredit per kecamatan</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Sudah punya ide bisnis? Validasi lokasi Anda dengan data kompetitor, estimasi omzet, dan rekomendasi Go/No-Go dari AI + Google Maps.</p>
              <ul className="space-y-2 mb-4">
                {["Estimasi omzet 3-tier", "Analisis kompetitor", "Action plan harian", "Rekomendasi Go/No-Go"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent" />{f}</li>
                ))}
              </ul>
              <Button variant="outline" size="sm" asChild><Link to={ctaAnalysis}>Coba Analisis <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
            {/* Directory Search */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="rounded-lg bg-purple-500/10 p-2"><Store className="h-5 w-5 text-purple-500" /></div>
                <div>
                  <h3 className="font-bold">Directory Search</h3>
                  <p className="text-xs text-muted-foreground">Khusus Distributor & Produsen</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Temukan toko, warung, dan outlet retail yang relevan dengan produk Anda — per kabupaten/kota. Lengkap dengan potensi pasar dan data BPS spending per produk makanan.</p>
              <ul className="space-y-2 mb-4">
                {["Direktori outlet per wilayah", "Potensi pasar & populasi", "Spending BPS per kategori", "Export CSV"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-purple-500" />{f}</li>
                ))}
              </ul>
              <Button variant="outline" size="sm" asChild><Link to="/harga">Lihat Paket <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">Harga Terjangkau untuk UMKM</h2>
          <p className="mx-auto mb-4 max-w-lg text-center text-muted-foreground">Mulai gratis, upgrade kapan saja</p>
          <p className="mx-auto mb-12 max-w-md text-center text-xs text-muted-foreground/70">Bebas pilih: Cari Peluang Bisnis Makanan atau Analisis Lokasi Detail</p>
          {plansLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
          ) : (
            <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
              {(plans || []).map((plan) => {
                const highlight = plan.is_popular;
                const hasDiscount = plan.discount_percent > 0;
                return (
                  <div key={plan.plan_key} className={`relative rounded-xl border p-6 ${highlight ? "border-accent gradient-navy shadow-xl shadow-accent/10" : "border-border bg-card"}`}>
                    {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-amber px-4 py-1 text-xs font-bold text-accent-foreground">RECOMMENDED</div>}
                    <h3 className={`mb-1 text-lg font-bold ${highlight ? "text-primary-foreground" : ""}`}>{plan.name}</h3>
                    <div className={`mb-4 ${highlight ? "text-primary-foreground" : ""}`}>
                      {hasDiscount && <span className="text-sm line-through text-muted-foreground mr-2">{plan.price_display}</span>}
                      <span className="text-3xl font-bold">
                        {hasDiscount ? `Rp ${Math.round(plan.price * (1 - plan.discount_percent / 100)).toLocaleString("id-ID")}` : plan.price_display}
                      </span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <div className={`mb-4 text-sm font-medium ${highlight ? "text-amber-400" : "text-accent"}`}>{plan.credits_label || `${plan.credits_amount} kredit`}</div>
                    <ul className="mb-6 space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className={`flex items-center gap-2 text-sm ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          <Check className={`h-4 w-4 ${highlight ? "text-amber-500" : "text-accent"}`} />{f}
                        </li>
                      ))}
                      {plan.not_included.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/50">
                          <span className="h-4 w-4 text-center">—</span><span className="line-through">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className={`w-full ${highlight ? "gradient-amber border-0 text-accent-foreground hover:opacity-90" : ""}`} variant={highlight ? "default" : "outline"} asChild>
                      <Link to={ctaDashboard}>{plan.button_text}</Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-center text-3xl font-bold">Pertanyaan yang Sering Diajukan</h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-muted-foreground">Temukan jawaban atas pertanyaan umum tentang MarketIntel</p>
          <div className="mx-auto max-w-2xl">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="gradient-navy-dark py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground">Mulai Riset Pasar Anda Sekarang</h2>
          <p className="mx-auto mb-8 max-w-lg text-primary-foreground/70">Bergabung dengan UMKM lain yang sudah menggunakan data untuk mengambil keputusan bisnis yang lebih baik.</p>
          <Button size="lg" className="gradient-amber rounded-full border-0 px-8 text-lg text-accent-foreground shadow-lg shadow-amber-500/25 hover:scale-[1.02] hover:opacity-90" asChild>
            <Link to={ctaDashboard}>Daftar Gratis <ChevronRight className="ml-1 h-5 w-5" /></Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
};

export default LandingPage;
