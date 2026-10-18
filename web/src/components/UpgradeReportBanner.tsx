import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeReportDialog } from "@/components/UpgradeReportDialog";

interface UpgradeReportBannerProps {
  currentTier: string;
  analysisId: string;
  onUpgraded?: () => void;
}

const TIER_LABELS: Record<string, string> = {
  free: "Gratis",
  standard: "Standar",
  pro: "Pro",
};

const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export function UpgradeReportBanner({ currentTier, analysisId, onUpgraded }: UpgradeReportBannerProps) {
  const [open, setOpen] = useState(false);

  if (currentTier === "pro") return null;

  const targetLabel = currentTier === "free" ? "Standar" : "Pro";
  const price = currentTier === "free" ? 29000 : 20000;
  const isUpgrade = currentTier === "standard";
  const ctaLabel = isUpgrade
    ? `Upgrade ke Pro — bayar selisih ${formatRp(price)}`
    : `Upgrade ke Standar — ${formatRp(price)}`;

  return (
    <>
      <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <Crown className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Laporan ini: <span className="text-amber-600">{TIER_LABELS[currentTier]}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Buka fitur lengkap dengan upgrade ke {targetLabel}
                {isUpgrade && " — cukup bayar selisih Rp 20.000"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gradient-amber border-0 text-accent-foreground hover:opacity-90 whitespace-nowrap"
            onClick={() => setOpen(true)}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {ctaLabel}
          </Button>
        </div>
      </div>

      <UpgradeReportDialog
        open={open}
        onOpenChange={setOpen}
        currentTier={currentTier}
        analysisId={analysisId}
        onUpgraded={onUpgraded}
      />
    </>
  );
}
