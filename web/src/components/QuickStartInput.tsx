import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Loader2, Check, Edit2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { matchLocation, type ParsedBusiness, type MatchedLocation } from "@/lib/quickstart-matcher";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

const EXAMPLES = [
  "Warung kopi di Depok, harga 15-25rb",
  "Laundry kiloan di Bekasi",
  "Toko roti di Bogor, skala rumahan",
];

const SCALE_LABELS: Record<string, string> = {
  gerobak: "Gerobak / Keliling",
  rumahan: "Rumahan",
  mikro: "Mikro",
  kecil: "Kecil",
  menengah: "Menengah",
  besar: "Besar",
};

export interface QuickStartResult {
  parsed: ParsedBusiness;
  matched: MatchedLocation;
  /** True bila confidence high & semua field penting matched → boleh langsung jalan analisis. */
  canAutoRun: boolean;
}

interface Props {
  /** Dipanggil saat user setuju (auto-run atau edit-manual). Parent yang memutuskan flow. */
  onConfirm: (result: QuickStartResult, mode: "auto" | "manual") => void;
}

export function QuickStartInput({ onConfirm }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedBusiness | null>(null);
  const [matched, setMatched] = useState<MatchedLocation | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);

  const reset = () => {
    setParsed(null);
    setMatched(null);
    setMatchError(null);
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (text.length < 3) {
      toast.error("Tulis minimal 3 karakter rencana bisnis Anda");
      return;
    }
    setLoading(true);
    reset();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const { data, error } = await supabase.functions.invoke("quickstart-parse", {
        body: { input: text },
      });
      clearTimeout(timer);

      if (error) throw error;
      const p = data?.parsed as ParsedBusiness | undefined;
      if (!p) throw new Error("AI tidak mengembalikan hasil");

      const m = matchLocation(p);
      setParsed(p);
      setMatched(m);
      if (!m) {
        setMatchError(
          `Lokasi "${p.kabupaten_kota}" tidak ditemukan di daftar kab/kota kami. Silakan pilih manual di wizard.`,
        );
      }
    } catch (e: any) {
      console.error("[QuickStart] parse error", e);
      toast.error(
        e?.message?.includes("aborted")
          ? "AI butuh waktu terlalu lama. Silakan isi form manual di bawah."
          : "Belum bisa memahami input. Silakan isi form manual di bawah.",
      );
    } finally {
      setLoading(false);
    }
  };

  const categoryLabel = parsed
    ? PRODUCT_CATEGORIES.find((c) => c.value === parsed.category)?.label ?? parsed.category
    : "";

  // Auto-run hanya jika: confidence high, lokasi matched (city minimal), kategori valid.
  const canAutoRun =
    !!parsed &&
    !!matched &&
    parsed.confidence === "high" &&
    !!matched.district; // butuh kecamatan untuk jalan tanpa wizard

  return (
    <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-transparent p-5 md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-base font-semibold md:text-lg">Ceritakan rencana bisnis Anda</h2>
        <Badge variant="secondary" className="text-[10px]">AI Powered</Badge>
      </div>

      {!parsed && (
        <>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleSubmit();
              }}
              placeholder='Contoh: "warung steak di Ciledug, harga 25-35rb"'
              disabled={loading}
              maxLength={500}
              className="h-12 flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={loading || input.trim().length < 3}
              className="h-12 gradient-amber border-0 text-accent-foreground hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memahami...
                </>
              ) : (
                <>
                  Analisis <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {!loading && input.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setInput(ex)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:border-accent/50 hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            atau isi form manual ↓
          </p>
        </>
      )}

      {parsed && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-sm font-medium">Saya memahami rencana Anda:</p>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <Row label="Jenis Bisnis" value={parsed.business_name} />
              <Row label="Kategori" value={categoryLabel} />
              <Row
                label="Lokasi"
                value={
                  matched
                    ? `${matched.district ? matched.district + ", " : ""}${matched.city}, ${matched.province}`
                    : `${parsed.kecamatan ? parsed.kecamatan + ", " : ""}${parsed.kabupaten_kota}${parsed.provinsi ? ", " + parsed.provinsi : ""}`
                }
              />
              <Row
                label="Range Harga"
                value={
                  parsed.price_min || parsed.price_max
                    ? `Rp ${(parsed.price_min ?? 0).toLocaleString("id-ID")} — Rp ${(parsed.price_max ?? 0).toLocaleString("id-ID")}`
                    : "—"
                }
              />
              <Row label="Skala" value={parsed.business_scale ? SCALE_LABELS[parsed.business_scale] ?? parsed.business_scale : "—"} />
              <Row
                label="Kepercayaan AI"
                value={
                  <Badge
                    variant="outline"
                    className={
                      parsed.confidence === "high"
                        ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : parsed.confidence === "medium"
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                          : "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400"
                    }
                  >
                    {parsed.confidence === "high" ? "Tinggi" : parsed.confidence === "medium" ? "Sedang" : "Rendah"}
                  </Badge>
                }
              />
            </dl>
            {parsed.notes && (
              <p className="mt-3 rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                <Sparkles className="mr-1 inline h-3 w-3" /> {parsed.notes}
              </p>
            )}
          </div>

          {matchError && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{matchError}</p>
            </div>
          )}

          {!canAutoRun && matched && (
            <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              {parsed.confidence !== "high"
                ? "Beberapa detail belum yakin — kami akan isi otomatis ke wizard, silakan lengkapi sebelum submit."
                : "Kecamatan belum spesifik — silakan pilih kecamatan di wizard."}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {canAutoRun && (
              <Button
                onClick={() =>
                  onConfirm({ parsed, matched: matched!, canAutoRun: true }, "auto")
                }
                className="gradient-amber border-0 text-accent-foreground hover:opacity-90"
              >
                <Check className="mr-1.5 h-4 w-4" /> Ya, Analisis Sekarang
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                onConfirm(
                  { parsed, matched: matched ?? { province: "", city: "", district: null }, canAutoRun: false },
                  "manual",
                )
              }
            >
              <Edit2 className="mr-1.5 h-4 w-4" /> {canAutoRun ? "Edit Manual" : "Lanjut ke Wizard"}
            </Button>
            <Button variant="ghost" onClick={() => { setInput(""); reset(); }} className="text-muted-foreground">
              Mulai ulang
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-28 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
