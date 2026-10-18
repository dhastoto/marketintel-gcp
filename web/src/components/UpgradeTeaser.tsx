import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { UpgradeReportDialog } from "@/components/UpgradeReportDialog";

interface UpgradeTeaserProps {
  message: string;
  targetPlan: string;
  /** Jika diisi, klik akan membuka dialog upgrade per-laporan (bayar selisih) alih-alih navigate ke /harga */
  analysisId?: string;
  currentTier?: string;
  onUpgraded?: () => void;
}

const planNames: Record<string, string> = {
  starter: 'Standar (Rp 29.000)',
  pro: 'Pro (Rp 49.000)',
  business: 'Pro (Rp 49.000)',
};

export function UpgradeTeaser({ message, targetPlan, analysisId, currentTier, onUpgraded }: UpgradeTeaserProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Mode per-laporan: buka dialog bayar selisih
  const isPerReport = !!(analysisId && currentTier && currentTier !== "pro");

  const handleClick = () => {
    if (isPerReport) {
      setOpen(true);
    } else {
      navigate('/harga');
    }
  };

  return (
    <>
      <div className="border border-dashed border-border rounded-lg p-4 bg-muted/30 text-center my-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <button
          onClick={handleClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Upgrade ke {planNames[targetPlan] || 'paket berbayar'}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {isPerReport && (
        <UpgradeReportDialog
          open={open}
          onOpenChange={setOpen}
          currentTier={currentTier!}
          analysisId={analysisId!}
          onUpgraded={onUpgraded}
        />
      )}
    </>
  );
}
