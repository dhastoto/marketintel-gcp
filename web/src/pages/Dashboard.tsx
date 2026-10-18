import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, FolderOpen, CheckCircle2, MapPin, TrendingUp, FileText, Search, Lightbulb, PartyPopper } from "lucide-react";

interface Project {
  id: string;
  project_name: string;
  status: string;
  created_at: string;
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  payment_status: string | null;
  payment_reference: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { profile, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      const [{ data: projectsData }, { data: transactionsData }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, project_name, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("transactions")
          .select(
            "id, purchase_type, final_amount, product_code, bundle_code, payment_status, invoice_number, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setProjects(projectsData || []);
      const mapped: Transaction[] = (transactionsData || []).map((t: any) => ({
        id: t.id,
        transaction_type: t.purchase_type,
        amount: t.final_amount,
        description: t.product_code || t.bundle_code || null,
        payment_status: t.payment_status === "paid" ? "completed" : t.payment_status,
        payment_reference: t.invoice_number,
        created_at: t.created_at,
      }));
      setTransactions(mapped);
      setLoading(false);
    };

    fetchDashboardData();
  }, [user]);

  const completed = projects.filter((p) => p.status === "completed").length;
  const paidReports = transactions.filter((t) => t.payment_status === "completed").length;

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
      input_complete: { label: "Input Selesai", className: "bg-blue-500/10 text-blue-500" },
      analyzing: { label: "Menganalisis", className: "bg-amber-500/10 text-amber-500" },
      completed: { label: "Selesai", className: "bg-green-500/10 text-green-500" },
      archived: { label: "Diarsipkan", className: "bg-muted text-muted-foreground" },
    };
    const s = map[status] || map.draft;
    return (
      <Badge variant="secondary" className={s.className}>
        {s.label}
      </Badge>
    );
  };

  const transactionStatusBadge = (status: string | null) => {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "Menunggu", className: "bg-amber-500/10 text-amber-500" },
      completed: { label: "Berhasil", className: "bg-green-500/10 text-green-500" },
      failed: { label: "Gagal", className: "bg-destructive/10 text-destructive" },
    };
    const current = map[status || ""] || { label: status || "-", className: "bg-muted text-muted-foreground" };
    return (
      <Badge variant="secondary" className={current.className}>
        {current.label}
      </Badge>
    );
  };

  const transactionTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      subscription: "Pembelian Paket",
      usage: "Pemakaian Kredit",
    };
    return map[type] || type;
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">Selamat datang, {profile?.full_name?.split(" ")[0]}! <PartyPopper className="h-5 w-5 text-accent" /></h1>
        <p className="text-muted-foreground">Berikut ringkasan proyek analisis Anda.</p>
      </div>

      {/* Mode Selector */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4">Mau mulai dari mana?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to="/app/analysis/new"
            className="rounded-xl border-2 border-border hover:border-accent p-5 transition-all hover:shadow-md group"
          >
            <Search className="h-6 w-6 mb-2 text-accent" />
            <h3 className="font-semibold mb-1 group-hover:text-accent transition-colors">Sudah Punya Ide?</h3>
            <p className="text-sm text-muted-foreground mb-3">"Analisis lokasi bisnis saya di kecamatan X"</p>
            <Button size="sm" className="gradient-amber border-0 text-accent-foreground hover:opacity-90">
              Analisis Lokasi
            </Button>
          </Link>
          <Link
            to="/app/food-opportunity"
            className="rounded-xl border-2 border-border hover:border-green-500 p-5 transition-all hover:shadow-md group"
          >
            <Lightbulb className="h-6 w-6 mb-2 text-green-500" />
            <h3 className="font-semibold mb-1 group-hover:text-green-500 transition-colors">
              Belum Tahu Mau Jual Apa?
            </h3>
            <p className="text-sm text-muted-foreground mb-3">"Cari peluang bisnis makanan di kota saya"</p>
            <Button size="sm" variant="outline" className="border-green-500/50 text-green-500 hover:bg-green-500/10">
              Cari Peluang
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Proyek", value: projects.length, icon: FolderOpen, trend: null },
          { label: "Analisis Selesai", value: completed, icon: CheckCircle2, trend: null },
          { label: "Laporan Dibeli", value: paidReports, icon: FileText, trend: null },
          { label: "Lokasi Dipetakan", value: projects.length * 3, icon: MapPin, trend: null },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-3xl font-bold">{stat.value}</div>
            {stat.trend && (
              <div className="mt-1 flex items-center gap-1 text-xs text-green-500">
                <TrendingUp className="h-3 w-3" /> {stat.trend}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-semibold">Proyek Terbaru</h2>
          <Button size="sm" className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
            <Link to="/app/analysis/new">
              <PlusCircle className="mr-1.5 h-4 w-4" /> Analisis Baru
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-1 font-semibold">Belum ada proyek</h3>
            <p className="mb-4 text-sm text-muted-foreground">Mulai analisis pertama Anda!</p>
            <Button className="gradient-amber border-0 text-accent-foreground hover:opacity-90" asChild>
              <Link to="/app/analysis/new">
                <PlusCircle className="mr-1.5 h-4 w-4" /> Analisis Baru
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/app/analysis/${project.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <div className="font-medium">{project.project_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(project.created_at).toLocaleDateString("id-ID")}
                  </div>
                </div>
                {statusBadge(project.status)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Riwayat Transaksi</h2>
          <p className="text-sm text-muted-foreground">5 transaksi kredit terbaru Anda.</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="mb-1 font-semibold">Belum ada transaksi</h3>
            <p className="text-sm text-muted-foreground">
              Riwayat pembelian paket dan penggunaan kredit akan tampil di sini.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaksi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perubahan</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead className="text-right">Tanggal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="font-medium">{transactionTypeLabel(transaction.transaction_type)}</div>
                    <div className="text-xs text-muted-foreground">{transaction.description || "-"}</div>
                  </TableCell>
                  <TableCell>{transactionStatusBadge(transaction.payment_status)}</TableCell>
                  <TableCell className={transaction.amount >= 0 ? "text-green-600" : "text-foreground"}>
                    {transaction.amount >= 0 ? "+" : ""}
                    {transaction.amount} kredit
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {transaction.payment_reference || "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString("id-ID")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
