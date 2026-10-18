import { useState } from 'react';
import type { ScoreBreakdown } from '@/types/location-scoring';
import { ChevronDown, ChevronUp, AlertTriangle, Info, Store, Star, Car, Landmark } from 'lucide-react';
import { isMockScore } from '@/lib/scoring-fallback';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ScoreBreakdownCardProps {
  location: string;
  district: string;
  breakdown: ScoreBreakdown;
}

const METRICS = [
  { key: 'competitor_density', icon: Store, label: 'Kepadatan Kompetitor', tooltip: 'Berapa banyak pesaing langsung di radius ini.' },
  { key: 'rating_gap', icon: Star, label: 'Peluang dari Rating Kompetitor', tooltip: 'Semakin rendah rating rata-rata kompetitor, semakin besar peluang Anda untuk unggul.' },
  { key: 'traffic_level', icon: Car, label: 'Tingkat Keramaian', tooltip: 'Berapa ramai area ini berdasarkan generator traffic (sekolah, kantor, transportasi).' },
  { key: 'landmark_potential', icon: Landmark, label: 'Daya Tarik Tempat Sekitar', tooltip: 'Seberapa banyak tempat ramai (mall, sekolah, kantor) yang menarik orang ke area ini.' },
] as const;

function getScoreColor(score: number, max: number) {
  const ratio = score / max;
  if (ratio >= 0.8) return 'bg-green-500';
  if (ratio >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTotalColor(total: number) {
  if (total >= 8) return 'text-green-500';
  if (total >= 5) return 'text-amber-500';
  return 'text-red-500';
}

function getBarGradient(score: number) {
  if (score >= 2.0) return 'from-green-500 to-green-400';
  if (score >= 1.0) return 'from-amber-500 to-amber-400';
  return 'from-red-500 to-red-400';
}

export default function ScoreBreakdownCard({ location, district, breakdown }: ScoreBreakdownCardProps) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const toggle = (key: string) => setExpandedMetric(prev => (prev === key ? null : key));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      {isMockScore(breakdown) && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Skor menggunakan data simulasi. Aktifkan Google Maps API di Pengaturan untuk data riil.
          </p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground text-base">{location}</h3>
          <p className="text-xs text-muted-foreground">{district}</p>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${getTotalColor(breakdown.total_score)}`}>
            {breakdown.total_score.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground block">/10</span>
        </div>
      </div>

      {/* Metric rows */}
      <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        {METRICS.map(({ key, icon: Icon, label, tooltip }) => {
          const metricData = breakdown[key];
          const score = metricData.score;
          const pct = (score / 2.5) * 100;
          const isExpanded = expandedMetric === key;

          return (
            <div key={key}>
              <button
                onClick={() => toggle(key)}
                className="w-full text-left group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground flex items-center gap-1 flex-1">
                    {label}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex"
                        >
                          <Info className="h-3 w-3 text-muted-foreground/70 hover:text-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="text-xs font-mono text-muted-foreground mr-1">
                    {score.toFixed(1)}/2.5
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getBarGradient(score)} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {metricData.explanation}
                </p>
              </button>

              {/* Expandable detail */}
              {isExpanded && (
                <div className="mt-2 ml-6 p-3 rounded-lg bg-muted/50 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {key === 'competitor_density' && (
                    <CompetitorDetail data={breakdown.competitor_density} />
                  )}
                  {key === 'rating_gap' && (
                    <RatingDetail data={breakdown.rating_gap} />
                  )}
                  {key === 'traffic_level' && (
                    <TrafficDetail data={breakdown.traffic_level} />
                  )}
                  {key === 'landmark_potential' && (
                    <LandmarkDetail data={breakdown.landmark_potential} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      </TooltipProvider>
    </div>
  );
}

// ============ Detail sub-components ============

function CompetitorDetail({ data }: { data: ScoreBreakdown['competitor_density'] }) {
  if (data.competitors.length === 0) {
    return <p className="text-muted-foreground italic">Tidak ada kompetitor ditemukan di area ini</p>;
  }
  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground mb-1">{data.raw_count} kompetitor ditemukan:</p>
      {data.competitors.slice(0, 8).map((c, i) => (
        <div key={i} className="border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
          <div className="flex items-center justify-between">
            <span className="text-foreground truncate max-w-[55%] font-medium">{c.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">{'★'.repeat(Math.round(c.rating))}</span>
              <span className="text-muted-foreground">{c.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({c.review_count})</span>
              <span className="text-muted-foreground">{c.distance_meters}m</span>
            </div>
          </div>
          {c.address && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.address}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function RatingDetail({ data }: { data: ScoreBreakdown['rating_gap'] }) {
  if (data.avg_rating === 0) {
    return <p className="text-muted-foreground italic">Tidak ada data rating kompetitor</p>;
  }
  const barWidth = (data.avg_rating / 5) * 100;
  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground">Rata-rata rating kompetitor:</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className="font-mono font-semibold text-foreground">{data.avg_rating}/5.0</span>
      </div>
      <p className="text-muted-foreground">
        {data.avg_rating <= 3.5
          ? 'Rating rendah = peluang besar untuk masuk dengan kualitas lebih baik'
          : 'Rating tinggi = perlu diferensiasi kuat untuk bersaing'}
      </p>
    </div>
  );
}

function TrafficDetail({ data }: { data: ScoreBreakdown['traffic_level'] }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Penarik keramaian</span>
        <span className="font-medium text-foreground">{data.traffic_generators} tempat</span>
      </div>
      {data.congestion_ratio !== null && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tingkat kemacetan</span>
          <span className="font-medium text-foreground">{data.congestion_ratio}x</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Rata-rata jumlah ulasan</span>
        <span className="font-medium text-foreground">{data.avg_review_volume} ulasan</span>
      </div>
    </div>
  );
}

function LandmarkDetail({ data }: { data: ScoreBreakdown['landmark_potential'] }) {
  if (data.landmarks.length === 0) {
    return <p className="text-muted-foreground italic">Tidak ada landmark terdeteksi</p>;
  }
  return (
    <div className="space-y-1">
      <p className="font-medium text-foreground mb-1">{data.landmark_count} landmark:</p>
      {data.landmarks.map((l, i) => (
        <div key={i} className="flex items-center justify-between">
          <span className="text-foreground truncate max-w-[60%]">{l.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground capitalize">{l.type.replace(/_/g, ' ')}</span>
            <span className={`font-mono ${l.weight >= 0.4 ? 'text-green-500' : 'text-muted-foreground'}`}>
              +{l.weight.toFixed(2)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
