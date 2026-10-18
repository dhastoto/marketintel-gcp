import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
        <h1 className="text-3xl font-bold mb-2">Kebijakan Privasi</h1>
        <p className="text-sm text-muted-foreground mb-8">Terakhir diperbarui: 14 April 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">1. Informasi yang Kami Kumpulkan</h2>
            <h3 className="text-lg font-medium mt-4 mb-2">a. Informasi Akun</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nama lengkap</li>
              <li>Alamat email</li>
              <li>Nomor telepon (opsional)</li>
              <li>Nama bisnis (opsional)</li>
            </ul>
            <h3 className="text-lg font-medium mt-4 mb-2">b. Informasi Bisnis (Input Analisis)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nama dan kategori produk</li>
              <li>Lokasi target (provinsi, kota, kecamatan)</li>
              <li>Range harga produk</li>
              <li>Target segmen pasar</li>
              <li>Skala bisnis dan budget</li>
            </ul>
            <h3 className="text-lg font-medium mt-4 mb-2">c. Informasi Teknis</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Alamat IP</li>
              <li>Tipe browser dan perangkat</li>
              <li>Halaman yang dikunjungi dan waktu akses</li>
              <li>Data cookie dan local storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">2. Cara Kami Menggunakan Informasi</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Menyediakan Layanan:</strong> Menjalankan analisis pasar berdasarkan input Anda.</li>
              <li><strong>Peningkatan Layanan:</strong> Menganalisis pola penggunaan untuk menyempurnakan engine dan fitur.</li>
              <li><strong>Komunikasi:</strong> Mengirim notifikasi terkait akun, transaksi, dan pembaruan layanan.</li>
              <li><strong>Keamanan:</strong> Mendeteksi dan mencegah aktivitas penipuan atau penyalahgunaan.</li>
              <li><strong>Analitik:</strong> Menggunakan Google Analytics dan Meta Pixel untuk memahami traffic dan efektivitas pemasaran.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">3. Penyimpanan dan Keamanan Data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Data disimpan di server cloud dengan enkripsi standar industri.</li>
              <li>Akses ke database dibatasi dengan Row Level Security (RLS).</li>
              <li>Kata sandi di-hash dan tidak pernah disimpan dalam bentuk plain text.</li>
              <li>Kami melakukan audit keamanan secara berkala.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">4. Berbagi Data dengan Pihak Ketiga</h2>
            <p>Kami <strong>tidak menjual</strong> data pribadi Anda. Data hanya dibagikan kepada:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Penyedia layanan pembayaran</strong> (Midtrans) — untuk memproses transaksi.</li>
              <li><strong>Google Maps Platform</strong> — untuk mengambil data lokasi dan kompetitor (data dikirim anonim).</li>
              <li><strong>Google Analytics & Meta</strong> — untuk analitik website (data anonim/agregat).</li>
              <li><strong>Penegak hukum</strong> — jika diwajibkan oleh hukum yang berlaku.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">5. Cookie dan Teknologi Pelacakan</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cookie esensial:</strong> Untuk autentikasi dan sesi pengguna.</li>
              <li><strong>Cookie analitik:</strong> Google Analytics untuk memahami penggunaan platform.</li>
              <li><strong>Pixel pelacakan:</strong> Meta Pixel untuk mengukur efektivitas iklan.</li>
            </ul>
            <p>Anda dapat menonaktifkan cookie melalui pengaturan browser, namun beberapa fitur mungkin tidak berfungsi optimal.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">6. Hak Pengguna</h2>
            <p>Anda berhak untuk:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Mengakses:</strong> Melihat data pribadi yang kami simpan tentang Anda.</li>
              <li><strong>Memperbarui:</strong> Mengoreksi informasi yang tidak akurat melalui halaman Pengaturan.</li>
              <li><strong>Menghapus:</strong> Meminta penghapusan akun dan data terkait dengan menghubungi support.</li>
              <li><strong>Mengekspor:</strong> Meminta salinan data Anda dalam format yang dapat dibaca mesin.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">7. Retensi Data</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Data akun disimpan selama akun aktif.</li>
              <li>Hasil analisis disimpan selama akun aktif dan dapat diakses kapan saja.</li>
              <li>Data cache lokasi (Google Maps) disimpan maksimal 30 hari untuk efisiensi.</li>
              <li>Log transaksi disimpan minimal 5 tahun sesuai regulasi perpajakan Indonesia.</li>
              <li>Setelah penghapusan akun, data dihapus dalam 30 hari kerja.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">8. Perlindungan Anak</h2>
            <p>Layanan kami tidak ditujukan untuk pengguna di bawah 18 tahun. Kami tidak secara sengaja mengumpulkan data dari anak-anak.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">9. Perubahan Kebijakan</h2>
            <p>Kami dapat memperbarui Kebijakan Privasi ini sewaktu-waktu. Perubahan signifikan akan diberitahukan melalui email atau notifikasi di platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-3">10. Kontak</h2>
            <p>Untuk pertanyaan terkait privasi data Anda, hubungi kami di <strong>privacy@marketintel.id</strong>.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
