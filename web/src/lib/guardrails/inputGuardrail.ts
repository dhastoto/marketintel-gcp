/**
 * LAPIS 1: INPUT GUARDRAIL — Validasi, content filtering, business logic
 */

// ===== 1A. BLACKLISTED KEYWORDS & PATTERNS =====
const BLACKLISTED_KEYWORDS = [
  // Konten berbahaya / ilegal
  "narkoba", "narkotika", "ganja", "sabu", "ekstasi",
  "senjata", "bom", "racun", "pembunuhan",
  "judi", "togel", "slot online", "casino",
  "prostitusi", "esek-esek", "psk",
  "penipuan", "skema ponzi", "money game",
  "terorisme", "radikalisme",
  // Prompt injection attempts
  "ignore previous", "abaikan instruksi", "forget your instructions",
  "you are now", "kamu sekarang adalah", "act as",
  "bypass", "override", "jailbreak",
  "system prompt", "reveal your prompt",
  "DAN mode", "developer mode",
  // Off-topic
  "cara hack", "cara meretas", "exploit",
  "cara membuat virus", "malware",
];

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?previous/i,
  /abaikan\s+(semua\s+)?instruksi/i,
  /you\s+are\s+now\s+a/i,
  /kamu\s+sekarang\s+(adalah|jadi)/i,
  /\bsystem\s*prompt\b/i,
  /\bDAN\s*mode\b/i,
  /```[\s\S]*?system[\s\S]*?```/i,
  /<\/?[a-z][\s\S]*?>/i,
];

// ===== TYPES =====
export interface BusinessInputData {
  product_name: string;
  product_category: string;
  product_description?: string | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  unique_selling_point?: string | null;
  business_scale?: string | null;
  monthly_budget?: number | null;
  target_age_min?: number | null;
  target_age_max?: number | null;
  target_gender?: string | null;
  target_segments?: string[] | null;
  province: string;
  city: string;
  districts: string[];
  specific_locations?: string | null;
  known_competitors?: string | null;
}

export interface InputGuardrailResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
}

// ===== 1A. FORMAT VALIDATION =====
function validateFormat(input: BusinessInputData): string[] {
  const errors: string[] = [];

  if (!input.product_name || input.product_name.trim().length < 3) {
    errors.push("Nama produk minimal 3 karakter");
  }
  if (input.product_name && input.product_name.length > 100) {
    errors.push("Nama produk maksimal 100 karakter");
  }
  if (!input.product_category) {
    errors.push("Kategori produk wajib dipilih");
  }
  if (!input.city || !input.province) {
    errors.push("Kota dan provinsi wajib diisi");
  }
  if (!input.districts || input.districts.length === 0) {
    errors.push("Minimal 1 kecamatan harus dipilih");
  }
  if (input.districts && input.districts.length > 10) {
    errors.push("Maksimal 10 kecamatan per analisis");
  }
  if (input.target_age_min != null && (input.target_age_min < 10 || input.target_age_min > 70)) {
    errors.push("Usia target minimum harus antara 10-70 tahun");
  }
  if (input.target_age_max != null && input.target_age_min != null && input.target_age_max < input.target_age_min) {
    errors.push("Usia maksimum harus lebih besar dari minimum");
  }
  if (input.price_range_min != null && input.price_range_min < 0) {
    errors.push("Harga tidak boleh negatif");
  }
  if (input.price_range_max != null && input.price_range_max > 100000000) {
    errors.push("Harga maksimal Rp 100.000.000");
  }
  if (input.product_description && input.product_description.length > 500) {
    errors.push("Deskripsi produk maksimal 500 karakter");
  }
  if (input.unique_selling_point && input.unique_selling_point.length > 500) {
    errors.push("USP maksimal 500 karakter");
  }

  return errors;
}

// ===== 1B. CONTENT FILTERING =====
function filterContent(input: BusinessInputData): { flagged: string[]; severity: 'none' | 'low' | 'medium' | 'high' } {
  const fieldsToCheck = [
    { name: 'product_name', value: input.product_name },
    { name: 'product_description', value: input.product_description },
    { name: 'unique_selling_point', value: input.unique_selling_point },
    { name: 'known_competitors', value: input.known_competitors },
    { name: 'specific_locations', value: input.specific_locations },
  ];

  const flagged: string[] = [];
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

  for (const field of fieldsToCheck) {
    if (!field.value) continue;
    const lower = field.value.toLowerCase();

    for (const keyword of BLACKLISTED_KEYWORDS) {
      if (lower.includes(keyword.toLowerCase())) {
        flagged.push(`${field.name}: mengandung kata terlarang "${keyword}"`);
        severity = 'high';
      }
    }

    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.test(field.value)) {
        flagged.push(`${field.name}: terdeteksi pola mencurigakan (prompt injection)`);
        severity = 'high';
      }
    }
  }

  return { flagged, severity };
}

// ===== 1C. BUSINESS LOGIC VALIDATION =====
function validateBusinessLogic(input: BusinessInputData): string[] {
  const warnings: string[] = [];

  if (input.product_category === 'makanan_minuman') {
    if (input.price_range_max && input.price_range_max > 5000000) {
      warnings.push("Harga makanan/minuman di atas Rp 5 juta — apakah ini benar?");
    }
    if (input.price_range_min != null && input.price_range_min < 1000) {
      warnings.push("Harga di bawah Rp 1.000 — apakah ini benar?");
    }
  }

  if (input.target_age_min != null && input.target_age_min < 10 && input.target_segments?.includes('karyawan')) {
    warnings.push("Target karyawan dengan usia minimum di bawah 10 tahun tidak logis");
  }

  if (input.business_scale === 'rumahan' && input.monthly_budget && input.monthly_budget > 50000000) {
    warnings.push("Budget Rp 50 juta+ tidak umum untuk skala rumahan");
  }

  return warnings;
}

// ===== MAIN GUARDRAIL =====
export function runInputGuardrail(input: BusinessInputData): InputGuardrailResult {
  const formatErrors = validateFormat(input);
  const contentFilter = filterContent(input);
  const businessWarnings = validateBusinessLogic(input);

  const allErrors = [...formatErrors, ...contentFilter.flagged];
  const passed = allErrors.length === 0;

  return {
    passed,
    errors: allErrors,
    warnings: businessWarnings,
    severity: contentFilter.severity,
  };
}
