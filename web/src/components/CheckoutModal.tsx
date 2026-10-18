import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Clock, Tag, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Phase = "idle" | "loading" | "snap_open" | "polling" | "success" | "pending" | "error";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  purchaseType: "single" | "bundle";
  /** product_code (for single) or bundle_code (for bundle) */
  code: string | null;
  /** Pre-discount amount used for promo display & validation */
  baseAmount?: number;
  /** Optional: callback after a successful purchase is provisioned */
  onSuccess?: (invoiceNumber: string) => void;
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options: {
          onSuccess?: (result: Record<string, unknown>) => void;
          onPending?: (result: Record<string, unknown>) => void;
          onError?: (result: Record<string, unknown>) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const SNAP_SCRIPT_ID = "midtrans-snap-script";

function loadSnapScript(clientKey: string, isSandbox: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const src = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/snap.js"
      : "https://app.midtrans.com/snap/snap.js";

    const existing = document.getElementById(SNAP_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (existing.getAttribute("src") === src && existing.dataset.clientKey === clientKey) {
        if (window.snap) return resolve();
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Snap.js failed to load")), { once: true });
        return;
      }
      existing.remove();
    }

    const script = document.createElement("script");
    script.id = SNAP_SCRIPT_ID;
    script.src = src;
    script.setAttribute("data-client-key", clientKey);
    script.dataset.clientKey = clientKey;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Snap.js failed to load"));
    document.head.appendChild(script);
  });
}

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export function CheckoutModal({ open, onClose, purchaseType, code, baseAmount, onSuccess }: CheckoutModalProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const isSnapOpen = phase === "snap_open";

  // Promo state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");

  const initRef = useRef(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      initRef.current = false;
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setPhase("idle");
      setErrorMsg("");
      setInvoiceNumber("");
      setPromoInput("");
      setAppliedPromo(null);
      setPromoError("");
    }
  }, [open]);

  async function applyPromo() {
    if (!promoInput.trim() || !baseAmount) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const { data, error } = await supabase.functions.invoke("validate-promo", {
        body: {
          code: promoInput.trim().toUpperCase(),
          amount: baseAmount,
          product_code: purchaseType === "single" ? code : undefined,
          bundle_code: purchaseType === "bundle" ? code : undefined,
        },
      });
      if (error) throw error;
      if (!data?.valid) {
        setPromoError(data?.message || "Kode promo tidak valid");
        setAppliedPromo(null);
      } else {
        setAppliedPromo({ code: data.code, discount: data.discount, message: data.message });
        setPromoError("");
      }
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Gagal validasi promo");
    } finally {
      setPromoLoading(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  async function startCheckout() {
    if (initRef.current || !code) return;
    initRef.current = true;
    try {
      setPhase("loading");
      const payload: Record<string, string> = { purchase_type: purchaseType };
      if (purchaseType === "single") payload.product_code = code;
      else payload.bundle_code = code;
      if (appliedPromo) payload.promo_code = appliedPromo.code;

      const { data, error } = await supabase.functions.invoke("create-payment", { body: payload });

      if (error) {
        let upstreamMsg: string | undefined;
        const ctx = (error as { context?: unknown }).context;
        if (ctx && typeof (ctx as Response).json === "function") {
          try {
            const body = await (ctx as Response).clone().json();
            upstreamMsg = body?.error || body?.message;
          } catch { /* ignore */ }
        }
        throw new Error(upstreamMsg || error.message || "Gagal membuat pembayaran");
      }
      if (!data?.token || !data?.client_key) {
        throw new Error(data?.error || "Respons pembayaran tidak valid");
      }

      setInvoiceNumber(data.invoice_number);

      await loadSnapScript(data.client_key, !!data.is_sandbox);
      if (!window.snap) throw new Error("Snap.js belum siap");

      setPhase("snap_open");
      const invoice = data.invoice_number;
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // Reset Snap state if a previous popup is still tracked internally.
      // This prevents "Invalid state transition from PopupInView to PopupInView".
      try {
        (window.snap as unknown as { hide?: () => void })?.hide?.();
      } catch { /* ignore */ }

      // Defer to next tick so Snap fully resets before opening a new popup.
      await new Promise((r) => setTimeout(r, 50));

      window.snap.pay(data.token, {
        onSuccess: () => {
          setPhase("polling");
          // Trigger verify-purchase immediately so we don't depend on webhook in dev
          supabase.functions.invoke("verify-purchase", { body: { invoice_number: invoice } })
            .catch((e) => console.warn("verify-purchase failed:", e));
          startPolling(data.transaction_id);
        },
        onPending: () => {
          setPhase("polling");
          supabase.functions.invoke("verify-purchase", { body: { invoice_number: invoice } })
            .catch((e) => console.warn("verify-purchase failed:", e));
          startPolling(data.transaction_id);
        },
        onError: () => {
          setErrorMsg("Pembayaran gagal diproses. Silakan coba lagi.");
          setPhase("error");
          initRef.current = false;
        },
        onClose: () => {
          setErrorMsg("Pembayaran dibatalkan.");
          setPhase("error");
          initRef.current = false;
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setErrorMsg(msg);
      setPhase("error");
      initRef.current = false;
    }
  }

  function startPolling(txId: string) {
    let attempts = 0;
    const maxAttempts = 30;
    pollRef.current = window.setInterval(async () => {
      attempts += 1;

      // Every 3rd attempt, also call verify-purchase as a fallback to webhook
      if (attempts % 3 === 0 && invoiceNumber) {
        supabase.functions.invoke("verify-purchase", { body: { invoice_number: invoiceNumber } })
          .catch(() => { /* ignore */ });
      }

      const { data } = await supabase
        .from("user_purchases")
        .select("id, status")
        .eq("transaction_id", txId)
        .eq("status", "available");

      if (data && data.length > 0) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setPhase("success");
        toast({ title: "Pembayaran berhasil", description: `Invoice ${invoiceNumber}` });
        // Auto-redirect after short delay so user sees success state
        window.setTimeout(() => onSuccess?.(invoiceNumber), 1500);
      } else if (attempts >= maxAttempts) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        setPhase("pending");
      }
    }, 2000);
  }

  const finalAmount = (baseAmount || 0) - (appliedPromo?.discount || 0);
  const showSummary = phase === "idle" && baseAmount;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()} modal={!isSnapOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            {invoiceNumber ? `Invoice: ${invoiceNumber}` : "Periksa ringkasan dan lanjut bayar."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {showSummary && (
            <>
              <div className="rounded-lg border p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{fmtRp(baseAmount!)}</span>
                </div>

                {/* Promo input */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Kode promo (opsional)
                  </label>
                  {!appliedPromo ? (
                    <div className="flex gap-2">
                      <Input
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="MASUKKAN KODE"
                        className="h-9 uppercase"
                        disabled={promoLoading}
                      />
                      <Button size="sm" variant="outline" onClick={applyPromo} disabled={!promoInput.trim() || promoLoading}>
                        {promoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pakai"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded bg-emerald-50 px-3 py-2 text-emerald-700">
                      <span className="text-xs">✅ {appliedPromo.message}</span>
                      <button onClick={removePromo} className="text-emerald-700 hover:text-emerald-900">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {promoError && <p className="text-xs text-destructive">❌ {promoError}</p>}
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-700 text-sm">
                    <span>Diskon ({appliedPromo.code})</span>
                    <span>-{fmtRp(appliedPromo.discount)}</span>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">{fmtRp(finalAmount)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={startCheckout} disabled={!code || initRef.current || phase !== "idle"}>
                Bayar {fmtRp(finalAmount)} →
              </Button>
            </>
          )}

          {(phase === "loading" || phase === "snap_open") && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {phase === "loading" ? "Menyiapkan pembayaran…" : "Selesaikan pembayaran di jendela Midtrans."}
              </p>
            </div>
          )}

          {phase === "polling" && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Memverifikasi pembayaran…</p>
              <p className="text-xs text-muted-foreground">Mohon tunggu, jangan tutup halaman ini.</p>
            </div>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <h3 className="text-lg font-semibold">Pembayaran Berhasil!</h3>
              <p className="text-sm text-muted-foreground">Laporan Anda sudah aktif. Mengarahkan ke dashboard…</p>
              <Button className="mt-2 w-full" onClick={() => onSuccess?.(invoiceNumber)}>
                Buka Dashboard Sekarang
              </Button>
            </div>
          )}

          {phase === "pending" && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <Clock className="w-12 h-12 text-accent" />
              <h3 className="text-lg font-semibold">Menunggu Konfirmasi</h3>
              <p className="text-sm text-muted-foreground">
                Pembayaran sedang diproses (max 1×24 jam).
              </p>
              <Button variant="outline" className="mt-2 w-full" onClick={onClose}>Tutup</Button>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <AlertCircle className="w-12 h-12 text-destructive" />
              <h3 className="text-lg font-semibold">Pembayaran Gagal</h3>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <div className="flex gap-2 w-full mt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Tutup</Button>
                <Button className="flex-1" onClick={() => { initRef.current = false; setPhase("idle"); }}>
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
