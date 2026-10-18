import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminProjects } from "@/hooks/useAdminData";
import { Search, ChevronLeft, ChevronRight, Eye, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  analyzing: 'bg-blue-100 text-blue-700',
  draft: 'bg-slate-100 text-slate-600',
  failed: 'bg-red-100 text-red-700',
  error: 'bg-red-100 text-red-700',
};

export default function AdminProjects() {
  const { data: allProjects, isLoading, refetch } = useAdminProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [viewProject, setViewProject] = useState<any>(null);
  const [viewData, setViewData] = useState<{ sections: any[]; decisions: any[]; economics: any[]; locations: any[] } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return (allProjects || []).filter(p => {
      const matchSearch = !search || p.project_name.toLowerCase().includes(search.toLowerCase()) || (p.user_name || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allProjects, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handleViewResults = async (project: any) => {
    setViewProject(project);
    setViewLoading(true);
    setViewData(null);

    const [{ data: sections }, { data: decisions }, { data: economics }, { data: locations }] = await Promise.all([
      supabase.from("analysis_results").select("section, content").eq("project_id", project.id),
      supabase.from("decision_results").select("*").eq("project_id", project.id),
      supabase.from("economic_results").select("*").eq("project_id", project.id),
      supabase.from("strategic_locations").select("*").eq("project_id", project.id).order("rank"),
    ]);

    setViewData({
      sections: sections || [],
      decisions: decisions || [],
      economics: economics || [],
      locations: locations || [],
    });
    setViewLoading(false);
  };

  const handleAdminRerun = (project: any) => {
    // Jalankan ulang pipeline lengkap (scoring, AI, ekonomi, keputusan) yang juga menyimpan hasil.
    // Memanggil ai-analysis saja tidak menyimpan apa pun ke database.
    setRerunning(project.id);
    navigate(`/app/analysis/${project.id}/loading?rerun=1`);
  };

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold text-slate-900">Semua Proyek</h1><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Semua Proyek</h1>
        <p className="text-sm text-slate-500">Total: {(allProjects || []).length} proyek</p>
      </div>

      <Card>
        <CardContent className="pt-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Cari proyek atau user..." className="pl-9 h-9 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="analyzing">Analyzing</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium text-slate-600">Proyek</th>
                  <th className="text-left p-3 font-medium text-slate-600">User</th>
                  <th className="text-left p-3 font-medium text-slate-600">Produk</th>
                  <th className="text-left p-3 font-medium text-slate-600">Lokasi</th>
                  <th className="text-left p-3 font-medium text-slate-600">Status</th>
                  <th className="text-left p-3 font-medium text-slate-600">Tanggal</th>
                  <th className="text-left p-3 font-medium text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(p => (
                  <tr key={p.id} className="border-b hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-900">{p.project_name}</td>
                    <td className="p-3 text-xs text-indigo-500">{p.user_name}</td>
                    <td className="p-3 text-xs">{p.product_name}<br /><Badge variant="outline" className="text-[10px] mt-0.5">{p.product_category}</Badge></td>
                    <td className="p-3 text-xs">{p.city}<br /><span className="text-slate-400">{(p.districts || []).join(', ')}</span></td>
                    <td className="p-3"><Badge className={`text-[10px] ${STATUS_BADGE[p.status || ''] || 'bg-slate-100 text-slate-600'}`}>{p.status || '-'}</Badge></td>
                    <td className="p-3 text-xs text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {p.status === 'completed' && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Lihat Hasil" onClick={() => handleViewResults(p)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(p.status === 'failed' || p.status === 'error' || p.status === 'completed') && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Jalankan Ulang" disabled={rerunning === p.id} onClick={() => handleAdminRerun(p)}>
                            <RefreshCw className={`h-3.5 w-3.5 ${rerunning === p.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada proyek</td></tr>
                )}
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

      {/* View Results Dialog */}
      <Dialog open={!!viewProject} onOpenChange={() => setViewProject(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hasil Analisis: {viewProject?.project_name}</DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <div className="flex items-center justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>
          ) : viewData ? (
            <div className="space-y-6">
              {/* Decisions */}
              {viewData.decisions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Keputusan per Kecamatan</h3>
                  <div className="space-y-2">
                    {viewData.decisions.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <span className="font-medium">{d.district}</span>
                          <span className="ml-2 text-sm text-slate-500">Score: {d.market_score}/10</span>
                        </div>
                        <Badge className={d.decision === 'GO' ? 'bg-emerald-100 text-emerald-700' : d.decision === 'NO' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                          {d.decision}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Economics */}
              {viewData.economics.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Ekonomi per Kecamatan</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b">
                        <th className="text-left p-2">Kecamatan</th>
                        <th className="text-right p-2">Omzet Moderat</th>
                        <th className="text-right p-2">Customer/hari</th>
                        <th className="text-right p-2">BEP (hari)</th>
                      </tr></thead>
                      <tbody>
                        {viewData.economics.map((e: any) => (
                          <tr key={e.id} className="border-b">
                            <td className="p-2">{e.district}</td>
                            <td className="p-2 text-right">Rp {Number(e.omzet_moderat || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right">{e.estimated_daily_customers}</td>
                            <td className="p-2 text-right">{e.bep_days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Locations */}
              {viewData.locations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Lokasi Strategis ({viewData.locations.length})</h3>
                  <div className="space-y-1">
                    {viewData.locations.map((l: any) => (
                      <div key={l.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <span>#{l.rank} {l.location_name}</span>
                        <span className="text-slate-500">Score: {l.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis Sections */}
              {viewData.sections.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Section Analisis ({viewData.sections.length})</h3>
                  <div className="space-y-1">
                    {viewData.sections.map((s: any, i: number) => (
                      <div key={i} className="p-2 rounded border text-xs">
                        <Badge variant="outline" className="text-[10px]">{s.section}</Badge>
                        <pre className="mt-1 text-[10px] text-slate-500 max-h-20 overflow-auto whitespace-pre-wrap">
                          {JSON.stringify(s.content, null, 2).slice(0, 500)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewData.sections.length === 0 && viewData.decisions.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Tidak ada data hasil analisis untuk proyek ini.
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
