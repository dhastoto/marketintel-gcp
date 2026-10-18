import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, UtensilsCrossed, ArrowRight, Crown, Receipt, Plus } from "lucide-react";
import { TIER_RANK } from "@/lib/report-features";
import { UpgradeReportDialog } from "@/components/UpgradeReportDialog";

interface PurchaseRow {
  id: string;
  product_code: string;
  tier: string;
  product_type: string;
  status: string;
  source: string;
  price_paid: number;
  created_at: string;
  used_at: string | null;
  analysis_id: string | null;
  product_name?: string;
}

const tierLabel: Record<string, string> = {
  free: "Gratis",
  standard: "Standar",
  pro: "Pro",
};

const tierColor: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  standard: "bg-blue-100 text-blue-700",
  pro: "bg-amber-100 text-amber-700",
};

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function MyReports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [filter, setFilter] = useState<"all" | "marketintel" | "foodintel" | "available">("all");
  const [loading, setLoading] = useState(true);
  const [upgradeDialog, setUpgradeDialog] = useState<{ analysisId: string; currentTier: string; productType: "marketintel" | "foodintel"; targetTier: "standard" | "pro" } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_purchases")
        .select("id, product_code, tier, product_type, status, source, price_paid, created_at, used_at, analysis_id, products(name)")
        .eq("user_id", user.id)
        .in("status", ["available", "used"])
        .order("created_at", { ascending: false });
      const mapped = (data || []).map((r: any) => ({
        ...r,
        product_name: r.products?.name,
      }));
      setRows(mapped);
      setLoading(false);
    })();
  }, [user]);

  const total = rows.length;
  const available = rows.filter((r) => r.status === "available").length;
  const used = rows.filter((r) => r.status === "used").length;

  const filtered = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "available") return r.status === "available";
    return r.product_type === filter;
  });

  // Group available purchases (sorted by tier rank desc) for upgrade suggestions per analysis
  const getUpgradeOptions = (currentTier: string, productType: string) => {
    const currentRank = TIER_RANK[currentTier] ?? 0;
    const tiers: Array<{ tier: string; price: number; label: string }> = [];
    if (productType === "marketintel") {
      if (currentRank < TIER_RANK.standard) tiers.push({ tier: "standard", price: 29000, label: "Standar" });
      if (currentRank < TIER_RANK.pro) tiers.push({ tier: "pro", price: 49000, label: "Pro" });
    } else if (productType === "foodintel") {
      if (currentTier === "free") tiers.push({ tier: "standard", price: 15000, label: "Lengkap" });
    }
    return tiers;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kredit & Paket</h1>
          <p className="text-sm text-muted-foreground">Kuota laporan tersedia dan terpakai</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/app/my-transactions")}>
            <Receipt className="mr-2 h-4 w-4" /> Riwayat Pembayaran
          </Button>
          <Button onClick={() => navigate("/harga")}>
            <Plus className="mr-2 h-4 w-4" /> Beli Laporan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{total}</div><div className="text-xs text-muted-foreground">laporan</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tersedia</div><div className="text-2xl font-bold text-emerald-600">{available}</div><div className="text-xs text-muted-foreground">belum dipakai</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Sudah Dipakai</div><div className="text-2xl font-bold">{used}</div><div className="text-xs text-muted-foreground">selesai</div></CardContent></Card>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="marketintel">MarketIntel</TabsTrigger>
          <TabsTrigger value="foodintel">FoodIntel</TabsTrigger>
          <TabsTrigger value="available">Tersedia</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Memuat...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <p className="text-muted-foreground mb-4">Belum ada laporan di kategori ini.</p>
          <Button onClick={() => navigate("/harga")}>Beli Laporan Pertama</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const Icon = r.product_type === "foodintel" ? UtensilsCrossed : BarChart3;
            const isAvailable = r.status === "available";
            const upgradeOptions = isAvailable ? [] : getUpgradeOptions(r.tier, r.product_type);

            return (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="rounded-lg bg-accent/10 p-2.5">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {r.product_name || r.product_code}
                          </span>
                          <Badge className={tierColor[r.tier] || tierColor.free}>{tierLabel[r.tier] || r.tier}</Badge>
                          {isAvailable && <Badge variant="outline" className="border-emerald-500 text-emerald-700">Tersedia</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {isAvailable
                            ? `Dibeli ${new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                            : `Dipakai ${r.used_at ? new Date(r.used_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}`}
                          {r.source === "free_registration" && " · Bonus registrasi"}
                          {r.price_paid > 0 && ` · ${formatRupiah(r.price_paid)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isAvailable ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            const target = r.product_type === "foodintel"
                              ? `/app/food-opportunity?use_purchase=${r.id}`
                              : `/app/analysis/new?use_purchase=${r.id}`;
                            navigate(target);
                          }}
                        >
                          Gunakan <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      ) : r.analysis_id ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={r.product_type === "foodintel" ? `/app/food-opportunity?result=${r.analysis_id}` : `/app/analysis/${r.analysis_id}`}>
                            Lihat <ArrowRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      ) : null}
                      {upgradeOptions.length > 0 && r.analysis_id && (
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {upgradeOptions.map((opt) => (
                            <Button
                              key={opt.tier}
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-amber-700 hover:bg-amber-50"
                              onClick={() => setUpgradeDialog({
                                analysisId: r.analysis_id!,
                                currentTier: r.tier,
                                productType: r.product_type as "marketintel" | "foodintel",
                                targetTier: opt.tier as "standard" | "pro",
                              })}
                            >
                              <Crown className="mr-1 h-3 w-3" /> Upgrade {opt.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {upgradeDialog && (
        <UpgradeReportDialog
          open={!!upgradeDialog}
          onOpenChange={(v) => !v && setUpgradeDialog(null)}
          currentTier={upgradeDialog.currentTier}
          analysisId={upgradeDialog.analysisId}
          productType={upgradeDialog.productType}
          targetTier={upgradeDialog.targetTier}
          onUpgraded={() => {
            setUpgradeDialog(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
