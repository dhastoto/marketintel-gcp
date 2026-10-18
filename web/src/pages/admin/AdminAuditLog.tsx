import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuditLogs } from "@/hooks/useAdminData";
import { Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ACTION_BADGE: Record<string, string> = {
  update_config: 'bg-blue-100 text-blue-700',
  grant_credit: 'bg-emerald-100 text-emerald-700',
  change_plan: 'bg-indigo-100 text-indigo-700',
  refund: 'bg-amber-100 text-amber-700',
  delete_project: 'bg-red-100 text-red-700',
  create_user: 'bg-teal-100 text-teal-700',
};

export default function AdminAuditLog() {
  const { data: logs, isLoading } = useAdminAuditLogs();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const perPage = 20;

  const filtered = useMemo(() => {
    return (logs || []).filter(l => !search || l.action.includes(search.toLowerCase()) || (l.admin_name || '').toLowerCase().includes(search.toLowerCase()));
  }, [logs, search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">Audit Log</h1><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>

      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari aksi atau admin..." className="pl-9 h-9 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium text-slate-600">Waktu</th>
                  <th className="text-left p-3 font-medium text-slate-600">Admin</th>
                  <th className="text-left p-3 font-medium text-slate-600">Aksi</th>
                  <th className="text-left p-3 font-medium text-slate-600">Target</th>
                  <th className="text-left p-3 font-medium text-slate-600">IP</th>
                  <th className="text-left p-3 font-medium text-slate-600">Detail</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada audit log</td></tr>
                ) : paged.map(l => (
                  <React.Fragment key={l.id}>
                    <tr className="border-b hover:bg-slate-50/50">
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {l.created_at ? new Date(l.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                      </td>
                      <td className="p-3 font-medium text-slate-900">{l.admin_name}</td>
                      <td className="p-3"><Badge className={`text-[10px] ${ACTION_BADGE[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</Badge></td>
                      <td className="p-3 text-xs">{l.target_type}: {l.target_id}</td>
                      <td className="p-3 font-mono text-xs text-slate-400">{l.ip_address || '-'}</td>
                      <td className="p-3">
                        {l.details && (
                          <button onClick={() => setExpanded(expanded === l.id ? null : l.id)} className="text-indigo-500 hover:underline text-xs flex items-center gap-1">
                            {expanded === l.id ? <><ChevronUp className="h-3 w-3" />Tutup</> : <><ChevronDown className="h-3 w-3" />Lihat</>}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === l.id && l.details && (
                      <tr key={`${l.id}-detail`}>
                        <td colSpan={6} className="p-3 bg-slate-50">
                          <pre className="text-xs text-slate-600 overflow-x-auto">{JSON.stringify(l.details, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-xs text-slate-500">{filtered.length > 0 ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, filtered.length)} dari {filtered.length}</p>
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
