import { useEffect, useState } from "react";
import { fetchCommodityPrices, type CommodityWithStatus } from "@/lib/commodity-data";
import { TrendingUp, TrendingDown, Minus, AlertCircle, Info, ShoppingBasket } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CommodityPricesTabProps {
  cityApp: string;
}

const fmtRp = (n: number | null | undefined) => {
  if (n == null) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
};

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
};

export const CommodityPricesTab = ({ cityApp }: CommodityPricesTabProps) => {
  const [data, setData] = useState<CommodityWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCommodityPrices(cityApp).then((rows) => {
      if (!cancelled) {
        setData(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cityApp]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Memuat data harga komoditas…</div>;
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Data harga belum tersedia untuk {cityApp}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Data SP2KP Kemendag baru tersedia untuk sebagian kabupaten/kota di Indonesia.
              Coba pilih kabupaten/kota induk atau ibu kota provinsi terdekat.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tanggal = data[0]?.tanggal_data;
  const lokasi = data[0]?.kabupaten_kota;

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-start gap-2">
          <ShoppingBasket className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Harga Bahan Pokok di {lokasi}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Sumber: SP2KP Kemendag · Per {fmtDate(tanggal)} · {data.length} komoditas
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              <strong>HET</strong> = Harga Eceran Tertinggi (batas pemerintah). Harga di atas HET menandakan tekanan pasokan.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase">
              <th className="px-3 py-2.5 font-semibold">Komoditas</th>
              <th className="px-3 py-2.5 font-semibold text-right">Harga Saat Ini</th>
              <th className="px-3 py-2.5 font-semibold text-right">HET</th>
              <th className="px-3 py-2.5 font-semibold text-right">vs HET</th>
              <th className="px-3 py-2.5 font-semibold text-right">Tren</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const trendUp = (row.perubahan_pct ?? 0) > 0.1;
              const trendDown = (row.perubahan_pct ?? 0) < -0.1;
              return (
                <tr key={row.komoditas} className="border-t">
                  <td className="px-3 py-2.5 font-medium">{row.komoditas}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{fmtRp(row.harga_terkini)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{row.het ? fmtRp(row.het) : "-"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {row.status === "tanpa_het" && <span className="text-xs text-muted-foreground">-</span>}
                    {row.status === "di_atas_het" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600">
                        +{row.selisih_het_pct?.toFixed(1)}%
                      </span>
                    )}
                    {row.status === "di_bawah_het" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600">
                        {row.selisih_het_pct?.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs ${trendUp ? "text-red-600" : trendDown ? "text-green-600" : "text-muted-foreground"}`}>
                      {trendUp && <TrendingUp className="h-3.5 w-3.5" />}
                      {trendDown && <TrendingDown className="h-3.5 w-3.5" />}
                      {!trendUp && !trendDown && <Minus className="h-3.5 w-3.5" />}
                      {row.perubahan_pct != null ? `${row.perubahan_pct > 0 ? "+" : ""}${row.perubahan_pct.toFixed(2)}%` : "-"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TooltipProvider>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>Data diperbarui harian oleh Sistem Pemantauan Pasar Kemendag.</span>
          <Tooltip>
            <TooltipTrigger>
              <span className="underline cursor-help">Apa gunanya?</span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Pantau harga bahan baku Anda di lokasi target. Lonjakan harga sapi/ayam/cabai bisa langsung
                memengaruhi HPP dan margin. Bandingkan dengan kota lain untuk negosiasi supplier.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
};
