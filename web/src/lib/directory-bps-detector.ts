export interface DetectionResult {
  isFood: boolean;
  kelompok: string | null;
  kelompokLabel: string | null;
}

const FOOD_RULES: { keywords: string[]; kelompok: string; label: string }[] = [
  {
    keywords: ['daging', 'sapi', 'kambing', 'babi', 'frozen food', 'ayam', 'broiler', 'poultry', 'protein hewani'],
    kelompok: 'daging',
    label: 'Daging & Protein Hewani',
  },
  {
    keywords: ['ikan', 'seafood', 'udang', 'cumi', 'kepiting', 'lele', 'tuna', 'bandeng', 'gurami', 'kakap'],
    kelompok: 'ikan_udang',
    label: 'Ikan & Udang',
  },
  {
    keywords: ['telur', 'susu', 'yogurt', 'keju', 'dairy', 'cream'],
    kelompok: 'telur_susu',
    label: 'Telur & Susu',
  },
  {
    keywords: ['beras', 'mie', 'mi ayam', 'tepung', 'singkong', 'ubi', 'kentang', 'jagung', 'sagu'],
    kelompok: 'padi_umbi',
    label: 'Padi, Umbi & Karbohidrat',
  },
  {
    keywords: ['minyak goreng', 'minyak sawit', 'minyak kelapa', 'margarin', 'shortening', 'minyak'],
    kelompok: 'minyak_lemak',
    label: 'Minyak & Lemak',
  },
  {
    keywords: ['bumbu', 'sambal', 'kecap', 'saus', 'bawang', 'cabai', 'merica', 'rempah', 'kunyit', 'jahe', 'lengkuas'],
    kelompok: 'bumbu',
    label: 'Bumbu-bumbuan',
  },
  {
    keywords: ['gula', 'sirup', 'garam', 'cuka', 'pemanis', 'coklat', 'vanili'],
    kelompok: 'bahan_lainnya',
    label: 'Bahan Makanan Lainnya',
  },
  {
    keywords: ['kacang', 'tempe', 'tahu', 'kedelai', 'oncom', 'edamame'],
    kelompok: 'kacang',
    label: 'Kacang-kacangan',
  },
  {
    keywords: ['sayur', 'kangkung', 'bayam', 'wortel', 'tomat', 'kubis', 'buncis', 'terong', 'labu'],
    kelompok: 'sayur',
    label: 'Sayuran',
  },
  {
    keywords: ['buah', 'pisang', 'mangga', 'jeruk', 'apel', 'pepaya', 'melon', 'semangka', 'anggur', 'strawberry'],
    kelompok: 'buah',
    label: 'Buah-buahan',
  },
  {
    keywords: [
      'kopi', 'teh', 'minuman', 'jus', 'soda', 'snack', 'keripik', 'kue', 'roti',
      'bakeri', 'makanan jadi', 'catering', 'olahan', 'instan', 'rtd', 'biskuit',
    ],
    kelompok: 'makanan_minuman_jadi',
    label: 'Makanan & Minuman Jadi',
  },
];

const NON_FOOD_KEYWORDS = [
  'elektronik', 'gadget', 'hp', 'handphone', 'laptop', 'komputer',
  'fashion', 'baju', 'pakaian', 'sepatu', 'tas', 'hijab', 'aksesoris',
  'kosmetik', 'skincare', 'kecantikan', 'parfum',
  'obat', 'apotek', 'farmasi', 'kesehatan',
  'otomotif', 'motor', 'mobil', 'ban', 'sparepart',
  'furniture', 'kursi', 'meja', 'lemari', 'kasur',
  'alat tulis', 'atk', 'mainan', 'alat bangunan', 'cat',
];

export function detectProduct(productName: string): DetectionResult {
  const text = productName.toLowerCase().trim();
  if (!text) return { isFood: false, kelompok: null, kelompokLabel: null };

  if (NON_FOOD_KEYWORDS.some((kw) => text.includes(kw))) {
    return { isFood: false, kelompok: null, kelompokLabel: null };
  }

  for (const rule of FOOD_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return { isFood: true, kelompok: rule.kelompok, kelompokLabel: rule.label };
    }
  }

  return { isFood: false, kelompok: null, kelompokLabel: null };
}
