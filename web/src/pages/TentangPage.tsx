import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useCtaTarget } from "@/hooks/useCtaTarget";

const TentangPage = () => {
  const ctaAnalysis = useCtaTarget("analysis");
  return (
  <PublicLayout>
    <SEOHead
      title="Tentang MarketIntel — Platform Riset Pasar UMKM"
      description="MarketIntel adalah platform analisis pasar berbasis data BPS untuk UMKM Indonesia. Membantu pelaku usaha mengambil keputusan bisnis berbasis data."
      canonical="/tentang"
    />
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Tentang MarketIntel</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <p className="text-lg text-muted-foreground">
          MarketIntel adalah platform analisis pasar berbasis data yang dirancang khusus untuk UMKM dan pelaku bisnis lokal di Indonesia.
          Kami percaya bahwa setiap keputusan bisnis — terutama pemilihan lokasi dan jenis usaha — seharusnya didasarkan pada data, bukan asumsi.
        </p>

        <h2 className="text-2xl font-bold mt-12">Visi Kami</h2>
        <p className="text-muted-foreground">
          Menjadikan riset pasar yang sebelumnya hanya bisa diakses oleh perusahaan besar menjadi terjangkau dan mudah digunakan oleh UMKM di seluruh Indonesia.
          Dengan teknologi AI dan data resmi dari BPS, kami ingin membantu jutaan pelaku usaha kecil mengambil keputusan yang lebih cerdas.
        </p>

        <h2 className="text-2xl font-bold mt-12">Data yang Kami Gunakan</h2>
        <p className="text-muted-foreground">
          MarketIntel menggunakan data dari sumber resmi yang terpercaya:
        </p>
        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
          <li><strong>BPS Susenas 2025</strong> — Data pengeluaran konsumen dari Survei Sosial Ekonomi Nasional yang mencakup 514 kabupaten/kota dan 220+ komoditas makanan.</li>
          <li><strong>Google Maps API</strong> — Data kompetitor, traffic, dan lokasi strategis secara real-time.</li>
          <li><strong>Data Populasi BPS</strong> — Demografi hingga level kelurahan untuk estimasi ukuran pasar yang akurat.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-12">Untuk Siapa?</h2>
        <p className="text-muted-foreground">
          MarketIntel dirancang untuk pelaku UMKM yang ingin membuka usaha makanan, calon pengusaha yang mencari peluang bisnis, 
          konsultan bisnis yang membutuhkan data analisis pasar, serta siapa saja yang ingin membuat keputusan bisnis berbasis data di Indonesia.
        </p>

        <div className="mt-12 text-center">
          <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" size="lg" asChild>
            <Link to={ctaAnalysis}>Mulai Analisis Gratis <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  </PublicLayout>
  );
};

export default TentangPage;
