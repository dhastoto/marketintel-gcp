// ============ KONFIGURASI SCORING ============

// Mapping kategori produk MarketIntel → Google Places types untuk kompetitor
export const PRODUCT_TO_COMPETITOR_TYPES: Record<string, string[]> = {
  'makanan_minuman': ['restaurant', 'food', 'meal_delivery', 'meal_takeaway', 'cafe', 'bakery'],
  'fashion': ['clothing_store', 'shoe_store', 'shopping_mall'],
  'jasa': ['local_service', 'establishment'],
  'elektronik': ['electronics_store', 'mobile_phone_store'],
  'kecantikan': ['beauty_salon', 'hair_care', 'spa'],
  'pertanian': ['farm', 'grocery_store', 'supermarket'],
  'lainnya': ['store', 'establishment'],
};

// Tipe-tipe landmark yang menarik traffic (beserta bobot)
export const LANDMARK_TYPES_WITH_WEIGHTS: Record<string, number> = {
  'school': 0.50,
  'secondary_school': 0.50,
  'university': 0.40,
  'transit_station': 0.40,
  'bus_station': 0.40,
  'train_station': 0.45,
  'supermarket': 0.30,
  'shopping_mall': 0.30,
  'market': 0.35,
  'mosque': 0.20,
  'hospital': 0.10,
  'bank': 0.15,
};

// Tipe "traffic generator" untuk proxy traffic level
export const TRAFFIC_GENERATOR_TYPES: string[] = [
  'school', 'convenience_store', 'bus_station',
  'market', 'shopping_mall', 'bank', 'atm',
  'gas_station', 'pharmacy',
];

// Gabungan traffic generators + landmark types untuk 1 API call (Essentials SKU)
export const COMBINED_NEARBY_TYPES: string[] = [
  // Traffic generators
  'school', 'convenience_store', 'bus_station',
  'market', 'shopping_mall', 'bank', 'atm',
  'gas_station', 'pharmacy',
  // Landmarks (yang belum ada di atas)
  'secondary_school', 'university', 'transit_station',
  'train_station', 'supermarket', 'mosque', 'hospital',
];

// ============ TIPE DATA ============

export interface LocationCandidate {
  label: string;
  district: string;
  latitude: number;
  longitude: number;
}

export interface ScoringConfig {
  radius_meters: number;
  product_category: string;
  competitor_types: string[];
  max_api_calls_per_location: number;
}

export interface ScoreBreakdown {
  competitor_density: {
    score: number;
    raw_count: number;
    competitors: Array<{
      name: string;
      address: string;
      rating: number;
      review_count: number;
      distance_meters: number;
    }>;
    explanation: string;
  };
  rating_gap: {
    score: number;
    avg_rating: number;
    explanation: string;
  };
  traffic_level: {
    score: number;
    traffic_generators: number;
    congestion_ratio: number | null;
    avg_review_volume: number;
    explanation: string;
  };
  landmark_potential: {
    score: number;
    landmark_count: number;
    landmarks: Array<{
      name: string;
      type: string;
      weight: number;
    }>;
    explanation: string;
  };
  total_score: number;
}
