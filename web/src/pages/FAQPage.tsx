import { SEOHead } from "@/components/SEOHead";
import { PublicLayout } from "@/components/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  { q: "Apa itu MarketIntel?", a: "MarketIntel adalah platform analisis pasar berbasis data untuk UMKM di Indonesia. Menggunakan data BPS Susenas 2025 dan Google Maps API, MarketIntel membantu pelaku usaha menentukan lokasi bisnis terbaik dan menemukan peluang bisnis makanan yang paling potensial di 514 kabupaten/kota." },
  { q: 'Apa bedanya "Analisis Lokasi" dan "Cari Peluang"?', a: "Analisis Lokasi untuk Anda yang sudah punya ide bisnis dan ingin validasi lokasi spesifik — hasilnya berupa estimasi omzet, analisis kompetitor, dan rekomendasi Go/No-Go. Cari Peluang untuk Anda yang belum tahu mau jual apa — sistem merekomendasikan bisnis makanan paling potensial di kabupaten/kota pilihan Anda berdasarkan data BPS." },
  { q: "Data apa yang digunakan MarketIntel?", a: "Data pengeluaran konsumen dari Survei Sosial Ekonomi Nasional (Susenas) BPS 2025 yang mencakup 514 kabupaten/kota dan 220+ komoditas makanan, dikombinasikan dengan data lokasi dan kompetitor real-time dari Google Maps API, serta data populasi BPS." },
  { q: "Berapa biaya menggunakan MarketIntel?", a: "Gratis untuk analisis pertama. Paket berbayar mulai dari Rp 15.000 untuk Cari Peluang dan Rp 29.000 untuk Analisis Lokasi. Lihat halaman Harga untuk detail paket lengkap." },
  { q: "Apakah data bisa dipercaya?", a: "Data bersumber dari BPS (Badan Pusat Statistik) yang merupakan lembaga resmi pemerintah Indonesia, dikombinasikan dengan data real-time dari Google Maps. Setiap analisis menampilkan sumber data dan confidence badge." },
  { q: "Siapa yang cocok menggunakan MarketIntel?", a: "Pelaku UMKM yang ingin membuka usaha makanan, calon pengusaha yang mencari peluang bisnis, serta konsultan bisnis yang membutuhkan data analisis pasar untuk klien mereka." },
  { q: "Bagaimana cara memulai?", a: "Daftar akun gratis, Anda langsung mendapatkan kuota awal untuk mencoba Cari Peluang dan Analisis Lokasi. Tidak perlu kartu kredit." },
  { q: "Apakah kuota bisa dipakai untuk keduanya?", a: "Ya. Kuota Anda fleksibel dan bisa digunakan untuk Cari Peluang (per kabupaten/kota) maupun Analisis Lokasi (per kecamatan). Kuota tidak expire dan bisa di-top up kapan saja." },
  { q: "Apakah ada refund jika tidak puas?", a: "Analisis yang sudah dijalankan tidak bisa di-refund. Namun Anda bisa mencoba gratis terlebih dahulu sebelum membeli paket berbayar." },
  { q: "Apakah MarketIntel hanya untuk bisnis makanan?", a: "Fitur Cari Peluang (FoodIntel) fokus pada komoditas makanan. Fitur Analisis Lokasi bisa digunakan untuk semua kategori bisnis termasuk makanan, minuman, retail, dan jasa." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const FAQPage = () => (
  <PublicLayout>
    <SEOHead
      title="FAQ MarketIntel — Pertanyaan yang Sering Diajukan"
      description="Jawaban atas pertanyaan umum tentang MarketIntel: biaya, data, fitur, dan cara menggunakan platform analisis pasar untuk UMKM."
      canonical="/faq"
      jsonLd={jsonLd}
    />
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4 text-center">Pertanyaan yang Sering Diajukan</h1>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
        Temukan jawaban atas pertanyaan umum tentang MarketIntel, cara kerja, biaya, dan data yang digunakan.
      </p>
      <div className="mx-auto max-w-2xl">
        <Accordion type="single" collapsible className="w-full">
          {faqItems.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </PublicLayout>
);

export default FAQPage;
