import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Database, Upload, FileText, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";

const BATCH_SIZE = 500;

const CONFLICT_COLUMNS: Record<TargetTable, string> = {
  bps_food_data: "kabupaten_kota,kelompok,kelompok_label,sub_komoditas,is_total,metric_type,year",
  bps_national_averages: "kelompok,sub_komoditas,metric_type,year",
};

type TargetTable = "bps_food_data" | "bps_national_averages";

interface FileInfo {
  file: File;
  rowCount: number;
  valid: boolean;
  error?: string;
}

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "pending";
}

const EXPECTED_HEADERS: Record<TargetTable, string[]> = {
  bps_food_data: ["kabupaten_kota", "kelompok", "kelompok_label", "sub_komoditas", "is_total", "metric_type", "value_amount", "year"],
  bps_national_averages: ["kelompok", "sub_komoditas", "metric_type", "avg_nasional", "count_kab", "year"],
};

const AdminFoodIntelImport = () => {
  const [stats, setStats] = useState({ foodData: 0, avgData: 0 });
  const [targetTable, setTargetTable] = useState<TargetTable>("bps_food_data");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [clearExisting, setClearExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, rows: 0, failed: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const fetchStats = async () => {
    const [{ count: fc }, { count: ac }] = await Promise.all([
      supabase.from("bps_food_data").select("*", { count: "exact", head: true }),
      supabase.from("bps_national_averages").select("*", { count: "exact", head: true }),
    ]);
    setStats({ foodData: fc || 0, avgData: ac || 0 });
  };

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString("id-ID"), message, type }]);
  }, []);

  const validateFile = async (file: File): Promise<FileInfo> => {
    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { file, rowCount: 0, valid: false, error: "File kosong" };

    const parsed = Papa.parse(lines[0], { header: false });
    const headers = (parsed.data[0] as string[]).map(h => h.trim().replace(/"/g, ""));
    const expected = EXPECTED_HEADERS[targetTable];
    const missing = expected.filter(h => !headers.includes(h));

    if (missing.length > 0) {
      return { file, rowCount: 0, valid: false, error: `Kolom tidak ditemukan: ${missing.join(", ")}` };
    }
    return { file, rowCount: lines.length - 1, valid: true };
  };

  const handleFilesSelected = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const csvFiles = Array.from(selectedFiles)
      .filter(f => f.name.endsWith(".csv"))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (csvFiles.length === 0) {
      toast.error("Tidak ada file CSV yang dipilih");
      return;
    }

    const validated = await Promise.all(csvFiles.map(f => validateFile(f)));
    setFiles(validated);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  }, [targetTable]);

  const handleImport = async () => {
    const validFiles = files.filter(f => f.valid);
    if (validFiles.length === 0) { toast.error("Tidak ada file valid"); return; }

    setImporting(true);
    setProgress({ current: 0, total: validFiles.length, rows: 0, failed: 0 });
    setLogs([]);

    let totalRows = 0;
    let totalFailed = 0;

    if (clearExisting) {
      addLog(`Menghapus data existing di ${targetTable}...`, "pending");
      const { error } = await supabase.from(targetTable).delete().gte("id", 0);
      if (error) {
        addLog(`Gagal menghapus: ${error.message}`, "error");
        setImporting(false);
        return;
      }
      addLog("Data existing dihapus", "success");
    }

    for (let i = 0; i < validFiles.length; i++) {
      const { file } = validFiles[i];
      setProgress(prev => ({ ...prev, current: i + 1 }));
      addLog(`${file.name} — parsing...`, "pending");

      try {
        const text = await file.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h: string) => h.trim() });
        const rows = parsed.data as Record<string, string>[];

        const transformed = rows.map(row => {
          if (targetTable === "bps_food_data") {
            return {
              kabupaten_kota: row.kabupaten_kota?.trim() || "",
              kelompok: row.kelompok?.trim() || "",
              kelompok_label: row.kelompok_label?.trim() || "",
              sub_komoditas: row.sub_komoditas?.trim() || "",
              is_total: row.is_total === "True" || row.is_total === "true" || row.is_total === "1",
              metric_type: row.metric_type?.trim() || "pengeluaran",
              value_amount: parseFloat(row.value_amount) || 0,
              year: parseInt(row.year) || 2025,
            };
          }
          return {
            kelompok: row.kelompok?.trim() || "",
            sub_komoditas: row.sub_komoditas?.trim() || "",
            metric_type: row.metric_type?.trim() || "pengeluaran",
            avg_nasional: parseFloat(row.avg_nasional) || 0,
            count_kab: parseInt(row.count_kab) || 0,
            year: parseInt(row.year) || 2025,
          };
        }).filter(r => targetTable === "bps_food_data" ? (r as any).kabupaten_kota : (r as any).kelompok);

        let processedCount = 0;
        for (let j = 0; j < transformed.length; j += BATCH_SIZE) {
          const batch = transformed.slice(j, j + BATCH_SIZE);
          const { error } = await supabase
            .from(targetTable)
            .upsert(batch as any, {
              onConflict: CONFLICT_COLUMNS[targetTable],
              ignoreDuplicates: true,
            });

          if (error) {
            addLog(`${file.name} batch ${Math.floor(j / BATCH_SIZE) + 1} — error: ${error.message}`, "error");
            totalFailed += batch.length;
          } else {
            processedCount += batch.length;
          }
        }

        totalRows += processedCount;
        setProgress(prev => ({ ...prev, rows: totalRows, failed: totalFailed }));
        addLog(`${file.name} — ${processedCount.toLocaleString("id-ID")} rows diproses (duplikat diabaikan)`, "success");
      } catch (err: any) {
        addLog(`${file.name} — error: ${err.message}`, "error");
      }
    }

    setImporting(false);
    addLog(`Import selesai! Total: ${totalRows.toLocaleString("id-ID")} rows`, "success");
    toast.success(`Import selesai: ${totalRows.toLocaleString("id-ID")} rows`);
    fetchStats();
  };

  const totalRows = files.reduce((sum, f) => sum + (f.valid ? f.rowCount : 0), 0);
  const validCount = files.filter(f => f.valid).length;
  const progressPct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📥 Import Data BPS</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">bps_food_data</span>
          </div>
          <div className="text-2xl font-bold">{stats.foodData.toLocaleString("id-ID")} rows</div>
          {stats.foodData === 0 && <Badge variant="destructive" className="mt-1 text-xs">KOSONG</Badge>}
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">bps_national_averages</span>
          </div>
          <div className="text-2xl font-bold">{stats.avgData.toLocaleString("id-ID")} rows</div>
          {stats.avgData === 0 && <Badge variant="destructive" className="mt-1 text-xs">KOSONG</Badge>}
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-xl border bg-card p-6 space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" /> Upload CSV
        </h2>

        {/* Target table */}
        <div className="flex gap-3">
          {(["bps_food_data", "bps_national_averages"] as TargetTable[]).map(t => (
            <button
              key={t}
              onClick={() => { setTargetTable(t); setFiles([]); }}
              disabled={importing}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                targetTable === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Drag & drop file CSV di sini atau <span className="text-primary font-medium">klik untuk browse</span></p>
          <p className="text-xs text-muted-foreground mt-1">Bisa upload multiple files sekaligus</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={e => handleFilesSelected(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">File dipilih:</span>
              <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={importing}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border bg-muted/20 divide-y">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {f.valid ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{f.file.name}</span>
                  {f.valid ? (
                    <span className="text-xs text-muted-foreground">{f.rowCount.toLocaleString("id-ID")} rows</span>
                  ) : (
                    <span className="text-xs text-red-500">{f.error}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {validCount} file valid, ~{totalRows.toLocaleString("id-ID")} rows
            </div>
          </div>
        )}

        {/* Options */}
        <div className="flex items-center gap-2">
          <Switch id="clear" checked={clearExisting} onCheckedChange={setClearExisting} disabled={importing} />
          <Label htmlFor="clear" className="text-sm">Hapus data existing sebelum import</Label>
        </div>

        <Button onClick={handleImport} disabled={importing || validCount === 0} className="w-full" size="lg">
          {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengimport...</> : <>🚀 Mulai Import</>}
        </Button>
      </div>

      {/* Progress */}
      {(importing || progress.rows > 0) && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">Progress</h3>
          <Progress value={progressPct} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>File {progress.current} dari {progress.total}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="flex gap-4 text-xs">
             <span>Diproses: <strong>{progress.rows.toLocaleString("id-ID")}</strong></span>
            {progress.failed > 0 && <span className="text-red-500">Failed: <strong>{progress.failed.toLocaleString("id-ID")}</strong></span>}
          </div>
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Log</h3>
          </div>
          <div ref={logRef} className="max-h-64 overflow-auto p-4 font-mono text-xs space-y-1">
            {logs.map((log, i) => (
              <div key={i} className={
                log.type === "success" ? "text-green-500" :
                log.type === "error" ? "text-red-500" :
                log.type === "pending" ? "text-yellow-500" : "text-muted-foreground"
              }>
                [{log.time}] {log.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFoodIntelImport;
