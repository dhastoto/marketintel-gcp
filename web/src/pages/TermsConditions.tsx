import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali</Link>
          </Button>
        </div>
      </nav>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Syarat dan Ketentuan</h1>
        <p className="text-sm text-muted-foreground mb-8">Terakhir diperbarui: 14 April 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Definisi</h2>
            <p>"MarketIntel" atau "Kami" merujuk pada platform analisis pasar berbasis AI yang menyediakan layanan riset lokasi bisnis. "Pengguna" atau "Anda" merujuk pada individu atau entitas yang menggunakan layanan MarketIntel. "Layanan" merujuk pada seluruh fitur, analisis, dan konten yang disediakan melalui platform MarketIntel.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Penerimaan Syarat</h2>
            <p>Dengan mendaftar, mengakses, atau menggunakan Layanan, Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak menyetujui, harap tidak menggunakan Layanan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. Layanan yang Disediakan</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Analisis potensi pasar berdasarkan data publik (BPS, Google Maps)</li>
              <li>Scoring lokasi bisnis dengan engine perhitungan otomatis</li>
              <li>Estimasi ekonomi (omzet, BEP, customer harian)</li>
              <li>Rekomendasi strategis berbasis AI</li>
              <li>Perbandingan antar lokasi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Akun Pengguna</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Anda wajib memberikan informasi yang akurat saat pendaftaran.</li>
              <li>Anda bertanggung jawab menjaga kerahasiaan kredensial akun.</li>
              <li>Satu akun hanya untuk satu pengguna/entitas.</li>
              <li>Kami berhak menangguhkan akun yang melanggar ketentuan.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Sistem Kuota & Pembayaran</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Layanan menggunakan sistem kuota analisis. Setiap paket memberikan jumlah kuota yang dapat dipakai untuk Analisis Lokasi (MarketIntel) maupun Cari Peluang (FoodIntel).</li>
              <li>Kuota yang sudah dibeli tidak dapat dikembalikan (non-refundable).</li>
              <li>Pembelian paket meningkatkan plan dan menambah kuota sesuai paket.</li>
              <li>Plan hanya bisa dinaikkan, tidak bisa diturunkan.</li>
              <li>Top-up kuota tidak mengubah plan yang aktif.</li>
              <li>Harga dapat berubah sewaktu-waktu dengan pemberitahuan sebelumnya.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Disclaimer Hasil Analisis</h2>
            <p className="font-medium text-amber-600 dark:text-amber-400">⚠️ PENTING — Harap dibaca dengan seksama:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Semua hasil analisis bersifat <strong>estimasi</strong> berdasarkan data publik yang tersedia.</li>
              <li>Hasil analisis <strong>bukan merupakan jaminan finansial</strong> atau kepastian keberhasilan bisnis.</li>
              <li>Data bersumber dari BPS (Badan Pusat Statistik) dan Google Maps yang mungkin tidak selalu terkini.</li>
              <li>Keputusan bisnis akhir sepenuhnya menjadi tanggung jawab Pengguna.</li>
              <li>MarketIntel tidak bertanggung jawab atas kerugian yang timbul dari keputusan berdasarkan hasil analisis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Hak Kekayaan Intelektual</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Seluruh konten platform (desain, algoritma, engine) adalah milik MarketIntel.</li>
              <li>Hasil analisis yang dihasilkan untuk Anda boleh digunakan untuk keperluan bisnis internal Anda.</li>
              <li>Dilarang menjual kembali, mendistribusikan ulang, atau mempublikasikan hasil analisis secara massal tanpa izin tertulis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Batasan Penggunaan</h2>
            <p>Anda dilarang untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Menggunakan bot, scraper, atau metode otomatis untuk mengakses Layanan.</li>
              <li>Melakukan reverse engineering terhadap algoritma atau engine scoring.</li>
              <li>Membagikan akun kepada pihak ketiga tanpa izin.</li>
              <li>Menggunakan Layanan untuk tujuan ilegal atau merugikan pihak lain.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Batasan Tanggung Jawab</h2>
            <p>MarketIntel menyediakan Layanan "sebagaimana adanya" (as is). Kami tidak memberikan jaminan bahwa Layanan akan selalu tersedia, bebas error, atau memenuhi semua kebutuhan Anda. Total tanggung jawab kami terbatas pada jumlah yang Anda bayarkan dalam 3 bulan terakhir.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Perubahan Ketentuan</h2>
            <p>Kami berhak mengubah Syarat dan Ketentuan ini sewaktu-waktu. Perubahan material akan diberitahukan melalui email atau notifikasi di platform. Penggunaan berkelanjutan setelah perubahan dianggap sebagai persetujuan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">11. Hukum yang Berlaku</h2>
            <p>Syarat dan Ketentuan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia. Segala sengketa akan diselesaikan melalui musyawarah terlebih dahulu, kemudian melalui pengadilan yang berwenang di Indonesia.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">12. Kontak</h2>
            <p>Untuk pertanyaan terkait Syarat dan Ketentuan ini, hubungi kami melalui email di <strong>support@marketintel.id</strong>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
