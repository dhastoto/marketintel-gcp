/**
 * LAPIS 3: OUTPUT GUARDRAIL — Schema validation, relevance, hallucination, safety
 */

import type { BusinessInputData } from "./inputGuardrail";

// ===== 3A. SCHEMA VALIDATION =====
function validateSchema(output: any): string[] {
  const errors: string[] = [];
  if (!output) { errors.push("Output kosong"); return errors; }

  const requiredSections = ["executive_summary", "demographic_analysis", "locations"];
  for (const s of requiredSections) {
    if (!output[s]) errors.push(`Section "${s}" tidak ada di output`);
  }

  const es = output.executive_summary;
  if (es) {
    if (!es.main_opportunity) errors.push("executive_summary.main_opportunity kosong");
    if (typeof es.recommendation_score === 'number' && (es.recommendation_score < 1 || es.recommendation_score > 10)) {
      errors.push("recommendation_score harus 1-10");
    }
  }

  const locs = output.locations;
  if (Array.isArray(locs)) {
    if (locs.length === 0) errors.push("locations array kosong");
    for (let i = 0; i < locs.length; i++) {
      const l = locs[i];
      if (!l.location_name) errors.push(`locations[${i}].location_name kosong`);
      if (typeof l.score === 'number' && (l.score < 1 || l.score > 10)) {
        errors.push(`locations[${i}].score (${l.score}) di luar range 1-10`);
      }
      if (l.is_blind_spot && !l.blind_spot_reason) {
        errors.push(`locations[${i}] blind spot tanpa blind_spot_reason`);
      }
    }
  }

  return errors;
}

// ===== 3B. RELEVANCE SCORING =====
function scoreRelevance(input: BusinessInputData, output: any): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 10;

  const outputStr = JSON.stringify(output).toLowerCase();
  const productName = input.product_name.toLowerCase();

  if (!outputStr.includes(productName)) {
    flags.push("Output tidak menyebut nama produk user");
    score -= 3;
  }

  // Check locations match districts
  const inputDistricts = input.districts.map(d => d.toLowerCase());
  const locs = output.locations || [];
  for (const loc of locs) {
    if (!loc.is_blind_spot && loc.district) {
      const locDistrict = loc.district.toLowerCase();
      if (!inputDistricts.some((d: string) => locDistrict.includes(d) || d.includes(locDistrict))) {
        flags.push(`Lokasi "${loc.location_name}" bukan di kecamatan yang diminta`);
        score -= 2;
      }
    }
  }

  // Check segments exist
  const segments = output.psychographic_analysis?.segments || output.demographic_analysis?.target_segments || [];
  if (Array.isArray(segments) && segments.length === 0) {
    flags.push("Tidak ada segmen target yang dianalisis");
    score -= 1;
  }

  // Check suspicious all-high scores
  const locationScores = locs.filter((l: any) => !l.is_blind_spot).map((l: any) => l.score).filter((s: any) => typeof s === 'number');
  if (locationScores.length > 0) {
    const avg = locationScores.reduce((a: number, b: number) => a + b, 0) / locationScores.length;
    if (avg > 9.5) {
      flags.push("Skor lokasi terlalu tinggi (rata-rata > 9.5)");
      score -= 1;
    }
  }

  // Check business scale vs action plan
  if (input.business_scale === 'rumahan' || input.business_scale === 'mikro') {
    const actions = output.action_plan?.daily_actions || output.action_plan || [];
    const actionStr = JSON.stringify(actions).toLowerCase();
    const expensiveKw = ['sewa ruko', 'franchise', 'hiring karyawan', 'renovasi besar'];
    for (const kw of expensiveKw) {
      if (actionStr.includes(kw)) {
        flags.push(`Action plan menyarankan "${kw}" — tidak sesuai skala ${input.business_scale}`);
        score -= 1;
      }
    }
  }

  return { score: Math.max(0, Math.min(10, score)), flags };
}

// ===== 3C. HALLUCINATION DETECTION =====
function detectHallucination(output: any): { level: 'none' | 'low' | 'medium' | 'high'; flags: string[] } {
  const flags: string[] = [];
  const outputStr = JSON.stringify(output);

  const fakeStatPatterns = [
    /berdasarkan data BPS \d{4}/gi,
    /menurut survei \w+ \d{4}/gi,
    /riset menunjukkan \d+%/gi,
    /penelitian terbaru/gi,
  ];
  for (const p of fakeStatPatterns) {
    const m = outputStr.match(p);
    if (m) flags.push(`Kemungkinan klaim statistik palsu: "${m[0]}"`);
  }

  // Suspicious precise addresses
  const addrPatterns = [
    /Jl\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+No\.\s*\d+/g,
    /Ruko\s+\w+\s+Blok\s+[A-Z]\d+/g,
  ];
  for (const p of addrPatterns) {
    const m = outputStr.match(p);
    if (m) flags.push(`Alamat sangat spesifik mungkin fiktif: "${m[0]}"`);
  }

  // Fake quotes
  if (outputStr.includes('menurut pelanggan') || outputStr.includes('review mengatakan')) {
    flags.push("Terdeteksi quote/review yang mungkin dikarang");
  }

  let level: 'none' | 'low' | 'medium' | 'high' = 'none';
  if (flags.length >= 4) level = 'high';
  else if (flags.length >= 2) level = 'medium';
  else if (flags.length >= 1) level = 'low';

  return { level, flags };
}

// ===== 3D. SAFETY CHECK =====
function checkSafety(output: any): { safe: boolean; violations: string[] } {
  const outputStr = JSON.stringify(output);
  const violations: string[] = [];

  const toxicPatterns = [
    /terbaik\s+(di|se)\s*(Indonesia|dunia|Asia)/gi,
    /nomor\s*(1|satu)\s*(di|se)/gi,
    /dijamin\s+(kaya|sukses|untung\s+besar)/gi,
    /menyembuhkan/gi,
    /mengobati\s+\w+/gi,
    /anti[\s-]?kanker/gi,
    /kompetitor\s+(bodoh|tolol|penipu)/gi,
    /agama\s+tertentu/gi,
  ];

  for (const p of toxicPatterns) {
    const m = outputStr.match(p);
    if (m) violations.push(`Konten tidak aman: "${m[0]}"`);
  }

  return { safe: violations.length === 0, violations };
}

// ===== QUALITY GATE =====
export interface QualityReport {
  passed: boolean;
  overallScore: number;
  schemaValid: boolean;
  relevanceScore: number;
  hallucinationLevel: string;
  isSafe: boolean;
  allFlags: string[];
  action: 'publish' | 'review' | 'regenerate' | 'block';
}

export function runOutputGuardrail(input: BusinessInputData, output: any): QualityReport {
  const schemaErrors = validateSchema(output);
  const relevance = scoreRelevance(input, output);
  const hallucination = detectHallucination(output);
  const safety = checkSafety(output);

  const allFlags = [...schemaErrors, ...relevance.flags, ...hallucination.flags, ...safety.violations];

  let overallScore = 10;
  if (schemaErrors.length > 0) overallScore -= Math.min(4, schemaErrors.length);
  overallScore -= (10 - relevance.score);
  if (hallucination.level === 'high') overallScore -= 3;
  else if (hallucination.level === 'medium') overallScore -= 1.5;
  if (!safety.safe) overallScore -= 4;
  overallScore = Math.max(0, Math.min(10, overallScore));
  overallScore = Math.round(overallScore * 10) / 10;

  let action: 'publish' | 'review' | 'regenerate' | 'block';
  if (!safety.safe) action = 'block';
  else if (schemaErrors.length > 3) action = 'regenerate';
  else if (overallScore < 5) action = 'regenerate';
  else if (overallScore < 7) action = 'review';
  else action = 'publish';

  return {
    passed: action === 'publish' || action === 'review',
    overallScore,
    schemaValid: schemaErrors.length === 0,
    relevanceScore: relevance.score,
    hallucinationLevel: hallucination.level,
    isSafe: safety.safe,
    allFlags,
    action,
  };
}
