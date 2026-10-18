import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

const fmtRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  product_type: string;
  tier: string;
  price: number;
  is_active: boolean;
  features: any;
}

interface BundleItem { product_code: string; quantity: number; }
interface Bundle {
  id: string;
  code: string;
  name: string;
  description: string | null;
  items: BundleItem[];
  price: number;
  original_price: number;
  discount_pct: number | null;
  badge: string | null;
  is_active: boolean;
}

export default function AdminProducts() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Produk &amp; Harga</h1>
        <p className="text-sm text-muted-foreground">
          Kelola harga dan fitur setiap produk. Perubahan berlaku untuk pembelian baru saja.
        </p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Produk Satuan</TabsTrigger>
          <TabsTrigger value="bundles">Paket Hemat</TabsTrigger>
        </TabsList>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="bundles"><BundlesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ===== PRODUCTS TAB =====
function ProductsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Status produk diperbarui");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>
            )}
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell>{p.product_type}</TableCell>
                <TableCell><Badge variant="outline">{p.tier}</Badge></TableCell>
                <TableCell>{p.price === 0 ? "Gratis" : fmtRp(p.price)}</TableCell>
                <TableCell>
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => toggleActive.mutate({ id: p.id, is_active: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {editing && <ProductEditDialog product={editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function ProductEditDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [price, setPrice] = useState(product.price);
  const isFree = product.tier === "free";

  const save = useMutation({
    mutationFn: async () => {
      if (!isFree && price < 0) throw new Error("Harga tidak boleh negatif");
      if (isFree && price !== 0) throw new Error("Produk free harga harus 0");
      const { error } = await supabase.from("products").update({
        name, description, price,
      }).eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success("Produk diperbarui");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Produk: {product.code}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Produk</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Harga (Rp) {isFree && <span className="text-xs text-muted-foreground">— produk gratis tidak dapat diubah harganya</span>}</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              disabled={isFree}
              min={0}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Kode <code className="bg-muted px-1 rounded">{product.code}</code> dan tier{" "}
            <code className="bg-muted px-1 rounded">{product.tier}</code> tidak dapat diubah.
          </p>
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

// ===== BUNDLES TAB =====
function BundlesTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ["admin", "bundles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").order("sort_order");
      if (error) throw error;
      return (data || []).map((b: any) => ({
        ...b,
        items: Array.isArray(b.items) ? b.items : [],
      })) as Bundle[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("bundles").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "bundles"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bundles"] });
      toast.success("Paket dihapus");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah Paket
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Isi</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Harga Asli</TableHead>
              <TableHead>Hemat</TableHead>
              <TableHead>Aktif</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Memuat...</TableCell></TableRow>}
            {bundles.map(b => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="font-medium">{b.name}</div>
                  {b.badge && <Badge variant="secondary" className="text-xs mt-1">{b.badge}</Badge>}
                </TableCell>
                <TableCell className="text-xs">
                  {b.items.map((i, idx) => (
                    <div key={idx}>{i.quantity}× {i.product_code}</div>
                  ))}
                </TableCell>
                <TableCell className="font-medium">{fmtRp(b.price)}</TableCell>
                <TableCell className="text-muted-foreground line-through">{fmtRp(b.original_price)}</TableCell>
                <TableCell>{b.discount_pct || 0}%</TableCell>
                <TableCell>
                  <Switch checked={b.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: b.id, is_active: v })} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm(`Hapus paket "${b.name}"?`)) remove.mutate(b.id);
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {(editing || creating) && (
        <BundleEditDialog
          bundle={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </Card>
  );
}

function BundleEditDialog({ bundle, onClose }: { bundle: Bundle | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isNew = !bundle;
  const [code, setCode] = useState(bundle?.code || "");
  const [name, setName] = useState(bundle?.name || "");
  const [description, setDescription] = useState(bundle?.description || "");
  const [badge, setBadge] = useState(bundle?.badge || "");
  const [price, setPrice] = useState(bundle?.price || 0);
  const [items, setItems] = useState<BundleItem[]>(bundle?.items || [{ product_code: "marketintel_std", quantity: 1 }]);

  const { data: products = [] } = useQuery({
    queryKey: ["admin", "products", "list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("code, name, price").eq("is_active", true);
      return data || [];
    },
  });

  const originalPrice = items.reduce((sum, item) => {
    const p = products.find(pr => pr.code === item.product_code);
    return sum + (p?.price || 0) * item.quantity;
  }, 0);
  const discountPct = originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!code.trim() || !name.trim()) throw new Error("Kode dan nama wajib");
      if (price <= 0) throw new Error("Harga harus > 0");
      if (items.length === 0) throw new Error("Minimal 1 item");

      const payload = {
        code, name, description: description || null,
        badge: badge || null,
        price, original_price: originalPrice,
        discount_pct: discountPct,
        items: items as any,
        is_active: true,
      };

      if (isNew) {
        const { error } = await supabase.from("bundles").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bundles").update(payload).eq("id", bundle!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "bundles"] });
      toast.success(isNew ? "Paket dibuat" : "Paket diperbarui");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Buat Paket Baru" : `Edit: ${bundle?.name}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kode *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/\s/g, "_"))} disabled={!isNew} />
            </div>
            <div>
              <Label>Nama *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Deskripsi</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Badge (opsional)</Label>
            <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Paling Populer" />
          </div>

          <div>
            <Label>Isi Paket *</Label>
            <div className="space-y-2 mt-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select value={item.product_code} onValueChange={(v) => {
                    const next = [...items]; next[idx].product_code = v; setItems(next);
                  }}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.code} value={p.code}>{p.name} ({fmtRp(p.price)})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" value={item.quantity} className="w-20"
                    onChange={(e) => {
                      const next = [...items]; next[idx].quantity = Math.max(1, parseInt(e.target.value) || 1); setItems(next);
                    }} />
                  <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setItems([...items, { product_code: products[0]?.code || "", quantity: 1 }])}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Item
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded">
            <div>
              <Label className="text-xs">Harga Bundle (Rp) *</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label className="text-xs">Harga Asli (auto)</Label>
              <div className="text-sm font-medium pt-2">{fmtRp(originalPrice)}</div>
            </div>
            <div>
              <Label className="text-xs">Diskon (auto)</Label>
              <div className="text-sm font-medium pt-2 text-emerald-600">{discountPct}%</div>
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
