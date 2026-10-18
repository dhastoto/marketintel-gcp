import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, CreditCard, Wallet, Building2, ShieldCheck, CheckCircle2, Loader2, Zap, Crown, Star, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlans } from "@/hooks/usePlans";

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="h-5 w-5 text-blue-500" />,
  Crown: <Crown className="h-5 w-5 text-accent" />,
  Star: <Star className="h-5 w-5 text-yellow-500" />,
};

type PaymentMethod = "bank_transfer" | "ewallet" | "credit_card";

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: {
        onSuccess?: (result: Record<string, unknown>) => void;
        onPending?: (result: Record<string, unknown>) => void;
        onError?: (result: Record<string, unknown>) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

export default function Checkout() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get("plan") || "starter";
  const qtyParam = parseInt(searchParams.get("qty") || "1", 10);
  const qty = isNaN(qtyParam) || qtyParam < 1 ? 1 : qtyParam;

  const { data: plans, isLoading } = usePlans();
  const basePlan = plans?.find((p) => p.plan_key === planKey);

  // For topup with qty > 1, adjust price and credits
  const plan = basePlan ? {
    ...basePlan,
    price: basePlan.plan_key === "topup" ? basePlan.price * qty : basePlan.price,
    credits_amount: basePlan.plan_key === "topup" ? basePlan.credits_amount * qty : basePlan.credits_amount,
    price_display: basePlan.plan_key === "topup" && qty > 1
      ? `Rp ${(basePlan.price * qty).toLocaleString("id-ID")}`
      : basePlan.price_display,
    credits_label: basePlan.plan_key === "topup" && qty > 1
      ? `${basePlan.credits_amount * qty} kredit`
      : basePlan.credits_label,
  } : undefined;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const loadSnapScript = (clientKey: string, isSandbox: boolean) => {
    return new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("midtrans-snap");
      if (existing) { resolve(); return; }
      const script = document.createElement("script");
      script.id = "midtrans-snap";
      script.src = isSandbox
        ? "https://app.sandbox.midtrans.com/snap/snap.js"
        : "https://app.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", clientKey);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Midtrans Snap"));
      document.head.appendChild(script);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan || plan.price === 0) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h2 className="text-xl font-semibold mb-2">Paket tidak ditemukan</h2>
        <Button variant="outline" onClick={() => navigate("/app/upgrade")}>Kembali ke Upgrade</Button>
      </div>
    );
  }

  const discountPercent = Number(plan.discount_percent || 0);
  const discountAmount = Math.round((plan.price * discountPercent) / 100);
  const tax = 0;
  const total = Math.max(0, plan.price - discountAmount + tax);
  const planIcon = iconMap[plan.icon] || <Zap className="h-5 w-5 text-primary" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast.error("Sesi login tidak valid. Silakan login ulang.");
        setIsProcessing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-midtrans-transaction", {
        body: { plan_id: plan.plan_key, payment_method: paymentMethod, ...(plan.plan_key === "topup" && qty > 1 ? { qty } : {}) },
      });

      if (error || !data?.token) {
        toast.error(data?.error || "Gagal membuat transaksi. Silakan coba lagi.");
        setIsProcessing(false);
        return;
      }

      await loadSnapScript(data.client_key, data.is_sandbox);

      if (!window.snap) {
        toast.error("Payment gateway belum siap. Silakan refresh halaman.");
        setIsProcessing(false);
        return;
      }

      window.snap.pay(data.token, {
        onSuccess: async (result: Record<string, unknown>) => {
          try {
            const verifyOrderId = (result?.order_id as string) || data.order_id;
            await supabase.functions.invoke("verify-payment", {
              body: { order_id: verifyOrderId },
            });
          } catch (e) {
            console.error("Verify payment error:", e);
          }
          setIsSuccess(true);
          setIsProcessing(false);
          toast.success("Pembayaran berhasil! Plan Anda telah di-upgrade.");
          await refreshProfile();
        },
        onPending: () => {
          setIsProcessing(false);
          toast.info("Pembayaran menunggu konfirmasi.");
          navigate("/app/dashboard");
        },
        onError: () => {
          setIsProcessing(false);
          toast.error("Pembayaran gagal. Silakan coba lagi.");
        },
        onClose: () => setIsProcessing(false),
      });
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in-up py-12">
        <Card className="text-center border-green-500/30">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Pembayaran Berhasil!</h2>
            <p className="text-muted-foreground">
              Selamat! Anda telah berlangganan paket <strong>{plan.name}</strong>.
            </p>
            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paket</span>
                <span className="font-medium">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Dibayar</span>
                <span className="font-medium">Rp {total.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Metode</span>
                <span className="font-medium capitalize">{paymentMethod.replace("_", " ")}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/app/dashboard")}>Ke Dashboard</Button>
              <Button className="flex-1 gradient-amber border-0 text-accent-foreground" onClick={() => navigate("/app/analysis/new")}>Mulai Analisis</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-in-up space-y-6">
      {/* Maintenance Notice */}
      <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <AlertTitle className="text-amber-700 dark:text-amber-400">Pembelian Kredit Sedang Tidak Tersedia</AlertTitle>
        <AlertDescription className="text-amber-600 dark:text-amber-300">
          Sistem pembayaran Midtrans sedang dalam perbaikan. Pembelian paket dan kredit tambahan sementara tidak dapat dilakukan. 
          Silakan gunakan <strong>2 kredit gratis</strong> yang tersedia. Mohon maaf atas ketidaknyamanannya.
        </AlertDescription>
      </Alert>

      <button onClick={() => navigate("/app/upgrade")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke pilihan paket
      </button>
      <h1 className="text-2xl font-bold">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Metode Pembayaran</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-3">
                  <label className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "bank_transfer" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <RadioGroupItem value="bank_transfer" />
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Transfer Bank</div>
                      <div className="text-xs text-muted-foreground">BCA, Mandiri, BNI, BRI</div>
                    </div>
                    <span className="text-xs text-secondary-foreground/80">Populer</span>
                  </label>
                  <label className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "ewallet" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <RadioGroupItem value="ewallet" />
                    <Wallet className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">E-Wallet</div>
                      <div className="text-xs text-muted-foreground">GoPay, OVO, DANA, ShopeePay</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${paymentMethod === "credit_card" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                    <RadioGroupItem value="credit_card" />
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Kartu Kredit / Debit</div>
                      <div className="text-xs text-muted-foreground">Visa, Mastercard, JCB</div>
                    </div>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center text-sm text-muted-foreground">
              <ShieldCheck className="h-5 w-5 mx-auto mb-2" />
              <p>Detail pembayaran akan dikelola oleh <strong>Midtrans</strong> secara aman.</p>
              <p className="text-xs mt-1">Anda akan diarahkan ke halaman pembayaran Midtrans setelah klik "Bayar".</p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="sticky top-6">
              <CardHeader className="pb-3"><CardTitle className="text-base">Ringkasan Pesanan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted/50 p-2">{planIcon}</div>
                  <div>
                    <div className="font-medium">Paket {plan.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {plan.credits_amount === 0 ? "Kredit unlimited" : `${plan.credits_amount} kredit`} · {plan.period || "bulanan"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <div key={String(f)} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>{String(f)}</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{plan.price_display}</span>
                  </div>
                   {discountPercent > 0 && (
                    <div className="flex justify-between text-green-600">
                       <span>Diskon {plan.discount_label || `${discountPercent}%`}</span>
                       <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>Rp {total.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full gradient-amber border-0 text-accent-foreground hover:opacity-90" size="lg" disabled={isProcessing}>
                  {isProcessing ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Memproses...</span>
                  ) : (
                    `Bayar Rp ${total.toLocaleString("id-ID")}`
                  )}
                </Button>

                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Pembayaran aman via Midtrans</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
