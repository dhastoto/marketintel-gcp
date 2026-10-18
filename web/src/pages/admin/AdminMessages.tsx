import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Mail, MessageCircle } from "lucide-react";

type Msg = {
  id: string; name: string; email: string; subject: string; message: string;
  status: "unread" | "read" | "replied"; notes: string | null;
  created_at: string; replied_at: string | null;
};

const STATUS_LABEL: Record<string, string> = { unread: "Belum dibaca", read: "Sudah dibaca", replied: "Sudah dibalas" };
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  unread: "default", read: "secondary", replied: "outline",
};

export default function AdminMessages() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "replied">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Msg | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Gagal memuat pesan");
    else setMessages((data as Msg[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = messages.filter((m) => {
    if (filter !== "all" && m.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: messages.length,
    unread: messages.filter((m) => m.status === "unread").length,
    read: messages.filter((m) => m.status === "read").length,
    replied: messages.filter((m) => m.status === "replied").length,
  };

  const openMessage = async (m: Msg) => {
    setSelected(m);
    setNotes(m.notes || "");
    if (m.status === "unread") {
      const { error } = await supabase.from("contact_messages").update({ status: "read" }).eq("id", m.id);
      if (!error) {
        setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "read" } : x));
      }
    }
  };

  const updateStatus = async (status: "read" | "replied") => {
    if (!selected) return;
    const updates: { status: "read" | "replied"; notes: string; replied_at?: string } = { status, notes };
    if (status === "replied") updates.replied_at = new Date().toISOString();
    const { error } = await supabase.from("contact_messages").update(updates).eq("id", selected.id);
    if (error) { toast.error("Gagal update"); return; }
    toast.success("Status diperbarui");
    setMessages((prev) => prev.map((x) => x.id === selected.id ? { ...x, ...updates } as Msg : x));
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pesan Kontak</h1>
        <p className="text-sm text-muted-foreground">Pesan masuk dari halaman /kontak</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
            <TabsTrigger value="unread">Belum dibaca ({counts.unread})</TabsTrigger>
            <TabsTrigger value="read">Dibaca ({counts.read})</TabsTrigger>
            <TabsTrigger value="replied">Dibalas ({counts.replied})</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Cari nama/email/subjek..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Tidak ada pesan.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subjek</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className={m.status === "unread" ? "font-medium" : ""}>
                  <TableCell><Badge variant={STATUS_VARIANT[m.status]}>{STATUS_LABEL[m.status]}</Badge></TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>{m.subject}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(m.created_at).toLocaleString("id-ID")}</TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => openMessage(m)}>Lihat</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dari</p>
                    <p className="font-medium">{selected.name}</p>
                    <p className="text-muted-foreground">{selected.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dikirim</p>
                    <p className="font-medium">{new Date(selected.created_at).toLocaleString("id-ID")}</p>
                    <Badge variant={STATUS_VARIANT[selected.status]} className="mt-1">{STATUS_LABEL[selected.status]}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pesan</p>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{selected.message}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Catatan internal</p>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tambahkan catatan untuk tim..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}>
                      <Mail className="h-4 w-4" /> Balas via Email
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Halo ${selected.name}, terima kasih telah menghubungi MarketIntel.`)}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> Balas via WA
                    </a>
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => updateStatus("read")}>Tandai Dibaca</Button>
                <Button onClick={() => updateStatus("replied")}>Tandai Sudah Dibalas</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
