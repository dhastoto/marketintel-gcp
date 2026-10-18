import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Users, DollarSign, Tag, Calculator, AlertTriangle, Info, MapPin, CheckCircle, XCircle, Car, Store, Building2, Lightbulb, Zap, Target, BarChart3, LineChart, type LucideIcon } from "lucide-react";
import type { PlanFeatures } from "@/lib/feature-gate";
import { UpgradeTeaser } from "@/components/UpgradeTeaser";

interface EconomicData {
  district: string;
  population_total: number | null;
  village_count: number | null;
  urban_village_count: number | null;
  rural_village_count: number | null;
  location_type: string | null;
  city_expenditure_avg: number | null;
  expenditure_level: string | null;
  estimated_district_income: number | null;
  mobility_rate: number | null;
  capture_rate: number | null;
  estimated_daily_customers: number | null;
  base_price: number | null;
  income_multiplier: number | null;
  avg_transaction: number | null;
  estimated_daily_revenue: number | null;
  estimated_monthly_revenue: number | null;
  recommended_price_min: number | null;
  recommended_price_max: number | null;
  pricing_strategy: string | null;
  estimated_margin_pct: number | null;
  estimated_monthly_cost: number | null;
  estimated_monthly_profit: number | null;
  initial_capital: number | null;
  bep_days: number | null;
  omzet_konservatif?: number | null;
  omzet_moderat?: number | null;
  omzet_optimistis?: number | null;
  omzet_topdown?: number | null;
  omzet_bottomup?: number | null;
}

interface DecisionData {
  district: string;
  population_score: number | null;
  traffic_score: number | null;
  income_score: number | null;
  competitor_gap_score: number | null;
  density_score: number | null;
  market_score: number | null;
  decision: string | null;
  decision_reason: string | null;
  tradeoff_label: string | null;
  tradeoff_detail: string | null;
  insight_strength: string | null;
  insight_weakness: string | null;
  insight_recommendation: string | null;
  insight_summary: string | null;
}

// V3 metadata stored alongside analysis_results
interface EconomicV3Meta {
  trade_area?: {
    totalPopulation: number;
    effectivePopulation: number;
    tradeRadiusM: number;
    reductionFactor: number;
  };
  capacity_info?: {
    capacityCap: number;
    isCapacityCapped: boolean;
    rawCustomers: number;
  };
  sanity_info?: {
    wasCapped: boolean;
    wasFloored: boolean;
    warningMessage: string | null;
    capValue: number | null;
    floorValue: number | null;
  };
  input_warnings?: string[];
  business_scale?: string;
  capital_source?: 'user' | 'benchmark';
  capital_user_input?: number;
  capital_effective?: number;
  profit_benchmark?: {
    benchmarkGrossMargin: number;
    benchmarkNetMargin: number;
    benchmarkOpexRatio: number;
    monthlyGrossProfit: number;
    monthlyOpex: number;
    monthlyNetProfit: number;
    adjustedMonthlyRevenue: number;
  };
  working_capital?: {
    hppPerUnit: number;
    dailyProductionCost: number;
    bufferDays: number;
    workingCapitalNeeded: number;
    isCapitalAdequate: boolean;
    capitalGap: number;
    affordableCustomersPerDay: number;
    actualDailyCustomers: number;
  };
  margin_comparison?: {
    userMargin: number;
    benchmarkNetMargin: number;
    isUserOverOptimistic: boolean;
    warningMessage: string | null;
  };
  opex_info?: {
    source: 'user' | 'benchmark_table' | 'benchmark_ratio';
    value: number;
  };
  capex_check?: {
    isAdequate: boolean;
    severity: 'ok' | 'low' | 'missing';
    warningMessage: string | null;
    benchmark: {
      capex_min: number;
      capex_max: number;
      capex_items: string | null;
      opex_min: number;
      opex_max: number;
      opex_items: string | null;
    } | null;
  };
}

const fmt = (n: number | null | undefined) => {
  if (n == null) return "-";
  return new Intl.NumberFormat("id-ID").format(n);
};

const fmtRp = (n: number | null | undefined) => {
  if (n == null) return "-";
  return `Rp ${fmt(n)}`;
};

const fmtRpShort = (n: number | null | undefined) => {
  if (n == null) return "-";
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)} juta`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)} ribu`;
  return fmtRp(n);
};

function ConfidenceBadge({ topDown, bottomUp }: { topDown: number | null; bottomUp: number | null }) {
  const td = topDown || 0;
  const bu = bottomUp || 0;
  const avg = (td + bu) / 2;
  if (avg === 0) return null;
  const gap = Math.abs(td - bu) / Math.max(1, avg);

  let level: string, color: string, tooltip: string;
  if (gap < 0.10) {
    level = "Tinggi"; color = "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800";
    tooltip = "Estimasi dari pasar dan dari pelanggan sangat sepakat (selisih <10%) — angka bisa diandalkan";
  } else if (gap < 0.25) {
    level = "Sedang"; color = "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800";
    tooltip = "Ada perbedaan moderat antara kedua estimasi (selisih 10-25%) — angka cukup bisa diandalkan";
  } else if (gap < 0.50) {
    level = "Rendah"; color = "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800";
    tooltip = "Kedua estimasi berselisih cukup besar (selisih 25-50%) — perlu hati-hati menafsirkan angka";
  } else {
    level = "Rendah"; color = "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800";
    tooltip = "Kedua estimasi berselisih sangat jauh (selisih >50%) — angka kurang bisa diandalkan";
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-[10px] ${color} cursor-help flex items-center gap-1 w-fit`}><BarChart3 className="h-3 w-3" /> Tingkat Keyakinan: {level}</Badge>
      </TooltipTrigger>
      <TooltipContent><p className="max-w-[220px] text-xs">{tooltip}</p></TooltipContent>
    </Tooltip>
  );
}

function DataSourceBadge({ type }: { type: 'real' | 'hybrid' | 'assumed' }) {
  if (type === 'real') return <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 flex items-center gap-1 w-fit"><CheckCircle className="h-3 w-3" /> Data riil</Badge>;
  if (type === 'hybrid') return <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 flex items-center gap-1 w-fit"><Info className="h-3 w-3" /> Estimasi Gabungan</Badge>;
  return <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground flex items-center gap-1 w-fit"><AlertTriangle className="h-3 w-3" /> Estimasi</Badge>;
}

function Disclaimer() {
  return (
    <div className="rounded-lg border border-muted bg-muted/30 p-3 mt-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-[11px] text-muted-foreground space-y-1">
          <p className="font-medium flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Disclaimer</p>
          <p>Semua angka bersifat estimasi berdasarkan data publik BPS dan Google Maps. Bukan jaminan finansial.</p>
          <p>Sumber data: BPS Susenas 2024, Google Places API.</p>
        </div>
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string | null }) {
  if (decision === "GO") return <Badge className="bg-green-500 text-white text-lg px-4 py-1 flex items-center gap-2 w-fit"><CheckCircle className="h-5 w-5" /> REKOMENDASI: JALANKAN</Badge>;
  if (decision === "CONDITIONAL") return <Badge className="bg-amber-500 text-white text-lg px-4 py-1 flex items-center gap-2 w-fit"><AlertTriangle className="h-5 w-5" /> PERLU STRATEGI</Badge>;
  return <Badge className="bg-red-500 text-white text-lg px-4 py-1 flex items-center gap-2 w-fit"><XCircle className="h-5 w-5" /> TIDAK DIREKOMENDASIKAN</Badge>;
}

function MetricBar({ label, score, icon: Icon }: { label: string; score: number | null; icon: LucideIcon }) {
  const s = Number(score) || 0;
  const color = s >= 7 ? "bg-green-500" : s >= 5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
        <span className="font-bold">{s.toFixed(1)}/10</span>
      </div>
      <div className="h-2.5 rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${s * 10}%` }} />
      </div>
    </div>
  );
}

function TradeAreaInfo({ meta, eco }: { meta?: EconomicV3Meta; eco: EconomicData }) {
  if (!meta?.trade_area) return null;
  const ta = meta.trade_area;
  const scale = meta.business_scale || 'mikro';
  const scaleLabels: Record<string, string> = {
    gerobak: 'Gerobak/Keliling', rumahan: 'Rumahan', mikro: 'Mikro',
    kecil: 'Kecil', menengah: 'Menengah', besar: 'Besar',
  };

  const radiusKm = ta.tradeRadiusM > 0 ? (ta.tradeRadiusM / 1000) : 0;
  const radiusLabel = radiusKm > 0
    ? (radiusKm >= 1 ? `${radiusKm.toFixed(radiusKm % 1 === 0 ? 0 : 1)} km` : `${ta.tradeRadiusM} m`)
    : '';

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="h-4 w-4 text-accent" />
        <span className="text-xs font-semibold uppercase text-muted-foreground">Area Jangkauan Pelanggan</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Total warga kecamatan: <strong>{fmt(ta.totalPopulation)}</strong></span>
        <span className="text-muted-foreground">→</span>
        <span>Yang realistis bisa dilayani{radiusLabel ? ` (radius ${radiusLabel})` : ''}: <strong className="text-accent">~{fmt(ta.effectivePopulation)}</strong> orang</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Badge variant="outline" className="text-[10px]">Skala: {scaleLabels[scale] || scale}</Badge>
        {radiusLabel && <Badge variant="outline" className="text-[10px]">Radius: {radiusLabel}</Badge>}
        {ta.reductionFactor < 1 && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400">
          Mencakup {(ta.reductionFactor * 100).toFixed(0)}% area kecamatan
        </Badge>}
      </div>
    </div>
  );
}

function SanityWarning({ meta }: { meta?: EconomicV3Meta }) {
  if (!meta?.sanity_info) return null;
  const si = meta.sanity_info;
  if (!si.wasCapped && !si.wasFloored) return null;

  return (
    <div className={`rounded-xl border p-4 ${si.wasCapped ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30' : 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'}`}>
      <div className="flex items-start gap-2">
        {si.wasCapped ? <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /> : <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />}
        <div>
          <p className={`text-sm font-medium ${si.wasCapped ? 'text-amber-800 dark:text-amber-300' : 'text-blue-800 dark:text-blue-300'}`}>
            {si.wasCapped ? 'Estimasi di-cap ke benchmark skala bisnis' : 'Estimasi dinaikkan ke minimum viable'}
          </p>
          <p className={`text-xs mt-1 ${si.wasCapped ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'}`}>
            {si.warningMessage}
          </p>
        </div>
      </div>
    </div>
  );
}

function CapacityBadge({ meta }: { meta?: EconomicV3Meta }) {
  if (!meta?.capacity_info?.isCapacityCapped) return null;
  const ci = meta.capacity_info;
  const scale = meta.business_scale || 'mikro';
  const scaleLabels: Record<string, string> = {
    gerobak: 'gerobak', rumahan: 'rumahan', mikro: 'mikro',
    kecil: 'kecil', menengah: 'menengah', besar: 'besar',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800 cursor-help flex items-center gap-1 w-fit">
          <AlertTriangle className="h-3 w-3 shrink-0" /> Dibatasi kapasitas: maksimal {ci.capacityCap} pelanggan/hari (sesuai skala usaha {scaleLabels[scale] || scale})
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-[250px] text-xs">
          Bisnis skala {scaleLabels[scale] || scale} secara fisik hanya bisa melayani ~{ci.capacityCap} pelanggan per hari.
          Estimasi awal: {ci.rawCustomers} pelanggan.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function OmzetRangeDisplay({ eco, meta }: { eco: EconomicData; meta?: EconomicV3Meta }) {
  const konservatif = eco.omzet_konservatif ?? eco.estimated_monthly_revenue;
  const moderat = eco.omzet_moderat ?? eco.estimated_monthly_revenue;
  const optimistis = eco.omzet_optimistis ?? eco.estimated_monthly_revenue;
  const max = optimistis || 1;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold uppercase text-muted-foreground">Estimasi Omzet Bulanan</div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge topDown={eco.omzet_topdown ?? null} bottomUp={eco.omzet_bottomup ?? null} />
          <DataSourceBadge type="hybrid" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-center cursor-help">
              <div className="text-[10px] text-muted-foreground mb-1">Konservatif</div>
              <div className="text-sm font-bold">{fmtRpShort(konservatif)}</div>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-red-400" style={{ width: `${((konservatif || 0) / max) * 100}%` }} />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p className="max-w-[200px] text-xs">Perkiraan terburuk berdasarkan data minimal</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-center cursor-help">
              <div className="text-[10px] text-muted-foreground mb-1">Moderat</div>
              <div className="text-lg font-bold text-green-600">{fmtRpShort(moderat)}</div>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${((moderat || 0) / max) * 100}%` }} />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p className="max-w-[200px] text-xs">Perkiraan realistis (paling mungkin tercapai)</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-center cursor-help">
              <div className="text-[10px] text-muted-foreground mb-1">Optimistis</div>
              <div className="text-sm font-bold">{fmtRpShort(optimistis)}</div>
              <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: '100%' }} />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p className="max-w-[200px] text-xs">Perkiraan terbaik kalau strategi efektif</p></TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

type UpgradeProps = { analysisId?: string; currentTier?: string; onUpgraded?: () => void };

export function EconomicPotentialTab({
  economic,
  decision,
  features,
  v3Meta,
  upgradeProps,
}: {
  economic: EconomicData[];
  decision: DecisionData[];
  features: PlanFeatures;
  v3Meta?: EconomicV3Meta;
  upgradeProps?: UpgradeProps;
}) {
  if (economic.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calculator className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Data ekonomi belum tersedia</p>
      </div>
    );
  }

  const eco = economic[0];
  const dec = decision[0];

  return (
    <div className="space-y-4">
      {/* Summary cards — ALWAYS VISIBLE */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 text-center">
          {dec && <DecisionBadge decision={dec.decision} />}
          <p className="mt-2 text-xs text-muted-foreground">{dec?.decision_reason || ""}</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Insight</div>
          <p className="text-sm">{dec?.insight_summary || "-"}</p>
        </div>
      </div>

      {/* Summary numbers — ALWAYS VISIBLE */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Estimasi Omzet</div>
          <div className="text-lg font-bold">{fmtRpShort(eco.omzet_konservatif ?? eco.estimated_monthly_revenue)} — {fmtRpShort(eco.omzet_optimistis ?? eco.estimated_monthly_revenue)}</div>
          <div className="text-[10px] text-muted-foreground">/bulan</div>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Pelanggan/Hari</div>
          <div className="text-lg font-bold">~{fmt(eco.estimated_daily_customers)}</div>
          <div className="text-[10px] text-muted-foreground">orang</div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="rounded-xl border bg-card p-4 text-center cursor-help">
              <div className="text-xs text-muted-foreground mb-1">BEP / Balik Modal</div>
              <div className="text-lg font-bold">{(eco.bep_days || 999) >= 999 ? "N/A" : `~${((eco.bep_days || 0) / 30).toFixed(1)} bulan`}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent><p className="max-w-[220px] text-xs">Balik Modal — lama waktu hingga modal awal kembali dari laba bersih</p></TooltipContent>
        </Tooltip>
        <div className="rounded-xl border bg-card p-4 text-center">
          <div className="text-xs text-muted-foreground mb-1">Harga Rekomendasi</div>
          <div className="text-lg font-bold">{fmtRp(eco.recommended_price_min)} — {fmtRp(eco.recommended_price_max)}</div>
        </div>
      </div>

      {/* Omzet 3-bar range — Basic+ */}
      {features.omzet_range ? (
        <>
          <OmzetRangeDisplay eco={eco} meta={v3Meta} />
          {features.confidence_badge && (
            <div className="flex justify-center gap-2">
              <ConfidenceBadge topDown={eco.omzet_topdown ?? null} bottomUp={eco.omzet_bottomup ?? null} />
              <DataSourceBadge type="hybrid" />
            </div>
          )}
        </>
      ) : (
        <UpgradeTeaser message="Lihat breakdown omzet konservatif / moderat / optimistis" targetPlan="starter" {...upgradeProps} />
      )}

      {/* Trade Area Info — visible to all tiers for transparency */}
      <TradeAreaInfo meta={v3Meta} eco={eco} />

      {/* Input data warnings */}
      {v3Meta?.input_warnings && v3Meta.input_warnings.length > 0 && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Catatan Akurasi Data</p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                {v3Meta.input_warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Sanity Warning — always show if present */}
      <SanityWarning meta={v3Meta} />

      {/* Capacity Badge */}
      {v3Meta?.capacity_info?.isCapacityCapped && (
        <div className="flex justify-center">
          <CapacityBadge meta={v3Meta} />
        </div>
      )}

      {/* Market Score — Basic+ */}
      {features.show_breakdown ? (
        <>
          {dec && (
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-4 font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" /> Skor Potensi Pasar: {Number(dec.market_score).toFixed(1)}/10
              </h3>
              <div className="space-y-3">
                <MetricBar label="Populasi (30%)" score={dec.population_score} icon={Users} />
                <MetricBar label="Lalu Lintas (25%)" score={dec.traffic_score} icon={Car} />
                <MetricBar label="Daya Beli (15%)" score={dec.income_score} icon={DollarSign} />
                <MetricBar label="Celah Kompetitor (15%)" score={dec.competitor_gap_score} icon={Store} />
                <MetricBar label="Kepadatan Penduduk (15%)" score={dec.density_score} icon={Building2} />
              </div>
            </div>
          )}
        </>
      ) : (
        <UpgradeTeaser message="Lihat breakdown skor per metrik" targetPlan="starter" {...upgradeProps} />
      )}

      {/* Trade-off — always visible if present */}
      {dec?.tradeoff_label && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-semibold text-amber-800 dark:text-amber-300">{dec.tradeoff_label}</span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400">{dec.tradeoff_detail}</p>
        </div>
      )}

      {/* Detail accordion — Growth+ for profit/BEP detail */}
      {features.bep_detail ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="customer">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Estimasi Pelanggan</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-1">
                    <div className="text-xs text-muted-foreground">
                      {v3Meta?.trade_area ? 'Populasi yang Realistis Dilayani' : 'Populasi Kecamatan'}
                    </div>
                    <DataSourceBadge type={v3Meta?.trade_area ? 'hybrid' : 'real'} />
                  </div>
                  <div className="text-lg font-bold">
                    {v3Meta?.trade_area ? fmt(v3Meta.trade_area.effectivePopulation) : fmt(eco.population_total)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {v3Meta?.trade_area
                      ? (() => {
                          const m = v3Meta.trade_area.tradeRadiusM;
                          const r = m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km` : `${m} m`;
                          return `dari ${fmt(v3Meta.trade_area.totalPopulation)} warga (radius ${r})`;
                        })()
                      : `${eco.village_count} desa (${eco.urban_village_count} urban, ${eco.rural_village_count} rural)`
                    }
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-muted-foreground cursor-help">Tingkat Kunjungan & Pembelian</div>
                      </TooltipTrigger>
                      <TooltipContent><p className="max-w-[220px] text-xs">Persentase warga yang lewat lokasi × persentase yang berniat membeli</p></TooltipContent>
                    </Tooltip>
                    <DataSourceBadge type="hybrid" />
                  </div>
                  <div className="text-lg font-bold">{((eco.mobility_rate || 0) * 100).toFixed(2)}% lewat × {((eco.capture_rate || 0) * 100).toFixed(2)}% niat beli</div>
                  <div className="text-[10px] text-muted-foreground">Tipe Lokasi: {(() => {
                    const t = (eco.location_type || '').toLowerCase();
                    const map: Record<string, string> = { cbd: 'Pusat Bisnis (CBD)', residential: 'Permukiman', mixed: 'Campuran', rural: 'Pedesaan', urban: 'Perkotaan' };
                    return map[t] || eco.location_type;
                  })()}</div>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3">
                  <div className="flex items-center gap-1">
                    <div className="text-xs text-muted-foreground">Pelanggan Harian</div>
                    <DataSourceBadge type="assumed" />
                  </div>
                  <div className="text-lg font-bold text-green-600">{fmt(eco.estimated_daily_customers)} orang</div>
                  {v3Meta?.capacity_info?.isCapacityCapped && (
                    <div className="text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Dibatasi dari estimasi awal {v3Meta.capacity_info.rawCustomers}</div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="revenue">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Estimasi Omzet</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Rata-rata Belanja per Pelanggan</div>
                  <div className="text-lg font-bold">{fmtRp(eco.avg_transaction)}</div>
                  <div className="text-[10px] text-muted-foreground">Harga dasar {fmtRp(eco.base_price)} × faktor daya beli {eco.income_multiplier}x</div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="rounded-lg bg-muted/50 p-3 cursor-help">
                      <div className="text-xs text-muted-foreground">Estimasi dari Pasar (atas-bawah)</div>
                      <div className="text-lg font-bold">{fmtRpShort(eco.omzet_topdown)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-[220px] text-xs">Estimasi pasar berdasarkan total daya beli populasi</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="rounded-lg bg-muted/50 p-3 cursor-help">
                      <div className="text-xs text-muted-foreground">Estimasi dari Pelanggan (bawah-atas)</div>
                      <div className="text-lg font-bold">{fmtRpShort(eco.omzet_bottomup)}</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-[220px] text-xs">Estimasi dari potensi pelanggan harian yang realistis dilayani</p></TooltipContent>
                </Tooltip>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pricing">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> Rekomendasi Harga</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Range Harga Rekomendasi</div>
                  <div className="text-lg font-bold">{fmtRp(eco.recommended_price_min)} – {fmtRp(eco.recommended_price_max)}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">Strategi</div>
                  <div className="text-lg font-bold capitalize">{eco.pricing_strategy || "-"}</div>
                  <div className="text-[10px] text-muted-foreground">Level daya beli: {eco.expenditure_level}</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="profit">
            <AccordionTrigger className="text-sm">
              <span className="flex items-center gap-2"><Calculator className="h-4 w-4" /> Profit & BEP</span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {/* CAPEX adequacy check vs benchmark table */}
                {v3Meta?.capex_check?.benchmark && v3Meta?.capital_source === 'benchmark' && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30 p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" /> Modal Menggunakan Estimasi Benchmark
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Anda tidak mengisi modal awal. Semua perhitungan (BEP, working capital, profit) menggunakan <strong>benchmark industri skala {v3Meta.business_scale}</strong>: Rp {(v3Meta.capex_check.benchmark.capex_min/1_000_000).toFixed(0)} – {(v3Meta.capex_check.benchmark.capex_max/1_000_000).toFixed(0)} juta (estimasi yang dipakai: <strong>{fmtRpShort(v3Meta.capital_effective)}</strong>).
                        </p>
                        {v3Meta.capex_check.benchmark.capex_items && (
                          <p className="text-[10px] text-blue-600/80 dark:text-blue-500/80 mt-1">
                            <strong>Komponen modal:</strong> {v3Meta.capex_check.benchmark.capex_items}
                          </p>
                        )}
                        <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-1.5 flex items-start gap-1.5">
                          <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" /> Isi field "Modal Awal" di wizard untuk perhitungan yang sesuai kondisi Anda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {v3Meta?.capex_check?.benchmark && v3Meta?.capital_source === 'user' && !v3Meta.capex_check.isAdequate && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Modal di Bawah Benchmark
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Modal Anda: <strong>{fmtRpShort(v3Meta.capital_user_input)}</strong> · Benchmark skala {v3Meta.business_scale}: <strong>Rp {(v3Meta.capex_check.benchmark.capex_min/1_000_000).toFixed(0)} – {(v3Meta.capex_check.benchmark.capex_max/1_000_000).toFixed(0)} juta</strong>
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">{v3Meta.capex_check.warningMessage}</p>
                        {v3Meta.capex_check.benchmark.capex_items && (
                          <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-1">
                            <strong>Komponen modal:</strong> {v3Meta.capex_check.benchmark.capex_items}
                          </p>
                        )}
                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 mt-1.5 flex items-start gap-1.5">
                          <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" /> Saran: Pertimbangkan skala lebih kecil (rumahan / gerobak) atau tambah modal sebelum memulai.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {v3Meta?.capex_check?.benchmark && v3Meta?.capital_source === 'user' && v3Meta.capex_check.isAdequate && (
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-green-700 dark:text-green-400">
                        Modal <strong>{fmtRpShort(v3Meta.capital_user_input)}</strong> sesuai standar skala usaha {v3Meta.business_scale} (kisaran Rp {(v3Meta.capex_check.benchmark.capex_min/1_000_000).toFixed(0)} – {(v3Meta.capex_check.benchmark.capex_max/1_000_000).toFixed(0)} juta).
                      </p>
                    </div>
                  </div>
                )}

                {/* Working Capital Check — Pro only */}
                {features.show_wc_analysis && v3Meta?.working_capital && (
                  <div className={`rounded-lg p-3 ${v3Meta.working_capital.isCapitalAdequate ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    <div className="flex items-start gap-2">
                      {v3Meta.working_capital.isCapitalAdequate
                        ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        : <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />}
                      <div>
                        <p className={`text-sm font-medium ${v3Meta.working_capital.isCapitalAdequate ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {v3Meta.working_capital.isCapitalAdequate
                            ? `Modal ${fmtRpShort(eco.initial_capital)} cukup untuk ${fmt(eco.estimated_daily_customers)} porsi/hari (cadangan ${v3Meta.working_capital.bufferDays} hari)`
                            : `Modal ${fmtRpShort(eco.initial_capital)} hanya cukup untuk ${fmt(v3Meta.working_capital.affordableCustomersPerDay)} porsi/hari`}
                        </p>
                        {!v3Meta.working_capital.isCapitalAdequate && (
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                            Potensi dari analisis: {fmt(eco.estimated_daily_customers)} porsi/hari • Kekurangan modal: {fmtRpShort(v3Meta.working_capital.capitalGap)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Perbandingan 2 Skenario: Modal User vs Modal Benchmark */}
                {v3Meta?.capital_source === 'user'
                  && v3Meta?.capex_check?.benchmark
                  && v3Meta?.working_capital
                  && !v3Meta.working_capital.isCapitalAdequate
                  && v3Meta?.profit_benchmark && (() => {
                    const bm = v3Meta.capex_check!.benchmark!;
                    const wc = v3Meta.working_capital!;
                    const pb = v3Meta.profit_benchmark!;
                    const benchmarkMidCapex = Math.round((bm.capex_min + bm.capex_max) / 2);
                    // Skenario A: modal user (data sudah ada di pb)
                    const userProfit = pb.monthlyNetProfit;
                    const userRevenue = pb.adjustedMonthlyRevenue;
                    // Skenario B: modal benchmark — pakai full revenue (tidak dibatasi modal)
                    const fullRevenue = eco.estimated_monthly_revenue || 0;
                    const fullGross = Math.round(fullRevenue * pb.benchmarkGrossMargin);
                    const fullNet = fullGross - pb.monthlyOpex;
                    return (
                      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold">Perbandingan Skenario Modal</div>
                            <div className="text-xs text-muted-foreground">Modal Anda di bawah benchmark industri — lihat dampaknya:</div>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {/* Skenario A — Modal User */}
                          <div className="rounded-lg border border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20 p-3">
                            <div className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400 mb-2">Skenario A — Modal Anda</div>
                            <div className="text-xl font-bold mb-2">{fmtRpShort(v3Meta.capital_user_input)}</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between"><span className="text-muted-foreground">Kapasitas/hari</span><span className="font-medium">{fmt(wc.affordableCustomersPerDay)} porsi</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Omzet/bulan</span><span className="font-medium">{fmtRpShort(userRevenue)}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Biaya operasional tetap</span><span className="font-medium">-{fmtRpShort(pb.monthlyOpex)}</span></div>
                              <div className={`flex justify-between border-t pt-1 mt-1 font-bold ${userProfit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                <span>Laba Bersih</span><span>{fmtRpShort(userProfit)}{userProfit < 0 && ' (rugi)'}</span>
                              </div>
                            </div>
                          </div>
                          {/* Skenario B — Modal Benchmark */}
                          <div className="rounded-lg border border-green-300 bg-green-50/60 dark:border-green-700 dark:bg-green-950/20 p-3">
                            <div className="text-[10px] uppercase font-semibold text-green-700 dark:text-green-400 mb-2">Skenario B — Modal Standar Industri</div>
                            <div className="text-xl font-bold mb-2">{fmtRpShort(benchmarkMidCapex)}</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between"><span className="text-muted-foreground">Kapasitas/hari</span><span className="font-medium">{fmt(eco.estimated_daily_customers)} porsi</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Omzet/bulan</span><span className="font-medium">{fmtRpShort(fullRevenue)}</span></div>
                              <div className="flex justify-between"><span className="text-muted-foreground">Biaya operasional tetap</span><span className="font-medium">-{fmtRpShort(pb.monthlyOpex)}</span></div>
                              <div className={`flex justify-between border-t pt-1 mt-1 font-bold ${fullNet < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                <span>Laba Bersih</span><span>{fmtRpShort(fullNet)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed flex items-start gap-1.5">
                          <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" /> Pasar potensial sama — bedanya hanya di modal kerja. Dengan modal {fmtRpShort(benchmarkMidCapex)}, Anda bisa beli bahan baku untuk melayani semua {fmt(eco.estimated_daily_customers)} customer harian. Dengan modal {fmtRpShort(v3Meta.capital_user_input)}, Anda hanya mampu produksi {fmt(wc.affordableCustomersPerDay)} porsi/hari sehingga revenue terbatas dan opex tetap (sewa, gaji) bikin rugi.
                        </p>
                      </div>
                    );
                })()}

                {/* Profit Breakdown (benchmark) */}
                {v3Meta?.profit_benchmark ? (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">Rincian Sesuai Standar Industri</div>

                    {/* CRITICAL: Explain mismatch when revenue here ≠ revenue at top */}
                    {v3Meta?.working_capital && !v3Meta.working_capital.isCapitalAdequate && (
                      <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-2.5">
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span><strong>Catatan penting:</strong> Omzet di bawah ({fmtRpShort(v3Meta.profit_benchmark.adjustedMonthlyRevenue)}) bukan potensi pasar penuh, tapi omzet maksimum yang <strong>bisa Anda jalankan dengan modal {fmtRpShort(eco.initial_capital)}</strong> (hanya {fmt(v3Meta.working_capital.affordableCustomersPerDay)} porsi/hari, bukan {fmt(eco.estimated_daily_customers)} porsi).
                          Pasarnya potensial — masalahnya modal tidak cukup beli bahan baku untuk melayani semua pelanggan.</span>
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 flex items-start gap-1.5">
                          <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                          <span><strong>Skenario dengan modal cukup ({fmtRpShort(v3Meta.working_capital.workingCapitalNeeded)}):</strong> omzet ~{fmtRpShort(eco.estimated_monthly_revenue)}/bulan, laba potensial ~{fmtRpShort(Math.round((eco.estimated_monthly_revenue || 0) * v3Meta.profit_benchmark.benchmarkNetMargin))}/bulan.</span>
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Omzet {v3Meta?.working_capital && !v3Meta.working_capital.isCapitalAdequate && <span className="text-[10px] text-amber-600">(dibatasi modal)</span>}</span>
                        <span className="font-medium">100% — {fmtRpShort(v3Meta.profit_benchmark.adjustedMonthlyRevenue)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>├── HPP / Biaya Bahan Baku</span>
                        <span>-{Math.round((1 - v3Meta.profit_benchmark.benchmarkGrossMargin) * 100)}% — -{fmtRpShort(Math.round(v3Meta.profit_benchmark.adjustedMonthlyRevenue * (1 - v3Meta.profit_benchmark.benchmarkGrossMargin)))}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>├── Laba Kotor</span>
                        <span>{Math.round(v3Meta.profit_benchmark.benchmarkGrossMargin * 100)}% — {fmtRpShort(v3Meta.profit_benchmark.monthlyGrossProfit)}</span>
                      </div>
                      <div className="flex justify-between text-red-600 dark:text-red-400">
                        <span>├── Biaya Operasional (sewa, gaji, dll)</span>
                        <span>-{fmtRpShort(v3Meta.profit_benchmark.monthlyOpex)}</span>
                      </div>
                      {v3Meta?.opex_info && v3Meta.opex_info.source !== 'user' && (
                        <p className="text-[10px] text-muted-foreground italic pl-4 -mt-1 flex items-start gap-1">
                          <Info className="h-2.5 w-2.5 mt-0.5 shrink-0" /> Biaya operasional menggunakan estimasi sesuai kategori usaha. Isi di wizard untuk estimasi yang lebih akurat.
                        </p>
                      )}
                      {v3Meta?.working_capital && !v3Meta.working_capital.isCapitalAdequate && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 italic pl-4 -mt-1 flex items-start gap-1">
                          <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0" /> Biaya operasional tetap (sewa, gaji, dll) tidak ikut menyusut walau Anda hanya layani {fmt(v3Meta.working_capital.affordableCustomersPerDay)} porsi/hari → inilah yang membuat laba jadi rugi. Bukan karena pasar buruk, tapi karena omzet terbatasi modal sementara biaya tetap jalan.
                        </p>
                      )}
                      {(() => {
                        const rev = v3Meta.profit_benchmark.adjustedMonthlyRevenue || 0;
                        const np = v3Meta.profit_benchmark.monthlyNetProfit || 0;
                        const actualPct = rev > 0 ? Math.round((np / rev) * 100) : 0;
                        const isNeg = np < 0;
                        return (
                          <div className={`border-t pt-2 flex justify-between font-bold ${isNeg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            <span>└── LABA BERSIH {isNeg && <span className="text-xs font-normal">(rugi)</span>}</span>
                            <span>{actualPct}% — {fmtRpShort(np)}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">Profit Bulanan</div>
                      <div className={`text-lg font-bold ${(eco.estimated_monthly_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtRp(eco.estimated_monthly_profit)}</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs text-muted-foreground">Modal Awal</div>
                      <div className="text-lg font-bold">{fmtRp(eco.initial_capital)}</div>
                    </div>
                  </div>
                )}

                {/* Margin comparison warning */}
                {v3Meta?.margin_comparison?.isUserOverOptimistic && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">{v3Meta.margin_comparison.warningMessage}</p>
                    </div>
                  </div>
                )}

                {/* BEP — 3 modes: user_input | benchmark_scenarios | warning_with_scenarios */}
                {(() => {
                  const modalUser = eco.initial_capital || 0;
                  const benchmark = v3Meta?.capex_check?.benchmark || null;
                  const netProfit = v3Meta?.profit_benchmark?.monthlyNetProfit ?? eco.estimated_monthly_profit ?? 0;
                  const isProfitable = netProfit > 0;

                  // Mode 1: user_input — modal cukup
                  const isUserInputMode = modalUser > 0 && benchmark && modalUser >= benchmark.capex_min;

                  if (isUserInputMode) {
                    return (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="text-xs text-muted-foreground">Total Modal Awal</div>
                          <div className="text-lg font-bold">{fmtRp(eco.initial_capital)}</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="text-xs text-muted-foreground">Laba Bersih per Bulan</div>
                          <div className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fmtRpShort(netProfit)}
                          </div>
                        </div>
                        <div className={`rounded-lg p-3 ${(eco.bep_days || 999) <= 365 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground cursor-help">BEP / Balik Modal</div>
                            </TooltipTrigger>
                            <TooltipContent><p className="max-w-[220px] text-xs">Balik Modal — lama waktu hingga modal awal kembali dari laba bersih</p></TooltipContent>
                          </Tooltip>
                          <div className={`text-lg font-bold ${(eco.bep_days || 999) <= 365 ? 'text-green-600' : 'text-red-600'}`}>
                            {(eco.bep_days || 999) >= 999 ? "N/A" : `${eco.bep_days} hari`}
                          </div>
                          {(eco.bep_days || 999) < 999 && (
                            <>
                              <div className="text-[10px] text-muted-foreground">≈ {((eco.bep_days || 0) / 30).toFixed(1)} bulan</div>
                              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full ${(eco.bep_days || 999) <= 365 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(100, (30 / Math.max(1, eco.bep_days || 999)) * 100)}%` }} />
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                {(eco.bep_days || 999) <= 365
                                  ? <><CheckCircle className="h-2.5 w-2.5 text-green-500" /> Layak Dijalankan</>
                                  : (eco.bep_days || 999) <= 730
                                  ? <><AlertTriangle className="h-2.5 w-2.5 text-amber-500" /> Lama</>
                                  : <><XCircle className="h-2.5 w-2.5 text-red-500" /> Tidak Layak</>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Mode 2 & 3 — tampilkan skenario benchmark
                  if (!benchmark) {
                    // Tidak ada benchmark — fallback ke tampilan original
                    return (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="text-xs text-muted-foreground">Laba Bersih per Bulan</div>
                          <div className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtRpShort(netProfit)}</div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <div className="text-xs text-muted-foreground">Modal Awal</div>
                          <div className="text-lg font-bold">{modalUser > 0 ? fmtRp(modalUser) : 'Belum diisi'}</div>
                        </div>
                      </div>
                    );
                  }

                  const modalMin = benchmark.capex_min;
                  const modalIdeal = Math.round((benchmark.capex_min + benchmark.capex_max) / 2);
                  const profitForBep = Math.max(1, netProfit);
                  const bepMin = Math.round((modalMin / profitForBep) * 10) / 10;
                  const bepIdeal = Math.round((modalIdeal / profitForBep) * 10) / 10;

                  return (
                    <div className="space-y-3">
                      {/* Header info */}
                      {modalUser === 0 ? (
                        <div className="rounded-lg border bg-card p-4">
                          <div className="text-sm font-semibold mb-1">Berapa Modal yang Dibutuhkan?</div>
                          <p className="text-xs text-muted-foreground">
                            Anda belum mengisi modal awal. Berikut estimasi berdasarkan benchmark industri skala <strong>{v3Meta?.business_scale}</strong>:
                          </p>
                          <p className="text-xs mt-2">
                            <strong>Benchmark Modal:</strong> Rp {(benchmark.capex_min/1_000_000).toFixed(0)} juta — Rp {(benchmark.capex_max/1_000_000).toFixed(0)} juta
                          </p>
                          {benchmark.capex_items && (
                            <p className="text-[11px] text-muted-foreground mt-1">Meliputi: {benchmark.capex_items}</p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-3">
                          <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>Modal Anda (<strong>{fmtRpShort(modalUser)}</strong>) di bawah benchmark minimum <strong>Rp {(benchmark.capex_min/1_000_000).toFixed(0)} juta</strong> untuk skala {v3Meta?.business_scale}.</span>
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            Pertimbangkan skala lebih kecil (rumahan/gerobak) atau tambah modal. Berikut estimasi jika modal Anda cukup:
                          </p>
                        </div>
                      )}

                      {/* Profit-negative warning — replaces BEP scenarios */}
                      {!isProfitable ? (
                        <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30 p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                                Estimasi menunjukkan bisnis ini belum profitable pada skala ini
                              </p>
                              <p className="text-xs text-red-700 dark:text-red-400">
                                Estimasi omzet lebih kecil dari biaya operasional. Pertimbangkan: menurunkan biaya operasional, menaikkan harga, atau memilih lokasi dengan demand lebih tinggi.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border bg-card p-4">
                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Skenario Minimum</div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Modal:</span>
                                <span className="font-semibold">{fmtRpShort(modalMin)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Laba Bersih per Bulan:</span>
                                <span className="font-semibold text-green-600">{fmtRpShort(netProfit)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">BEP:</span>
                                <span className="font-semibold">~{bepMin} bulan</span>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-lg border bg-card p-4">
                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Skenario Ideal</div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Modal:</span>
                                <span className="font-semibold">{fmtRpShort(modalIdeal)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Laba Bersih per Bulan:</span>
                                <span className="font-semibold text-green-600">{fmtRpShort(netProfit)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">BEP:</span>
                                <span className="font-semibold">~{bepIdeal} bulan</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {modalUser === 0 && (
                        <p className="text-[11px] text-muted-foreground italic flex items-start gap-1">
                          <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" /> Isi "Modal Awal" di wizard untuk perhitungan yang sesuai kondisi Anda.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <UpgradeTeaser message="Lihat breakdown profit + margin benchmark industri" targetPlan="pro" {...upgradeProps} />
      )}

      {/* WC teaser for Growth users who have bep_detail but not wc_analysis */}
      {features.bep_detail && !features.show_wc_analysis && (
        <UpgradeTeaser message="Lihat analisis working capital + kapasitas modal" targetPlan="business" {...upgradeProps} />
      )}

      {/* Raw calculation data — Pro only */}
      {features.show_raw_data && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 font-semibold text-sm">Detail Perhitungan</h3>
          <div className="grid gap-2 text-xs text-muted-foreground">
            <p>Estimasi dari Pasar: {fmtRpShort(eco.omzet_topdown)} | Estimasi dari Pelanggan: {fmtRpShort(eco.omzet_bottomup)}</p>
            {v3Meta?.trade_area && (() => {
              const m = v3Meta.trade_area.tradeRadiusM;
              const label = m >= 1000 ? `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} km` : `${m} m`;
              return <p>Area Jangkauan: {label} → {fmt(v3Meta.trade_area.effectivePopulation)} orang</p>;
            })()}
            {v3Meta?.capacity_info && <p>Batas Kapasitas: {v3Meta.capacity_info.capacityCap}/hari | Dibatasi: {v3Meta.capacity_info.isCapacityCapped ? 'Ya' : 'Tidak'}</p>}
            {v3Meta?.sanity_info && <p>Batas Realistis: {fmtRpShort(v3Meta.sanity_info.capValue)} | Batas Minimum: {fmtRpShort(v3Meta.sanity_info.floorValue)}</p>}
          </div>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

export function BusinessDecisionTab({
  decision,
  economic,
  features,
  upgradeProps,
}: {
  decision: DecisionData[];
  economic: EconomicData[];
  features: PlanFeatures;
  upgradeProps?: UpgradeProps;
}) {
  if (decision.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Data keputusan belum tersedia</p>
      </div>
    );
  }

  const dec = decision[0];

  return (
    <div className="space-y-4">
      {/* ALWAYS VISIBLE: Decision badge + score + insight */}
      <div className="rounded-xl border bg-card p-6 text-center">
        <DecisionBadge decision={dec.decision} />
        <p className="mt-3 text-sm text-muted-foreground">{dec.decision_reason}</p>
        <div className="mt-2 text-xs text-muted-foreground">Skor Potensi Pasar: <span className="font-bold">{Number(dec.market_score).toFixed(1)}/10</span></div>
      </div>

      {/* Basic+: strengths/weaknesses/recommendation */}
      {features.show_breakdown ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border-l-4 border-l-green-500 bg-card p-5">
            <h4 className="text-xs font-semibold uppercase text-green-500 mb-2 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Kekuatan</h4>
            <p className="text-sm">{dec.insight_strength || "-"}</p>
          </div>
          <div className="rounded-xl border-l-4 border-l-red-500 bg-card p-5">
            <h4 className="text-xs font-semibold uppercase text-red-500 mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Tantangan</h4>
            <p className="text-sm">{dec.insight_weakness || "-"}</p>
          </div>
          <div className="rounded-xl border-l-4 border-l-blue-500 bg-card p-5">
            <h4 className="text-xs font-semibold uppercase text-blue-500 mb-2 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Rekomendasi</h4>
            <p className="text-sm">{dec.insight_recommendation || "-"}</p>
          </div>
        </div>
      ) : (
        <UpgradeTeaser message="Lihat kekuatan, kelemahan, dan rekomendasi detail" targetPlan="starter" {...upgradeProps} />
      )}

      {/* Growth+: Trade-off analysis */}
      {dec.tradeoff_label && (
        (features.insight_level === 'detailed' || features.insight_level === 'full') ? (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-3 font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analisis Untung-Rugi</h3>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <div className="font-semibold text-accent">{dec.tradeoff_label}</div>
              <p className="text-sm text-muted-foreground mt-1">{dec.tradeoff_detail}</p>
            </div>
          </div>
        ) : features.show_breakdown ? (
          <UpgradeTeaser message="Lihat analisis trade-off detail antar metrik" targetPlan="pro" {...upgradeProps} />
        ) : null
      )}

      {/* Basic+: Market Score breakdown */}
      {features.show_breakdown ? (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 font-semibold flex items-center gap-2"><LineChart className="h-4 w-4" /> Detail Skor Potensi Pasar</h3>
          <div className="space-y-3">
            <MetricBar label="Populasi (30%)" score={dec.population_score} icon={Users} />
            <MetricBar label="Lalu Lintas (25%)" score={dec.traffic_score} icon={Car} />
            <MetricBar label="Daya Beli (15%)" score={dec.income_score} icon={DollarSign} />
            <MetricBar label="Celah Kompetitor (15%)" score={dec.competitor_gap_score} icon={Store} />
            <MetricBar label="Kepadatan Penduduk (15%)" score={dec.density_score} icon={Building2} />
          </div>
        </div>
      ) : null}

      <Disclaimer />
    </div>
  );
}
