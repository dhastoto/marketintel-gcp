// ============================================================
// CATEGORY-SPECIFIC ESTIMATION PARAMETERS
// Setiap kategori memiliki perilaku konsumen yang sangat berbeda
// ============================================================

export type CategoryKey =
  | 'makanan_minuman'
  | 'fashion_aksesoris'
  | 'jasa_layanan'
  | 'elektronik_gadget'
  | 'kecantikan_kesehatan'
  | 'pertanian_peternakan'
  | 'pendidikan_kursus'
  | 'grocery'
  | 'otomotif'
  | 'kesehatan'
  | 'default';

export interface CategoryParams {
  key: CategoryKey;
  label: string;
  /** Metode estimasi utama */
  method: 'traffic_conversion' | 'market_share' | 'capacity_utilization' | 'market_penetration' | 'repeat_order' | 'seasonal_yield' | 'enrollment';
  /** Apakah barang tahan lama (durable) */
  isDurable: boolean;
  /** Siklus penggantian dalam tahun (hanya untuk durable) */
  replacementCycleYears: number;
  /** Frekuensi beli per tahun (untuk non-durable) */
  purchaseFrequencyPerYear: number;
  /** % populasi yang jadi target pasar */
  targetMarketRatio: Record<string, number>; // by location_type
  /** % konversi dari traffic */
  conversionRate: Record<string, number>; // by location_type
  /** % pengeluaran kategori dari income */
  categorySpendingRatio: Record<string, number>; // by income_level
  /** Fokus data utama */
  primaryDataFocus: string;
  /** Kunci keberhasilan UMKM */
  successKey: string;
  /** Pareto rule: % omset dari produk unggulan */
  paretoTopProductRevenuePct: number;
  /** Multiplier konversi berdasarkan affordability (untuk barang mahal) */
  affordabilityConversionAdjust: boolean;
}

// ============================================================
// PARAMETER DEFINITIONS PER CATEGORY
// ============================================================

const CATEGORY_PARAMS: Record<CategoryKey, CategoryParams> = {
  makanan_minuman: {
    key: 'makanan_minuman',
    label: 'Makanan & Minuman',
    method: 'traffic_conversion',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 365, // bisa beli tiap hari
    targetMarketRatio: { rural: 0.05, residential: 0.08, urban: 0.12, cbd: 0.15 },
    conversionRate: { rural: 0.03, residential: 0.05, urban: 0.07, cbd: 0.10 },
    categorySpendingRatio: { low: 0.03, middle: 0.04, high: 0.05 },
    primaryDataFocus: 'Trafik & Kepadatan Penduduk',
    successKey: 'Kecepatan layanan & rasa',
    paretoTopProductRevenuePct: 0.8,
    affordabilityConversionAdjust: false,
  },

  fashion_aksesoris: {
    key: 'fashion_aksesoris',
    label: 'Fashion & Aksesoris',
    method: 'market_share',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 4, // ~3-4x setahun
    targetMarketRatio: { rural: 0.02, residential: 0.04, urban: 0.06, cbd: 0.08 },
    conversionRate: { rural: 0.01, residential: 0.02, urban: 0.03, cbd: 0.04 },
    categorySpendingRatio: { low: 0.01, middle: 0.02, high: 0.04 },
    primaryDataFocus: 'Kompetitor & Tren',
    successKey: 'Keunikan desain & display toko',
    paretoTopProductRevenuePct: 0.7,
    affordabilityConversionAdjust: true,
  },

  jasa_layanan: {
    key: 'jasa_layanan',
    label: 'Jasa & Layanan',
    method: 'capacity_utilization',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 12, // ~bulanan
    targetMarketRatio: { rural: 0.02, residential: 0.05, urban: 0.08, cbd: 0.10 },
    conversionRate: { rural: 0.02, residential: 0.03, urban: 0.05, cbd: 0.07 },
    categorySpendingRatio: { low: 0.01, middle: 0.02, high: 0.03 },
    primaryDataFocus: 'Kepadatan & Lokasi',
    successKey: 'Kepercayaan & kualitas SDM',
    paretoTopProductRevenuePct: 0.6,
    affordabilityConversionAdjust: false,
  },

  elektronik_gadget: {
    key: 'elektronik_gadget',
    label: 'Elektronik & Gadget',
    method: 'market_penetration',
    isDurable: true,
    replacementCycleYears: 2.5,
    purchaseFrequencyPerYear: 0.4, // 1x per 2.5 tahun
    targetMarketRatio: { rural: 0.01, residential: 0.02, urban: 0.03, cbd: 0.04 },
    conversionRate: { rural: 0.002, residential: 0.004, urban: 0.006, cbd: 0.008 },
    categorySpendingRatio: { low: 0.005, middle: 0.01, high: 0.02 },
    primaryDataFocus: 'Pendapatan per Kapita',
    successKey: 'Garansi & ketersediaan stok',
    paretoTopProductRevenuePct: 0.8,
    affordabilityConversionAdjust: true,
  },

  kecantikan_kesehatan: {
    key: 'kecantikan_kesehatan',
    label: 'Kecantikan & Kesehatan',
    method: 'repeat_order',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 12, // bulanan (repeat order)
    targetMarketRatio: { rural: 0.02, residential: 0.04, urban: 0.06, cbd: 0.08 },
    conversionRate: { rural: 0.02, residential: 0.03, urban: 0.04, cbd: 0.06 },
    categorySpendingRatio: { low: 0.01, middle: 0.025, high: 0.04 },
    primaryDataFocus: 'Loyalitas & Pendapatan',
    successKey: 'Repeat order & kualitas produk',
    paretoTopProductRevenuePct: 0.7,
    affordabilityConversionAdjust: true,
  },

  pertanian_peternakan: {
    key: 'pertanian_peternakan',
    label: 'Pertanian & Peternakan',
    method: 'seasonal_yield',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 52, // mingguan (sayur, telur, dll)
    targetMarketRatio: { rural: 0.08, residential: 0.06, urban: 0.04, cbd: 0.03 },
    conversionRate: { rural: 0.04, residential: 0.03, urban: 0.02, cbd: 0.02 },
    categorySpendingRatio: { low: 0.04, middle: 0.03, high: 0.02 },
    primaryDataFocus: 'Musim & Luas Area',
    successKey: 'Distribusi & efisiensi biaya',
    paretoTopProductRevenuePct: 0.6,
    affordabilityConversionAdjust: false,
  },

  pendidikan_kursus: {
    key: 'pendidikan_kursus',
    label: 'Pendidikan & Kursus',
    method: 'enrollment',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 12, // SPP bulanan
    targetMarketRatio: { rural: 0.02, residential: 0.04, urban: 0.05, cbd: 0.06 },
    conversionRate: { rural: 0.01, residential: 0.02, urban: 0.03, cbd: 0.04 },
    categorySpendingRatio: { low: 0.01, middle: 0.02, high: 0.03 },
    primaryDataFocus: 'Populasi Usia Sekolah',
    successKey: 'Akreditasi & testimoni alumni',
    paretoTopProductRevenuePct: 0.5,
    affordabilityConversionAdjust: false,
  },

  grocery: {
    key: 'grocery',
    label: 'Grocery & Kebutuhan Harian',
    method: 'traffic_conversion',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 104, // 2x seminggu
    targetMarketRatio: { rural: 0.06, residential: 0.10, urban: 0.12, cbd: 0.10 },
    conversionRate: { rural: 0.04, residential: 0.06, urban: 0.08, cbd: 0.07 },
    categorySpendingRatio: { low: 0.05, middle: 0.04, high: 0.03 },
    primaryDataFocus: 'Kepadatan Penduduk & Household',
    successKey: 'Kelengkapan stok & harga kompetitif',
    paretoTopProductRevenuePct: 0.6,
    affordabilityConversionAdjust: false,
  },

  otomotif: {
    key: 'otomotif',
    label: 'Otomotif & Sparepart',
    method: 'market_penetration',
    isDurable: true,
    replacementCycleYears: 3,
    purchaseFrequencyPerYear: 0.33,
    targetMarketRatio: { rural: 0.01, residential: 0.02, urban: 0.03, cbd: 0.03 },
    conversionRate: { rural: 0.002, residential: 0.004, urban: 0.005, cbd: 0.006 },
    categorySpendingRatio: { low: 0.005, middle: 0.01, high: 0.015 },
    primaryDataFocus: 'Jumlah Kendaraan & Pendapatan',
    successKey: 'Ketersediaan sparepart & kepercayaan',
    paretoTopProductRevenuePct: 0.7,
    affordabilityConversionAdjust: true,
  },

  kesehatan: {
    key: 'kesehatan',
    label: 'Kesehatan & Farmasi',
    method: 'repeat_order',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 12,
    targetMarketRatio: { rural: 0.03, residential: 0.05, urban: 0.07, cbd: 0.08 },
    conversionRate: { rural: 0.02, residential: 0.03, urban: 0.04, cbd: 0.05 },
    categorySpendingRatio: { low: 0.02, middle: 0.025, high: 0.03 },
    primaryDataFocus: 'Populasi & Akses Kesehatan',
    successKey: 'Kepercayaan & kelengkapan obat',
    paretoTopProductRevenuePct: 0.6,
    affordabilityConversionAdjust: false,
  },

  default: {
    key: 'default',
    label: 'Umum',
    method: 'traffic_conversion',
    isDurable: false,
    replacementCycleYears: 0,
    purchaseFrequencyPerYear: 52,
    targetMarketRatio: { rural: 0.02, residential: 0.04, urban: 0.06, cbd: 0.08 },
    conversionRate: { rural: 0.02, residential: 0.03, urban: 0.04, cbd: 0.05 },
    categorySpendingRatio: { low: 0.01, middle: 0.02, high: 0.03 },
    primaryDataFocus: 'Trafik & Populasi',
    successKey: 'Lokasi strategis & harga kompetitif',
    paretoTopProductRevenuePct: 0.7,
    affordabilityConversionAdjust: false,
  },
};

// ============================================================
// KEYWORD → CATEGORY MAPPING
// ============================================================

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: CategoryKey }> = [
  {
    keywords: [
      'makanan', 'minuman', 'kuliner', 'resto', 'restoran', 'cafe', 'kafe',
      'warung', 'kedai', 'bakso', 'mie', 'nasi', 'kue', 'roti', 'snack',
      'jajanan', 'gorengan', 'es', 'juice', 'kopi', 'tea', 'bubble',
      'catering', 'steak', 'pizza', 'burger', 'ayam', 'sate', 'soto',
      'martabak', 'pancong', 'tahu', 'tempe', 'bumbu', 'sambal',
      'frozen', 'food', 'beverage',
    ],
    category: 'makanan_minuman',
  },
  {
    keywords: [
      'fashion', 'baju', 'pakaian', 'celana', 'rok', 'jaket', 'sepatu',
      'sandal', 'tas', 'aksesoris', 'jam', 'kacamata', 'topi', 'kaos',
      'kemeja', 'dress', 'batik', 'hijab', 'jilbab', 'kerudung', 'distro',
      'boutique', 'butik', 'clothing', 'apparel', 'garment',
    ],
    category: 'fashion_aksesoris',
  },
  {
    keywords: [
      'jasa', 'layanan', 'service', 'servis', 'bengkel', 'laundry',
      'salon', 'barbershop', 'pangkas', 'cukur', 'cuci', 'rental',
      'sewa', 'fotocopy', 'printing', 'percetakan', 'reparasi',
      'kontraktor', 'cleaning', 'kurir', 'ekspedisi', 'travel',
    ],
    category: 'jasa_layanan',
  },
  {
    keywords: [
      'elektronik', 'hp', 'handphone', 'gadget', 'komputer', 'laptop',
      'komponen', 'spare_part', 'televisi', 'tv', 'kamera', 'audio',
      'speaker', 'printer', 'scanner', 'konter', 'counter', 'cell',
      'phone', 'tablet', 'ipad', 'smartphone', 'charger', 'accessories',
      'aksesoris_hp', 'casing', 'earphone', 'headphone',
    ],
    category: 'elektronik_gadget',
  },
  {
    keywords: [
      'kecantikan', 'kosmetik', 'skincare', 'beauty', 'makeup', 'perawatan',
      'spa', 'facial', 'kesehatan', 'apotek', 'obat', 'herbal',
      'supplement', 'vitamin', 'parfum', 'bodycare', 'haircare',
    ],
    category: 'kecantikan_kesehatan',
  },
  {
    keywords: [
      'pertanian', 'peternakan', 'tani', 'ternak', 'pupuk', 'bibit',
      'benih', 'pestisida', 'pakan', 'unggas', 'sapi', 'kambing',
      'ayam_petelur', 'ayam_potong', 'ikan_hias', 'aquaculture',
      'hidroponik', 'organik', 'agribisnis',
      'sayur', 'buah', 'daging', 'ikan', 'seafood', 'beras', 'telur',
      'susu_segar', 'rempah', 'palawija', 'hasil_bumi',
    ],
    category: 'pertanian_peternakan',
  },
  {
    keywords: [
      'pendidikan', 'kursus', 'les', 'bimbel', 'bimbingan', 'sekolah',
      'pelatihan', 'training', 'workshop', 'seminar', 'edukasi',
      'tutor', 'mengajar', 'privat', 'akademi',
    ],
    category: 'pendidikan_kursus',
  },
  {
    keywords: [
      'grocery', 'toko kelontong', 'warung sembako', 'minimarket',
      'sembako', 'kebutuhan harian', 'daily needs', 'convenience',
    ],
    category: 'grocery',
  },
  {
    keywords: [
      'otomotif', 'mobil', 'motor', 'sparepart', 'onderdil', 'aki',
      'ban', 'oli', 'knalpot', 'velg', 'variasi', 'modifikasi',
      'dealer', 'showroom',
    ],
    category: 'otomotif',
  },
];

// Direct key mapping from form values to CategoryKey
const DIRECT_KEY_MAP: Record<string, CategoryKey> = {
  makanan_minuman: 'makanan_minuman',
  fashion: 'fashion_aksesoris',
  jasa: 'jasa_layanan',
  elektronik: 'elektronik_gadget',
  kecantikan: 'kecantikan_kesehatan',
  pertanian: 'pertanian_peternakan',
  pendidikan: 'pendidikan_kursus',
  grocery: 'grocery',
  otomotif: 'otomotif',
  kesehatan: 'kesehatan',
};

// ============================================================
// RESOLVE CATEGORY FROM USER INPUT
// ============================================================

export function resolveCategory(productCategory: string, productName?: string): CategoryKey {
  // Direct key match first (from form select values)
  const directMatch = DIRECT_KEY_MAP[productCategory];
  if (directMatch) return directMatch;

  const input = `${productCategory} ${productName || ''}`.toLowerCase().replace(/[\s\-_]+/g, ' ');

  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      if (input.includes(kw)) return category;
    }
  }

  return 'default';
}

export function getCategoryParams(categoryKey: CategoryKey): CategoryParams {
  return CATEGORY_PARAMS[categoryKey] || CATEGORY_PARAMS.default;
}

export function resolveCategoryParams(productCategory: string, productName?: string): CategoryParams {
  const key = resolveCategory(productCategory, productName);
  return getCategoryParams(key);
}

export { CATEGORY_PARAMS };
