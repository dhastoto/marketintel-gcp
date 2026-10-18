// Resep standar untuk estimasi HPP per porsi (gram per porsi)
// Komoditas wajib match nama di tabel commodity_prices

export interface RecipeIngredient {
  komoditas: string; // nama persis di commodity_prices
  gram_per_porsi: number;
  optional?: boolean;
}

export interface RecipeStandard {
  type: string;
  label: string;
  // Keywords business name / kategori untuk auto-detect resep
  keywords: string[];
  ingredients: RecipeIngredient[];
  // Persen biaya tambahan di luar bahan baku (gas, kemasan, listrik per porsi)
  overhead_pct: number;
}

export const RESEP_STANDAR: RecipeStandard[] = [
  {
    type: "daging_sapi",
    label: "Hidangan Daging Sapi (Steak / Sate Maranggi / Rendang / Sop)",
    keywords: ["steak", "rendang", "sop daging", "sapi", "iga", "tongseng", "maranggi", "sate sapi", "sate kambing"],
    ingredients: [
      { komoditas: "Daging Sapi Paha Belakang", gram_per_porsi: 120 },
      { komoditas: "Bawang Merah", gram_per_porsi: 15 },
      { komoditas: "Bawang Putih Honan", gram_per_porsi: 10 },
      { komoditas: "Minyak Goreng Sawit Curah", gram_per_porsi: 20 },
      { komoditas: "Garam Halus", gram_per_porsi: 5 },
    ],
    overhead_pct: 15,
  },
  {
    type: "ayam",
    label: "Hidangan Ayam (Geprek / Goreng / Bakar)",
    keywords: ["ayam", "geprek", "penyet", "bakar"],
    ingredients: [
      { komoditas: "Daging Ayam Ras", gram_per_porsi: 250 },
      { komoditas: "Bawang Merah", gram_per_porsi: 10 },
      { komoditas: "Bawang Putih Honan", gram_per_porsi: 8 },
      { komoditas: "Cabai Rawit Merah", gram_per_porsi: 15, optional: true },
      { komoditas: "Minyak Goreng Sawit Curah", gram_per_porsi: 30 },
      { komoditas: "Tepung Terigu", gram_per_porsi: 50, optional: true },
      { komoditas: "Garam Halus", gram_per_porsi: 4 },
    ],
    overhead_pct: 15,
  },
  {
    type: "nasi_lauk",
    label: "Nasi + Lauk (Warteg / Nasi Padang)",
    keywords: ["nasi", "warteg", "padang", "warung makan", "rames"],
    ingredients: [
      { komoditas: "Beras Medium", gram_per_porsi: 150 },
      { komoditas: "Telur Ayam Ras", gram_per_porsi: 60 },
      { komoditas: "Minyak Goreng Sawit Curah", gram_per_porsi: 15 },
      { komoditas: "Bawang Merah", gram_per_porsi: 8 },
      { komoditas: "Cabai Merah Keriting", gram_per_porsi: 10 },
      { komoditas: "Garam Halus", gram_per_porsi: 3 },
    ],
    overhead_pct: 12,
  },
  {
    type: "ikan",
    label: "Hidangan Ikan",
    keywords: ["ikan", "seafood", "pecel lele", "kembung"],
    ingredients: [
      { komoditas: "Ikan Kembung", gram_per_porsi: 200 },
      { komoditas: "Bawang Merah", gram_per_porsi: 10 },
      { komoditas: "Bawang Putih Honan", gram_per_porsi: 8 },
      { komoditas: "Cabai Merah Keriting", gram_per_porsi: 12 },
      { komoditas: "Minyak Goreng Sawit Curah", gram_per_porsi: 25 },
      { komoditas: "Garam Halus", gram_per_porsi: 4 },
    ],
    overhead_pct: 12,
  },
  {
    type: "gorengan",
    label: "Gorengan / Jajanan / Cemilan Tepung",
    keywords: [
      "gorengan", "jajanan", "tempe", "tahu", "pisang",
      "cilok", "cireng", "cimol", "batagor", "siomay", "siomai",
      "pempek", "mpek", "martabak", "risol", "pastel", "bakwan",
      "combro", "misro", "donat", "kue", "snack", "cemilan",
    ],
    ingredients: [
      { komoditas: "Tepung Terigu", gram_per_porsi: 80 },
      { komoditas: "Minyak Goreng Sawit Curah", gram_per_porsi: 30 },
      { komoditas: "Bawang Putih Honan", gram_per_porsi: 3, optional: true },
      { komoditas: "Cabai Rawit Merah", gram_per_porsi: 5, optional: true },
      { komoditas: "Garam Halus", gram_per_porsi: 2 },
    ],
    overhead_pct: 10,
  },
  {
    type: "mie_bakso",
    label: "Mie / Bakso",
    keywords: ["mie", "bakso", "mi ayam", "bakmi"],
    ingredients: [
      { komoditas: "Tepung Terigu", gram_per_porsi: 100 },
      { komoditas: "Daging Ayam Ras", gram_per_porsi: 80, optional: true },
      { komoditas: "Bawang Putih Honan", gram_per_porsi: 5 },
      { komoditas: "Bawang Merah", gram_per_porsi: 5 },
      { komoditas: "Minyak Goreng Sawit Curah", gram_per_porsi: 10 },
      { komoditas: "Garam Halus", gram_per_porsi: 3 },
    ],
    overhead_pct: 12,
  },
];

export function detectRecipe(productName: string, productCategory?: string): RecipeStandard | null {
  const text = `${productName} ${productCategory || ""}`.toLowerCase();
  for (const recipe of RESEP_STANDAR) {
    if (recipe.keywords.some((kw) => text.includes(kw))) {
      return recipe;
    }
  }
  return null;
}

export function isFnBCategory(category?: string | null): boolean {
  if (!category) return false;
  const c = category.toLowerCase();
  return c.includes("makanan") || c.includes("minuman") || c.includes("kuliner") || c === "f&b" || c === "fnb";
}
