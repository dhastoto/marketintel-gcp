import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminTransactions } from "@/hooks/useAdminData";
import { Search, ChevronLeft, ChevronRight, CreditCard, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const TXN_BADGE: Record<string, string> = {
  topup: 'bg-emerald-100 text-emerald-700',
  usage: 'bg-red-100 text-red-700',
  refund: 'bg-blue-100 text-blue-700',
  bonus: 'bg-amber-100 text-amber-700',
  expired: 'bg-slate-100 text-slate-600',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
};

export default function AdminTransactions() {
  const { data: allTxn, isLoading } = useAdminTransactions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    return (allTxn || []).filter(t => {
      const matchSearch = !search || (t.user_name || '').toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || t.transaction_type === typeFilter;
      const matchStatus = statusFilter === 'all' || t.payment_status === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [allTxn, search, typeFilter, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const todayTxn = (allTxn || []).filter(t => t.created_at && new Date(t.created_at).toDateString() === new Date().toDateString());
  const pending = (allTxn || []).filter(t => t.payment_status === 'pending');
  const todayCredits = todayTxn.filter(t => ['topup', 'subscription'].includes(t.transaction_type) && t.payment_status === 'completed').reduce((s, t) => s + t.amount, 0);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">Transaksi Kredit</h1><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Transaksi Kredit</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><BarChart3 className="h-4 w-4 text-indigo-500 mb-1" /><p className="text-xl font-bold">{todayTxn.length}</p><p className="text-xs text-slate-500">Transaksi Hari Ini</p></CardContent></Card>
        <Card><CardContent className="pt-4"><CreditCard className="h-4 w-4 text-indigo-500 mb-1" /><p className="text-xl font-bold">{todayCredits}</p><p className="text-xs text-slate-500">Kredit Terjual Hari Ini</p></CardContent></Card>
        <Card><CardContent className="pt-4"><TrendingUp className="h-4 w-4 text-indigo-500 mb-1" /><p className="text-xl font-bold">{(allTxn || []).length}</p><p className="text-xs text-slate-500">Total Transaksi</p></CardContent></Card>
        <Card className={pending.length > 0 ? 'border-amber-200' : ''}>
          <CardContent className="pt-4"><AlertTriangle className={`h-4 w-4 mb-1 ${pending.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} /><p className={`text-xl font-bold ${pending.length > 0 ? 'text-amber-600' : ''}`}>{pending.length}</p><p className="text-xs text-slate-500">Transaksi Pending</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari user atau deskripsi..." className="pl-9 h-9 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="topup">Top-Up</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium text-slate-600">User</th>
                  <th className="text-left p-3 font-medium text-slate-600">Tipe</th>
                  <th className="text-left p-3 font-medium text-slate-600">Kredit</th>
                  <th className="text-left p-3 font-medium text-slate-600">Saldo</th>
                  <th className="text-left p-3 font-medium text-slate-600">Deskripsi</th>
                  <th className="text-left p-3 font-medium text-slate-600">Metode</th>
                  <th className="text-left p-3 font-medium text-slate-600">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(t => (
                  <tr key={t.id} className="border-b hover:bg-slate-50/50">
                    <td className="p-3 text-xs">{t.user_name}</td>
                    <td className="p-3"><Badge className={`text-[10px] ${TXN_BADGE[t.transaction_type] || 'bg-slate-100 text-slate-600'}`}>{t.transaction_type}</Badge></td>
                    <td className="p-3 font-medium"><span className={t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}>{t.amount > 0 ? '+' : ''}{t.amount}</span></td>
                    <td className="p-3">{t.credit_after}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{t.description || '-'}</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{t.payment_method || '-'}</Badge></td>
                    <td className="p-3"><Badge className={`text-[10px] ${STATUS_BADGE[t.payment_status || ''] || 'bg-slate-100 text-slate-600'}`}>{t.payment_status || '-'}</Badge></td>
                    <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-xs text-slate-500">Menampilkan {filtered.length > 0 ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, filtered.length)} dari {filtered.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
