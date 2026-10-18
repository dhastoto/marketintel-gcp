import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminProfiles, useAdminProjects, useAdminTransactions } from "@/hooks/useAdminData";
import { ArrowLeft, MailCheck, Loader2, BadgeCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-indigo-100 text-indigo-700',
  business: 'bg-amber-100 text-amber-700',
};

const TXN_BADGE: Record<string, string> = {
  topup: 'bg-emerald-100 text-emerald-700',
  usage: 'bg-red-100 text-red-700',
  refund: 'bg-blue-100 text-blue-700',
  bonus: 'bg-amber-100 text-amber-700',
  expired: 'bg-slate-100 text-slate-600',
};

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: profiles, isLoading: loadingProfiles } = useAdminProfiles();
  const { data: allProjects } = useAdminProjects();
  const { data: allTransactions } = useAdminTransactions();

  const user = useMemo(() => (profiles || []).find(u => u.id === id), [profiles, id]);
  const userProjects = useMemo(() => (allProjects || []).filter(p => p.user_id === id), [allProjects, id]);
  const userTransactions = useMemo(() => (allTransactions || []).filter(t => t.user_id === id), [allTransactions, id]);

  const [verifying, setVerifying] = useState(false);

  if (loadingProfiles) {
    return <div className="space-y-6"><Skeleton className="h-48" /><Skeleton className="h-96" /></div>;
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">User tidak ditemukan</p>
        <Link to="/admin/users" className="text-indigo-500 hover:underline text-sm mt-2 block">← Kembali</Link>
      </div>
    );
  }

  const handleVerifyEmail = async () => {
    if (!user.id) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-verify-user-email", {
        body: { user_id: user.id },
      });
      if (error) throw error;
      if (data?.already_verified) {
        toast.info("Email pengguna ini sudah terverifikasi sebelumnya.");
      } else {
        toast.success("Email pengguna berhasil ditandai terverifikasi.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal memverifikasi email pengguna.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Kembali ke Pengguna
      </Link>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-bold shrink-0">
              {user.full_name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-slate-900">{user.full_name}</h1>
                <Badge className={`${PLAN_BADGE[user.plan || 'free']} text-xs`}>{user.plan || 'free'}</Badge>
              </div>
              {user.email && <p className="text-sm text-slate-600">📧 {user.email}</p>}
              {user.business_name && <p className="text-sm text-slate-500">🏢 {user.business_name}</p>}
              {user.phone && <p className="text-sm text-slate-500">📞 {user.phone}</p>}
              <div className="mt-3">
                {user.email_confirmed_at ? (
                  <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Terverifikasi
                  </Badge>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={verifying} className="gap-2">
                        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                        Tandai Email Terverifikasi
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Verifikasi email manual?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan menandai email <strong>{user.email || user.full_name}</strong> sebagai
                          terverifikasi tanpa pengguna mengklik link di email. Hanya gunakan jika Anda sudah
                          memastikan identitas pengguna melalui channel lain (mis. WhatsApp/email support).
                          Aktivitas ini tercatat di audit log.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleVerifyEmail}>Ya, Verifikasi</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MiniStat label="Kredit Sisa" value={user.credits_remaining ?? 0} />
              <MiniStat label="Proyek" value={userProjects.length} />
              <MiniStat label="Member Sejak" value={user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Proyek ({userProjects.length})</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi ({userTransactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 font-medium text-slate-600">Nama Proyek</th>
                      <th className="text-left p-3 font-medium text-slate-600">Produk</th>
                      <th className="text-left p-3 font-medium text-slate-600">Lokasi</th>
                      <th className="text-left p-3 font-medium text-slate-600">Status</th>
                      <th className="text-left p-3 font-medium text-slate-600">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProjects.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada proyek</td></tr>
                    ) : userProjects.map(p => (
                      <tr key={p.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-900">{p.project_name}</td>
                        <td className="p-3 text-xs">{p.product_name}<br /><span className="text-slate-400">{p.product_category}</span></td>
                        <td className="p-3 text-xs">{p.city}</td>
                        <td className="p-3"><Badge className={`text-[10px] ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : p.status === 'analyzing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{p.status || '-'}</Badge></td>
                        <td className="p-3 text-xs text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 font-medium text-slate-600">Tanggal</th>
                      <th className="text-left p-3 font-medium text-slate-600">Tipe</th>
                      <th className="text-left p-3 font-medium text-slate-600">Kredit</th>
                      <th className="text-left p-3 font-medium text-slate-600">Saldo Setelah</th>
                      <th className="text-left p-3 font-medium text-slate-600">Deskripsi</th>
                      <th className="text-left p-3 font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userTransactions.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada transaksi</td></tr>
                    ) : userTransactions.map(t => (
                      <tr key={t.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-3 text-xs">{t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID') : '-'}</td>
                        <td className="p-3"><Badge className={`text-[10px] ${TXN_BADGE[t.transaction_type] || 'bg-slate-100 text-slate-600'}`}>{t.transaction_type}</Badge></td>
                        <td className="p-3 font-medium"><span className={t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}>{t.amount > 0 ? '+' : ''}{t.amount}</span></td>
                        <td className="p-3">{t.credit_after}</td>
                        <td className="p-3 text-xs text-slate-500">{t.description || '-'}</td>
                        <td className="p-3"><Badge className={`text-[10px] ${t.payment_status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{t.payment_status || '-'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-lg">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}
