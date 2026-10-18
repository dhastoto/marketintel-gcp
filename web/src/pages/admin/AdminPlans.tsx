import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// DEPRECATED: Halaman ini akan diganti dengan AdminProducts (kelola products & bundles)
// di Step 15B. Tabel `plans` sudah dihapus.
export default function AdminPlans() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Halaman dalam Migrasi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Sistem paket berbasis kredit telah digantikan dengan sistem pembelian per laporan.
          </p>
          <p>
            Pengelolaan produk (FoodIntel & MarketIntel: Gratis / Standar / Pro) dan paket hemat
            akan tersedia di halaman <strong>Admin → Produk &amp; Paket</strong> pada update berikutnya.
          </p>
          <p>
            Sementara waktu, perubahan harga dapat dilakukan langsung di database melalui
            tabel <code className="px-1.5 py-0.5 rounded bg-muted">products</code> dan{" "}
            <code className="px-1.5 py-0.5 rounded bg-muted">bundles</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
