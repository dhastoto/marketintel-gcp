import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { Check, Search, UtensilsCrossed, ArrowRight, BarChart3, MapPin, Sword, Lightbulb, Flame, CheckSquare, Store, Users, TrendingUp } from "lucide-react";
import { useCtaTarget } from "@/hooks/useCtaTarget";

const FiturPage = () => {
  const ctaFood = useCtaTarget("food");
  const ctaAnalysis = useCtaTarget("analysis");
  return (
  <PublicLayout>
    <SEOHead
      title="Fitur MarketIntel — Analisis Lokasi & Cari Peluang Bisnis"
      description="Dua fitur utama MarketIntel: Analisis Lokasi untuk validasi bisnis dan Cari Peluang untuk menemukan bisnis makanan terbaik di kota Anda."
      canonical="/fitur"
    />
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4 text-center">Fitur MarketIntel</h1>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
        Tiga produk yang membantu Anda mengambil keputusan bisnis berbasis data, bukan asumsi.
      </p>

      {/* FoodIntel */}
      <div className="mx-auto max-w-4xl mb-16">
        <div className="rounded-xl border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-amber-500/10 p-3"><UtensilsCrossed className="h-7 w-7 text-amber-500" /></div>
            <div>
              <h2 className="text-2xl font-bold">Cari Peluang Bisnis Makanan</h2>
              <p className="text-muted-foreground">1 kredit per kabupaten/kota</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            Belum tahu mau jual apa? Fitur ini menganalisis data pengeluaran konsumen dari BPS Susenas 2025 untuk 514 kabupaten/kota di Indonesia. 
            Sistem menghitung Skor Kekuatan Permintaan untuk setiap komoditas makanan, menentukan archetype pasar (Core, Niche, Mass, atau Weak), 
            dan memberikan estimasi ukuran pasar. Anda akan mendapatkan ranking lengkap 220+ komoditas makanan dengan ide bisnis yang relevan.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              "Ranking 220+ komoditas per kab/kota",
              "Skor Kekuatan Permintaan (spending × LQ)",
              "Market Archetype: Core, Niche, Mass, Weak",
              "Estimasi ukuran pasar mingguan",
              "Ide bisnis terkait setiap komoditas",
              "Data BPS Susenas 2025 terupdate",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-accent shrink-0" />{f}</div>
            ))}
          </div>
          <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
            <Link to={ctaFood}>Cari Peluang Sekarang <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* MarketIntel */}
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-accent/10 p-3"><Search className="h-7 w-7 text-accent" /></div>
            <div>
              <h2 className="text-2xl font-bold">Analisis Lokasi Detail</h2>
              <p className="text-muted-foreground">2 kredit per kecamatan</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            Sudah punya ide bisnis? Fitur ini membantu Anda memvalidasi lokasi dengan data real-time dari Google Maps dan demografi BPS. 
            Sistem menganalisis kompetitor di area, menghitung estimasi omzet 3-tier (konservatif, moderat, optimistis), 
            menentukan titik impas (BEP), dan memberikan rekomendasi Go/Conditional-Go/No-Go lengkap dengan action plan harian.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { icon: BarChart3, text: "Profil Demografi & Psikografi" },
              { icon: MapPin, text: "Pemetaan Lokasi Strategis" },
              { icon: Sword, text: "Analisis Kelemahan Kompetitor" },
              { icon: Lightbulb, text: "Inovasi Produk (Product Gap)" },
              { icon: Flame, text: "Estimasi Omzet & BEP" },
              { icon: CheckSquare, text: "Action Plan Harian" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2 text-sm"><f.icon className="h-4 w-4 text-accent shrink-0" />{f.text}</div>
            ))}
          </div>
          <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
            <Link to={ctaAnalysis}>Coba Analisis Lokasi <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* Directory Search */}
      <div className="mx-auto max-w-4xl mt-16">
        <div className="rounded-xl border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="rounded-lg bg-purple-500/10 p-3"><Store className="h-7 w-7 text-purple-500" /></div>
            <div>
              <h2 className="text-2xl font-bold">Directory Search</h2>
              <p className="text-muted-foreground">Khusus Distributor & Produsen B2B</p>
            </div>
          </div>
          <p className="text-muted-foreground mb-6">
            Produk B2B untuk distributor dan produsen yang ingin memetakan outlet retail — toko, warung, minimarket, dan pedagang —
            di wilayah target distribusi mereka. Masukkan nama produk dan wilayah, sistem menampilkan direktori lengkap berikut
            potensi pasar dan data spending konsumen dari BPS per kategori produk makanan.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { icon: Store, text: "Direktori outlet retail per kab/kota" },
              { icon: Users, text: "Market size: penduduk & rumah tangga" },
              { icon: TrendingUp, text: "BPS spending per kapita (produk makanan)" },
              { icon: MapPin, text: "Potensi per kecamatan (ranking populasi)" },
              { icon: Search, text: "Keyword pencarian custom (manual)" },
              { icon: CheckSquare, text: "Export CSV — nama, alamat, telepon" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2 text-sm"><f.icon className="h-4 w-4 text-purple-500 shrink-0" />{f.text}</div>
            ))}
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 mb-6">
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Bagaimana cara kerjanya?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Input nama produk — sistem otomatis deteksi kategori BPS (makanan/non-makanan)</li>
              <li>2. Pilih provinsi + kabupaten/kota target distribusi</li>
              <li>3. Masukkan keyword pencarian (contoh: "toko sembako", "minimarket")</li>
              <li>4. Sistem mencari via Google Maps + menampilkan data pasar BPS</li>
            </ul>
          </div>
          <div className="flex items-center gap-4">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0" asChild>
              <Link to="/harga#directory">Lihat Paket & Harga <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/app/directory">Coba Gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </PublicLayout>
  );
};

export default FiturPage;
