import { useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpgradeReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: string;
  analysisId: string;
  onUpgraded?: () => void;
  /** "marketintel" (default) or "foodintel" */
  productType?: "marketintel" | "foodintel";
  /** Override target tier. Default: free→standard, standard→pro (marketintel); foodintel selalu standard */
  targetTier?: "standard" | "pro";
}

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const PRICE: Record<string, Record<string, number>> = {
  marketintel: { standard: 29000, pro: 49000 },
  foodintel: { standard: 15000 },
};

export function UpgradeReportDialog({ open, onOpenChange, currentTier, analysisId, onUpgraded, productType = "marketintel", targetTier }: UpgradeReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const isFoodIntel = productType === "foodintel";

  // Tentukan target: prop > default (free→standard, standard→pro untuk marketintel)
  const target = isFoodIntel ? "standard" : (targetTier || (currentTier === "free" ? "standard" : "pro"));
  const targetLabel = isFoodIntel ? "Lengkap" : (target === "pro" ? "Pro" : "Standar");
  // Harga = harga absolut tier target (selisih dihitung di backend dari harga produk - harga tier saat ini)
  const fromPrice = isFoodIntel ? 0 : (currentTier === "standard" ? 29000 : 0);
  const price = (PRICE[productType]?.[target] ?? 0) - fromPrice;
  const isUpgrade = !isFoodIntel && currentTier === "standard";

  const standardBenefits = [
    "Breakdown skor detail per lokasi",
    "Daftar kompetitor lengkap (nama, rating, review)",
    "Estimasi omzet 3 skenario + confidence",
    "Rekomendasi harga jual",
    "Export PDF laporan",
  ];
  const proBenefits = [
    "Simulasi BEP (Break-Even Point)",
    "Analisis working capital",
    "Benchmark margin industri",
    "Bandingkan hingga 3 lokasi",
    "10 rencana aksi + timeline",
  ];

  const benefits = isFoodIntel
    ? [
        "13 kelompok komoditas lengkap (vs 3 di Free)",
        "220+ sub-komoditas dengan demand strength",
        "629 ide bisnis aktual berbasis data BPS",
        "Cross-Commodity Score (Top 10 Ide Bisnis)",
        "Estimasi ukuran pasar mingguan per kategori",
      ]
    : target === "pro" && currentTier === "free"
    ? [...standardBenefits, ...proBenefits]
    : target === "pro"
    ? proBenefits
    : standardBenefits;

  const pollUpgradeStatus = async (transactionId: string, invoiceNumber: string) => {
    const startTime = Date.now();
    const maxDuration = 5 * 60 * 1000;

    const interval = setInterval(async () => {
      if (Date.now() - startTime > maxDuration) {
        clearInterval(interval);
        setPolling(false);
        toast.warning("Timeout menunggu konfirmasi. Refresh halaman beberapa saat lagi.");
        return;
      }

      // Fallback verify ke Midtrans (kalau webhook tidak datang di sandbox)
      try {
        await supabase.functions.invoke("verify-purchase", {
          body: { invoice_number: invoiceNumber },
        });
      } catch (e) {
        console.warn("verify-purchase poll failed:", e);
      }

      const { data: tx } = await supabase
        .from("transactions")
        .select("payment_status")
        .eq("id", transactionId)
        .maybeSingle();

      if (tx?.payment_status === "paid") {
        clearInterval(interval);
        setPolling(false);
        onOpenChange(false);
        toast.success("Upgrade berhasil! Memuat ulang laporan...");
        setTimeout(() => {
          if (onUpgraded) onUpgraded();
          else window.location.reload();
        }, 1000);
      } else if (tx?.payment_status === "failed") {
        clearInterval(interval);
        setPolling(false);
        toast.error("Pembayaran gagal.");
      }
    }, 2500);
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // Selalu refresh dulu supaya token tidak stale (auth log sering session_not_found)
      let accessToken: string | undefined;
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
      accessToken = refreshed?.session?.access_token;
      if (!accessToken || refreshErr) {
        const { data: sessionData } = await supabase.auth.getSession();
        accessToken = sessionData?.session?.access_token;
      }
      if (!accessToken) {
        toast.error("Sesi Anda berakhir. Silakan login ulang.");
        setLoading(false);
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upgrade-purchase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ analysis_id: analysisId, target_tier: target, product_type: productType }),
        },
      );
      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data?.token) {
        toast.error(data?.error || "Gagal memulai upgrade");
        setLoading(false);
        return;
      }

      const isSandbox = data.is_sandbox;
      const snapSrc = isSandbox
        ? "https://app.sandbox.midtrans.com/snap/snap.js"
        : "https://app.midtrans.com/snap/snap.js";

      const existing = document.querySelector(`script[src="${snapSrc}"]`);
      if (!existing) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = snapSrc;
          s.setAttribute("data-client-key", data.client_key);
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Gagal memuat Midtrans"));
          document.head.appendChild(s);
        });
      }

      // Tutup dialog kita supaya overlay Radix tidak memblokir Snap Midtrans
      onOpenChange(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).snap.pay(data.token, {
        onSuccess: () => {
          setLoading(false);
          setPolling(true);
          pollUpgradeStatus(data.transaction_id, data.invoice_number);
        },
        onPending: () => {
          setLoading(false);
          toast.info("Menunggu konfirmasi pembayaran. Halaman akan ter-update otomatis.");
          setPolling(true);
          pollUpgradeStatus(data.transaction_id, data.invoice_number);
        },
        onError: () => {
          setLoading(false);
          toast.error("Pembayaran gagal. Silakan coba lagi.");
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && !polling && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Upgrade ke {targetLabel}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? "Bayar selisih dan langsung buka fitur Pro untuk laporan ini — tanpa perlu re-run analisis."
              : "Buka fitur lengkap MarketIntel Standar untuk laporan ini."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Yang Anda dapat:</span>
              <span className="text-2xl font-bold text-amber-600">{formatRp(price)}</span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {polling && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Menunggu konfirmasi pembayaran...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || polling}>
            Batal
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={loading || polling}
            className="gradient-amber border-0 text-accent-foreground hover:opacity-90"
          >
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</> : "Bayar Sekarang"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
