import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminProfiles } from "@/hooks/useAdminData";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-indigo-100 text-indigo-700',
  business: 'bg-amber-100 text-amber-700',
};

export default function AdminUsers() {
  const { data: allUsers, isLoading } = useAdminProfiles();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const filtered = useMemo(() => {
    return (allUsers || []).filter(u => {
      const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || (u.business_name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === 'all' || (u.plan || 'free') === planFilter;
      return matchSearch && matchPlan;
    });
  }, [allUsers, search, planFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500">Total: {(allUsers || []).length} pengguna terdaftar</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari nama atau bisnis..." className="pl-9 h-9 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={planFilter} onValueChange={v => { setPlanFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Semua Plan" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Plan</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPlanFilter('all'); setPage(1); }}>Reset</Button>
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
                  <th className="text-left p-3 font-medium text-slate-600">Email</th>
                  <th className="text-left p-3 font-medium text-slate-600">Plan</th>
                  <th className="text-left p-3 font-medium text-slate-600">Kredit</th>
                  <th className="text-left p-3 font-medium text-slate-600">Telepon</th>
                  <th className="text-left p-3 font-medium text-slate-600">Terdaftar</th>
                  <th className="text-left p-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(u => (
                  <tr key={u.id} className="border-b hover:bg-slate-50/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                          {u.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.business_name || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-600">{u.email || '-'}</td>
                    <td className="p-3"><Badge className={`${PLAN_BADGE[u.plan || 'free'] || PLAN_BADGE.free} text-[10px]`}>{u.plan || 'free'}</Badge></td>
                    <td className="p-3">
                      <span className="font-medium">{u.credits_remaining ?? 0}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{u.phone || '-'}</td>
                    <td className="p-3 text-xs text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="p-3">
                      <Link to={`/admin/users/${u.id}`} className="text-xs text-indigo-500 hover:underline">Detail</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-xs text-slate-500">Menampilkan {filtered.length > 0 ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, filtered.length)} dari {filtered.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
