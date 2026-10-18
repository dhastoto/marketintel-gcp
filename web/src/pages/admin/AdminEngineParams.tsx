import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { clearParamCache } from "@/lib/engine-params";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Save, RotateCcw, Download, Settings2, CheckCircle, HelpCircle, AlertTriangle } from "lucide-react";

interface EngineParam {
  id: string;
  category: string;
  param_key: string;
  param_value: number;
  param_min: number | null;
  param_max: number | null;
  description: string | null;
  data_source: string | null;
  confidence: string | null;
  updated_at: string | null;
}

const CATEGORIES = [
  { value: "_all", label: "Semua Kategori" },
  { value: "_global", label: "Global" },
  { value: "makanan_minuman", label: "Makanan & Minuman" },
  { value: "grocery", label: "Grocery" },
  { value: "fashion", label: "Fashion" },
  { value: "elektronik", label: "Elektronik" },
  { value: "kecantikan", label: "Kecantikan" },
  { value: "kesehatan", label: "Kesehatan" },
  { value: "otomotif", label: "Otomotif" },
  { value: "pendidikan", label: "Pendidikan" },
  { value: "jasa", label: "Jasa" },
  { value: "pertanian", label: "Pertanian" },
];

const CONFIDENCE_OPTIONS = [
  { value: "_all", label: "Semua" },
  { value: "empirical", label: "Empirical" },
  { value: "hybrid", label: "Hybrid" },
  { value: "assumed", label: "Assumed" },
];

function ConfidenceBadge({ confidence }: { confidence: string | null }) {
  if (confidence === "empirical")
    return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200 text-[10px] flex items-center gap-1 w-fit"><CheckCircle className="h-2.5 w-2.5" /> Empirical</Badge>;
  if (confidence === "hybrid")
    return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-200 text-[10px] flex items-center gap-1 w-fit"><HelpCircle className="h-2.5 w-2.5" /> Hybrid</Badge>;
  return <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] flex items-center gap-1 w-fit"><AlertTriangle className="h-2.5 w-2.5" /> Assumed</Badge>;
}

export default function AdminEngineParams() {
  const { user } = useAuth();
  const [params, setParams] = useState<EngineParam[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState("_all");
  const [filterConfidence, setFilterConfidence] = useState("_all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchParams();
  }, []);

  const fetchParams = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("engine_parameters")
      .select("*")
      .order("category")
      .order("param_key");
    setParams((data as EngineParam[]) || []);
    setLoading(false);
  };

  const filteredParams = useMemo(() => {
    return params.filter((p) => {
      if (filterCategory !== "_all" && p.category !== filterCategory) return false;
      if (filterConfidence !== "_all" && p.confidence !== filterConfidence) return false;
      if (searchQuery && !p.param_key.toLowerCase().includes(searchQuery.toLowerCase())
        && !(p.description || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [params, filterCategory, filterConfidence, searchQuery]);

  const stats = useMemo(() => {
    const total = params.length;
    const empirical = params.filter(p => p.confidence === "empirical").length;
    const hybrid = params.filter(p => p.confidence === "hybrid").length;
    const assumed = params.filter(p => p.confidence === "assumed").length;
    const lastUpdate = params.reduce((latest, p) => {
      if (!p.updated_at) return latest;
      return !latest || p.updated_at > latest ? p.updated_at : latest;
    }, "" as string);
    return { total, empirical, hybrid, assumed, lastUpdate };
  }, [params]);

  const handleEdit = (param: EngineParam) => {
    setEditingId(param.id);
    setEditValue(String(param.param_value));
  };

  const handleSave = async (param: EngineParam) => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue)) {
      toast.error("Nilai harus berupa angka");
      return;
    }
    if (param.param_min !== null && newValue < param.param_min) {
      toast.error(`Minimum: ${param.param_min}`);
      return;
    }
    if (param.param_max !== null && newValue > param.param_max) {
      toast.error(`Maximum: ${param.param_max}`);
      return;
    }

    const { error } = await supabase
      .from("engine_parameters")
      .update({
        param_value: newValue,
        updated_at: new Date().toISOString(),
        updated_by: user?.id || null,
      })
      .eq("id", param.id);

    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }

    // Audit log
    await supabase.from("admin_audit_logs").insert({
      admin_id: user?.id || "",
      action: "update_engine_parameter",
      target_type: "engine_parameters",
      target_id: param.id,
      details: {
        category: param.category,
        param_key: param.param_key,
        old_value: param.param_value,
        new_value: newValue,
      },
    });

    clearParamCache();
    setEditingId(null);
    toast.success(`${param.category}::${param.param_key} diperbarui`);
    fetchParams();
  };

  const handleExportCSV = () => {
    const headers = "category,param_key,param_value,param_min,param_max,description,data_source,confidence\n";
    const rows = params.map(p =>
      `"${p.category}","${p.param_key}",${p.param_value},${p.param_min ?? ""},${p.param_max ?? ""},"${(p.description || "").replace(/"/g, '""')}","${p.data_source || ""}","${p.confidence || ""}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `engine_parameters_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-indigo-400" />
          Parameter Engine
        </h1>
        <p className="text-sm text-slate-400 mt-1">Kalibrasi parameter estimasi — perubahan mempengaruhi SEMUA analisis baru</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="text-xs text-slate-400">Total Parameter</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="text-xs text-slate-400">Terakhir Update</div>
          <div className="text-sm font-bold text-white">{stats.lastUpdate ? new Date(stats.lastUpdate).toLocaleDateString("id-ID") : "-"}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Empirical</div>
          <div className="text-2xl font-bold text-green-400">{stats.empirical}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Assumed</div>
          <div className="text-2xl font-bold text-amber-400">{stats.assumed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterConfidence} onValueChange={setFilterConfidence}>
          <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="Confidence" />
          </SelectTrigger>
          <SelectContent>
            {CONFIDENCE_OPTIONS.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Cari parameter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <Button variant="outline" size="sm" onClick={handleExportCSV} className="border-slate-700 text-slate-300 hover:text-white">
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/50 border-slate-700">
              <TableHead className="text-slate-400">Kategori</TableHead>
              <TableHead className="text-slate-400">Key</TableHead>
              <TableHead className="text-slate-400 text-right">Value</TableHead>
              <TableHead className="text-slate-400 text-right">Min</TableHead>
              <TableHead className="text-slate-400 text-right">Max</TableHead>
              <TableHead className="text-slate-400">Confidence</TableHead>
              <TableHead className="text-slate-400">Sumber</TableHead>
              <TableHead className="text-slate-400 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-slate-500 py-8">Memuat...</TableCell></TableRow>
            ) : filteredParams.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-slate-500 py-8">Tidak ada parameter</TableCell></TableRow>
            ) : filteredParams.map((p) => (
              <TableRow key={p.id} className="border-slate-700 hover:bg-slate-800/50">
                <TableCell className="text-xs text-slate-300">{p.category}</TableCell>
                <TableCell>
                  <div className="text-xs font-mono text-white">{p.param_key}</div>
                  {p.description && <div className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate">{p.description}</div>}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === p.id ? (
                    <Input
                      type="number"
                      step="any"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-24 ml-auto bg-slate-700 border-slate-600 text-white text-right h-8 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave(p);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => handleEdit(p)}
                      className="font-mono text-sm text-white hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {p.param_value}
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs text-slate-500">{p.param_min ?? "-"}</TableCell>
                <TableCell className="text-right text-xs text-slate-500">{p.param_max ?? "-"}</TableCell>
                <TableCell><ConfidenceBadge confidence={p.confidence} /></TableCell>
                <TableCell className="text-[10px] text-slate-500 max-w-[120px] truncate">{p.data_source || "-"}</TableCell>
                <TableCell className="text-right">
                  {editingId === p.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleSave(p)} className="h-7 text-green-400 hover:text-green-300">
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 text-slate-400 hover:text-slate-300">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-slate-500">
        Menampilkan {filteredParams.length} dari {params.length} parameter
      </div>
    </div>
  );
}
