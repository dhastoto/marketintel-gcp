interface BusinessInput {
  product_name: string;
  product_category: string;
  product_description?: string;
  price_range_min?: number;
  price_range_max?: number;
  unique_selling_point?: string;
  business_scale?: string;
  monthly_budget?: number;
  target_age_min: number;
  target_age_max: number;
  target_gender: string;
  target_segments?: string[];
  province: string;
  city: string;
  districts: string[];
  specific_locations?: string;
  known_competitors?: string;
}

export function generateMockAnalysis(input: BusinessInput) {
  const districtList = input.districts.join(", ");
  const priceRange = `Rp${(input.price_range_min || 0).toLocaleString('id-ID')}-${(input.price_range_max || 0).toLocaleString('id-ID')}`;

  const executiveSummary = {
    main_opportunity: `Demand ${input.product_name} di area ${districtList} sangat tinggi dengan kompetisi yang masih terbuka. Segmen ${input.target_gender === 'semua' ? 'pria dan wanita' : input.target_gender} usia ${input.target_age_min}-${input.target_age_max} tahun menunjukkan ketertarikan tinggi pada kategori ${input.product_category}.`,
    main_threat: `Kompetitor established dan perang harga di rentang ${priceRange} bisa menggerus margin. Perlu diferensiasi kuat melalui kualitas dan branding.`,
    recommendation_score: (Math.random() * 2 + 7).toFixed(1),
    urgent_actions: [
      `Survey lapangan di ${input.districts[0]} pada jam 17.00-19.00 untuk validasi traffic`,
      `Riset harga bahan baku ${input.product_name} di 3 supplier terdekat`,
      `Siapkan foto produk berkualitas tinggi untuk konten marketing pertama`,
      `Buat akun media sosial khusus bisnis dan posting 3 konten perdana`,
      `Hubungi 5 calon pelanggan potensial untuk validasi produk`,
    ],
  };

  const demographicAnalysis = {
    total_population_estimate: Math.floor(Math.random() * 500000 + 100000),
    target_population_estimate: Math.floor(Math.random() * 100000 + 20000),
    age_distribution: [
      { range: "12-17", percentage: 15, label: "Remaja" },
      { range: "18-24", percentage: 28, label: "Dewasa Muda" },
      { range: "25-34", percentage: 32, label: "Produktif Awal" },
      { range: "35-45", percentage: 25, label: "Produktif Mapan" },
    ],
    income_levels: [
      { level: "< 3 Juta", percentage: 20 },
      { level: "3-5 Juta", percentage: 35 },
      { level: "5-10 Juta", percentage: 30 },
      { level: "> 10 Juta", percentage: 15 },
    ],
    key_insight: `Area ${districtList} memiliki populasi produktif yang tinggi dengan daya beli menengah. Cocok untuk produk ${input.product_category} di rentang harga ${priceRange}.`,
  };

  const psychographicAnalysis = {
    buying_window_lunch: { time: "11.30 - 13.30", description: `Jam istirahat kantor & sekolah. Target utama: karyawan dan ${(input.target_segments || []).includes('mahasiswa') ? 'mahasiswa' : 'pelajar'} yang mencari ${input.product_name} cepat saji.` },
    buying_window_evening: { time: "17.00 - 20.00", description: `Jam pulang kerja & quality time keluarga. Demand tertinggi untuk ${input.product_name} sebagai treat setelah beraktivitas.` },
    primary_trigger: {
      quote: `"Saya mau yang enak, terjangkau, dan bisa langsung dinikmati tanpa antri lama."`,
      explanation: `Target market Anda sangat price-sensitive namun tetap mengutamakan kualitas. Kecepatan pelayanan dan kemudahan akses menjadi faktor penentu.`,
    },
    segments: (input.target_segments || ["karyawan", "mahasiswa"]).map((seg) => ({
      name: seg === "karyawan" ? "Karyawan Kantoran" : seg === "mahasiswa" ? "Mahasiswa" : seg === "pelajar" ? "Pelajar" : seg === "ibu_rumah_tangga" ? "Ibu Rumah Tangga" : seg === "freelancer" ? "Freelancer" : seg === "pengusaha" ? "Pengusaha" : "Komunitas",
      emoji: seg === "karyawan" ? "👔" : seg === "mahasiswa" ? "🎓" : seg === "pelajar" ? "📚" : seg === "ibu_rumah_tangga" ? "👩‍👧" : seg === "freelancer" ? "💻" : seg === "pengusaha" ? "💼" : "👥",
      trigger: seg === "karyawan" ? "Mencari reward setelah kerja keras" : seg === "mahasiswa" ? "FOMO dari teman yang sudah coba" : seg === "pelajar" ? "Jajan yang instagramable" : "Rekomendasi dari circle terdekat",
      peak_time: seg === "karyawan" ? "17.00-19.00" : seg === "mahasiswa" ? "12.00-14.00" : seg === "pelajar" ? "15.00-17.00" : "10.00-12.00",
    })),
  };

  const irresistibleOffer = {
    banner: `🔥 PROMO GRAND OPENING! ${input.product_name.toUpperCase()} HANYA ${priceRange} — GRATIS Topping Premium untuk 50 Pembeli Pertama! 🔥`,
    whatsapp: `Hai kak! 😊\n\nAda kabar gembira nih! *${input.product_name}* sekarang hadir di ${input.city}! 🎉\n\nKhusus minggu ini:\n✅ *DISKON 20%* untuk semua varian\n✅ *GRATIS ongkir* area ${input.districts[0]}\n✅ *Bonus topping* untuk pembelian pertama\n\nYuk langsung order sebelum kehabisan! 🔥\n\nPesan sekarang: wa.me/62xxx`,
  };

  // Generate 8-10 candidate locations (system will pick top 3 by data-driven score)
  const locationVariants = ["Depan Mall", "Dekat Kampus", "Jalan Utama", "Area Perkantoran", "Dekat Stasiun", "Perempatan", "Area Kuliner", "Pinggir Jalan Raya", "Dekat Pasar", "Area Perumahan"];
  const locations = input.districts.flatMap((district, di) =>
    locationVariants.slice(0, Math.ceil(10 / input.districts.length)).map((variant, vi) => ({
      location_name: `${variant} ${district}`,
      district,
      score: parseFloat((7 + Math.random() * 2.5).toFixed(1)),
      lat: -6.2 + di * 0.02 + vi * 0.005 + Math.random() * 0.01,
      lng: 106.8 + di * 0.02 + vi * 0.005 + Math.random() * 0.01,
      strengths: [
        "Traffic tinggi jam pulang kerja/sekolah",
        "Dekat pusat keramaian (sekolah/kampus/perkantoran)",
        "Akses parkir memadai",
        "Visibilitas lokasi baik dari jalan utama",
      ].slice(0, 2 + Math.floor(Math.random() * 3)),
      weaknesses: [
        "Kompetitor terdekat sudah punya pelanggan loyal",
        "Harga sewa relatif tinggi",
        "Area parkir terbatas di jam sibuk",
      ].slice(0, 1 + Math.floor(Math.random() * 2)),
      innovations: [
        `Jaminan ${input.product_name} fresh — ganti baru jika tidak puas`,
        "Pre-order via WhatsApp, siap ambil tanpa antri",
        "Kemasan premium & instagramable design",
      ].slice(0, 3),
      is_blind_spot: false,
      blind_spot_reason: null as string | null,
      rank: di * locationVariants.length + vi + 1,
    }))
  );

  // Add 2 blind spots
  const blindSpots = [
    {
      location_name: `Area Pinggiran ${input.districts[0]}`,
      district: input.districts[0],
      score: 3.2,
      lat: -6.2 + Math.random() * 0.1,
      lng: 106.8 + Math.random() * 0.1,
      strengths: [],
      weaknesses: ["Traffic sangat rendah", "Daya beli masyarakat terbatas"],
      innovations: [],
      is_blind_spot: true,
      blind_spot_reason: "Traffic pejalan kaki dan kendaraan sangat rendah. Tidak ada anchor tenant yang menarik pengunjung. Daya beli masyarakat sekitar di bawah target price point.",
      rank: null as number | null,
    },
    {
      location_name: `Zona Industri ${input.city}`,
      district: input.districts[input.districts.length > 1 ? 1 : 0],
      score: 2.8,
      lat: -6.2 + Math.random() * 0.1,
      lng: 106.8 + Math.random() * 0.1,
      strengths: [],
      weaknesses: ["Hanya ramai saat shift pabrik", "Mayoritas pekerja sudah bawa bekal"],
      innovations: [],
      is_blind_spot: true,
      blind_spot_reason: "Area didominasi kawasan industri dengan jam operasional terbatas. Pekerja cenderung membawa bekal dan tidak keluar area pabrik saat istirahat.",
      rank: null as number | null,
    },
  ];

  const actionPlan = {
    daily_actions: [
      { day: "Hari 1-3", tasks: ["Survey lokasi target", "Foto dokumentasi area", "Hitung traffic pengunjung"] },
      { day: "Hari 4-7", tasks: ["Finalisasi lokasi", "Negosiasi sewa/izin", "Order bahan baku pertama"] },
      { day: "Hari 8-14", tasks: ["Setup tempat usaha", "Test menu/produk", "Rekrut helper (jika perlu)"] },
      { day: "Hari 15-21", tasks: ["Soft opening (friends & family)", "Minta feedback & perbaiki", "Buat konten sosmed"] },
      { day: "Hari 22-30", tasks: ["Grand opening dengan promo", "Push marketing WhatsApp & IG", "Evaluasi penjualan minggu pertama"] },
    ],
    weekly_kpi: [
      { metric: "Jumlah transaksi harian", target: "15-25 transaksi" },
      { metric: "Rating pelanggan", target: "> 4.5/5.0" },
      { metric: "Repeat customer rate", target: "> 30%" },
      { metric: "Engagement sosmed", target: "> 100 interaksi/minggu" },
    ],
  };

  return {
    executiveSummary,
    demographicAnalysis,
    psychographicAnalysis,
    irresistibleOffer,
    actionPlan,
    locations: [...locations, ...blindSpots],
  };
}
