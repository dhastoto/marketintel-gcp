import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_purchase: number | null;
  max_discount: number | null;
  applicable_products: string[] | null;
  applicable_bundles: string[] | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  current_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export default function AdminPromo() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["admin", "promo_codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoCode[];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("promo_codes").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "promo_codes"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promo_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promo_codes"] });
      toast.success("Promo dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isExpired = (p: PromoCode) => p.valid_until && new Date(p.valid_until) < new Date();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promo Code</h1>
          <p className="text-sm text-muted-foreground">Kelola kode promo untuk diskon checkout.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-1" /> Buat Promo Baru
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Nilai</TableHead>
                <TableHead>Berlaku</TableHead>
                <TableHead>Terpakai</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>}
              {promos.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold">{p.code}</TableCell>
                  <TableCell>{p.discount_type === "percentage" ? "Persentase" : "Nominal"}</TableCell>
                  <TableCell>
                    {p.discount_type === "percentage" ? `${p.discount_value}%` : fmtRp(p.discount_value)}
                    {p.max_discount && p.discount_type === "percentage" && (
                      <div className="text-xs text-muted-foreground">max {fmtRp(p.max_discount)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {isExpired(p) ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : p.valid_until ? (
                      `s/d ${new Date(p.valid_until).toLocaleDateString("id-ID")}`
                    ) : "Selamanya"}
                  </TableCell>
                  <TableCell>{p.current_uses || 0} / {p.max_uses || "∞"}</TableCell>
                  <TableCell>
                    <Switch checked={p.is_active} onCheckedChange={(v) => toggle.mutate({ id: p.id, is_active: v })} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`Hapus promo "${p.code}"?`)) remove.mutate(p.id);
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && promos.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Belum ada promo code.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(editing || creating) && (
        <PromoEditDialog promo={editing} onClose={() => { setEditing(null); setCreating(false); }} />
      )}
    </div>
  );
}

function PromoEditDialog({ promo, onClose }: { promo: PromoCode | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !promo;
  const [code, setCode] = useState(promo?.code || "");
  const [description, setDescription] = useState(promo?.description || "");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(promo?.discount_type || "percentage");
  const [discountValue, setDiscountValue] = useState(promo?.discount_value || 0);
  const [maxDiscount, setMaxDiscount] = useState(promo?.max_discount?.toString() || "");
  const [minPurchase, setMinPurchase] = useState(promo?.min_purchase?.toString() || "0");
  const [validUntil, setValidUntil] = useState(
    promo?.valid_until ? new Date(promo.valid_until).toISOString().split("T")[0] : ""
  );
  const [maxUses, setMaxUses] = useState(promo?.max_uses?.toString() || "");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(promo?.max_uses_per_user?.toString() || "1");

  const save = useMutation({
    mutationFn: async () => {
      const codeUp = code.toUpperCase().trim();
      if (!/^[A-Z0-9_]{3,20}$/.test(codeUp)) throw new Error("Kode 3-20 karakter, alfanumerik + underscore");
      if (discountValue <= 0) throw new Error("Nilai diskon harus > 0");
      if (discountType === "percentage" && discountValue > 100) throw new Error("Persentase max 100");

      const payload = {
        code: codeUp,
        description: description || null,
        discount_type: discountType,
        discount_value: discountValue,
        min_purchase: parseInt(minPurchase) || 0,
        max_discount: maxDiscount ? parseInt(maxDiscount) : null,
        max_uses: maxUses ? parseInt(maxUses) : null,
        max_uses_per_user: parseInt(maxUsesPerUser) || 1,
        valid_until: validUntil ? new Date(validUntil + "T23:59:59").toISOString() : null,
        is_active: true,
      };

      if (isNew) {
        const { error } = await supabase.from("promo_codes").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promo_codes").update(payload).eq("id", promo!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "promo_codes"] });
      toast.success(isNew ? "Promo dibuat" : "Promo diperbarui");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Buat Promo Baru" : `Edit: ${promo?.code}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Kode Promo *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
              placeholder="UMKM2026"
              disabled={!isNew}
            />
            <p className="text-xs text-muted-foreground mt-1">3-20 karakter, uppercase + angka + underscore</p>
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Tipe Diskon *</Label>
            <RadioGroup value={discountType} onValueChange={(v: any) => setDiscountType(v)} className="flex gap-4 mt-1">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="percentage" id="pct" />
                <Label htmlFor="pct" className="font-normal cursor-pointer">Persentase (%)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fixed" id="fix" />
                <Label htmlFor="fix" className="font-normal cursor-pointer">Nominal tetap (Rp)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nilai Diskon * {discountType === "percentage" ? "(%)" : "(Rp)"}</Label>
              <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)} />
            </div>
            {discountType === "percentage" && (
              <div>
                <Label>Maksimum Diskon (Rp)</Label>
                <Input type="number" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} placeholder="opsional" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Minimum Pembelian (Rp)</Label>
              <Input type="number" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} />
            </div>
            <div>
              <Label>Berlaku Sampai</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Batas Total Penggunaan</Label>
              <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="kosong = tak terbatas" />
            </div>
            <div>
              <Label>Batas Per User</Label>
              <Input type="number" value={maxUsesPerUser} onChange={(e) => setMaxUsesPerUser(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
