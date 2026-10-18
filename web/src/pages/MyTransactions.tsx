import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, FileText } from "lucide-react";

interface TxRow {
  id: string;
  invoice_number: string | null;
  created_at: string;
  paid_at: string | null;
  purchase_type: string;
  product_code: string | null;
  bundle_code: string | null;
  upgrade_to: string | null;
  amount: number;
  discount_amount: number | null;
  promo_code: string | null;
  final_amount: number;
  payment_method: string | null;
  payment_status: string;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  paid: { label: "Lunas", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Menunggu", cls: "bg-amber-100 text-amber-700" },
  failed: { label: "Gagal", cls: "bg-red-100 text-red-700" },
  expired: { label: "Kadaluarsa", cls: "bg-muted text-muted-foreground" },
  refunded: { label: "Refund", cls: "bg-purple-100 text-purple-700" },
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}
function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MyTransactions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, invoice_number, created_at, paid_at, purchase_type, product_code, bundle_code, upgrade_to, amount, discount_amount, promo_code, final_amount, payment_method, payment_status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as TxRow[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const productLabel = (r: TxRow) => {
    if (r.purchase_type === "upgrade") return `Upgrade → ${r.upgrade_to || "?"}`;
    if (r.bundle_code) return `Paket: ${r.bundle_code}`;
    return r.product_code || "-";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Pembayaran</h1>
          <p className="text-sm text-muted-foreground">Semua transaksi pembelian dan upgrade</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/app/my-reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Laporan
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Memuat...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Belum ada transaksi.</p>
          <Button onClick={() => navigate("/harga")}>Lihat Paket</Button>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {rows.map((r) => {
                const s = statusBadge[r.payment_status] || statusBadge.pending;
                return (
                  <AccordionItem key={r.id} value={r.id} className="border-b last:border-b-0 px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center justify-between w-full pr-4 gap-4">
                        <div className="text-left min-w-0">
                          <div className="font-mono text-xs text-muted-foreground">
                            {r.invoice_number || r.id.slice(0, 8)}
                          </div>
                          <div className="font-medium text-sm truncate">{productLabel(r)}</div>
                        </div>
                        <div className="text-xs text-muted-foreground hidden md:block">
                          {fmtDate(r.created_at)}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold text-sm">{rp(r.final_amount)}</div>
                          <Badge className={s.cls + " text-xs"}>{s.label}</Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{r.invoice_number || "-"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tanggal dibuat</span><span>{fmtDate(r.created_at)}</span></div>
                        {r.paid_at && <div className="flex justify-between"><span className="text-muted-foreground">Tanggal lunas</span><span>{fmtDate(r.paid_at)}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">Produk</span><span>{productLabel(r)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Metode bayar</span><span>{r.payment_method || "-"}</span></div>
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rp(r.amount)}</span></div>
                          {r.discount_amount && r.discount_amount > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Promo {r.promo_code ? `(${r.promo_code})` : ""}</span>
                              <span>-{rp(r.discount_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold border-t pt-1"><span>Total bayar</span><span>{rp(r.final_amount)}</span></div>
                        </div>
                        <div className="flex justify-between pt-2"><span className="text-muted-foreground">Status</span><Badge className={s.cls}>{s.label}</Badge></div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
