// ============================================================
// DECISION ENGINE — Formula dari BRD
// ============================================================

export interface MarketScoreInput {
  population: number;
  max_population: number;
  traffic_score_from_existing: number; // 0-2.5
  estimated_income: number;
  max_income: number;
  competitor_gap_from_existing: number; // 0-2.5
  density_proxy: number;
  max_density: number;
}

function normalize(value: number, max: number): number {
  return max === 0 ? 0 : parseFloat(Math.min(10, (value / max) * 10).toFixed(1));
}

function calculateMarketScore(input: MarketScoreInput) {
  const pop = normalize(input.population, input.max_population);
  const traffic = parseFloat(((input.traffic_score_from_existing / 2.5) * 10).toFixed(1));
  const income = normalize(input.estimated_income, input.max_income);
  const compGap = parseFloat(((input.competitor_gap_from_existing / 2.5) * 10).toFixed(1));
  const density = normalize(input.density_proxy, input.max_density);

  const total = parseFloat((
    (pop * 0.30) + (traffic * 0.25) + (income * 0.15) + (compGap * 0.15) + (density * 0.15)
  ).toFixed(1));

  return {
    populationScore: pop, trafficScore: traffic, incomeScore: income,
    competitorGapScore: compGap, densityScore: density,
    marketScore: Math.min(10, total),
  };
}

function makeDecision(score: number) {
  if (score >= 7.5) return { decision: 'GO' as const, reason: `Market score ${score}/10 — area sangat potensial.` };
  if (score >= 5.0) return { decision: 'CONDITIONAL' as const, reason: `Market score ${score}/10 — perlu strategi diferensiasi.` };
  return { decision: 'NO' as const, reason: `Market score ${score}/10 — pertimbangkan lokasi lain.` };
}

function analyzeTradeoffs(t: number, c: number, i: number, p: number) {
  const H = 7, L = 4;
  if (t >= H && c < L) return { label: 'Margin tertekan', detail: 'Traffic tinggi menarik banyak kompetitor. Fokus diferensiasi, bukan perang harga.' };
  if (i >= H && c >= H) return { label: 'Peluang premium', detail: 'Daya beli tinggi + kompetisi rendah — jangan jual murah di area ini.' };
  if (p >= H && i < L) return { label: 'Volume tinggi, harga rendah', detail: 'Pasar besar tapi daya beli terbatas. Harga terjangkau, volume tinggi.' };
  if (t < L && i >= H) return { label: 'Niche premium', detail: 'Traffic rendah tapi daya beli tinggi — cocok model pre-order/delivery.' };
  if (p < L && c >= H) return { label: 'Pasar kecil tanpa kompetisi', detail: 'Minim kompetitor tapi pasar terbatas.' };
  return { label: 'Pasar seimbang', detail: 'Tidak ada konflik besar. Fokus kualitas dan konsistensi.' };
}

function generateInsight(
  scores: ReturnType<typeof calculateMarketScore>,
  tradeoff: ReturnType<typeof analyzeTradeoffs>,
  decision: ReturnType<typeof makeDecision>
) {
  const metrics = [
    { name: 'Populasi', score: scores.populationScore },
    { name: 'Traffic', score: scores.trafficScore },
    { name: 'Daya beli', score: scores.incomeScore },
    { name: 'Celah kompetitor', score: scores.competitorGapScore },
    { name: 'Kepadatan', score: scores.densityScore },
  ].sort((a, b) => b.score - a.score);

  const top = metrics[0], bottom = metrics[metrics.length - 1];
  const strength = `${top.name} menjadi keunggulan utama (${top.score}/10)`;
  const weakness = `${bottom.name} menjadi tantangan (${bottom.score}/10)`;
  const recommendation = decision.decision === 'GO'
    ? 'Segera eksekusi — prioritaskan survey lapangan.'
    : decision.decision === 'CONDITIONAL'
      ? `Perlu strategi: ${tradeoff.detail.split('.')[0]}.`
      : 'Pertimbangkan lokasi alternatif atau model bisnis berbeda.';

  return {
    strength, weakness, recommendation,
    summary: `${strength}, namun ${weakness.toLowerCase()} — ${recommendation.toLowerCase()}`,
  };
}

export function calculateDecision(input: MarketScoreInput) {
  const scores = calculateMarketScore(input);
  const decision = makeDecision(scores.marketScore);
  const tradeoff = analyzeTradeoffs(scores.trafficScore, scores.competitorGapScore, scores.incomeScore, scores.populationScore);
  const insight = generateInsight(scores, tradeoff, decision);
  return { scores, decision, tradeoff, insight };
}
