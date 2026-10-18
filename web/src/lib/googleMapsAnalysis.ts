import { supabase } from "@/integrations/supabase/client";

export interface Competitor {
  name: string;
  rating: number;
  totalReviews: number;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  reviews: Array<{
    author: string;
    rating: number;
    text: string;
    time: string;
  }>;
}

export interface TrafficInfo {
  district: string;
  peakHours: Array<{ time: string; level: string; description: string }>;
  overallTrafficLevel: string;
}

export async function searchCompetitors(
  query: string,
  lat: number,
  lng: number,
  radius?: number,
  city?: string,
  district?: string,
  productName?: string
): Promise<{ success: boolean; competitors?: Competitor[]; error?: string }> {
  const { data, error } = await supabase.functions.invoke("google-maps-analysis", {
    body: {
      action: "search_competitors",
      params: { query, lat, lng, radius, city, district, productName },
    },
  });

  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true, competitors: data.competitors };
}

export async function getTrafficData(
  origins: Array<{ lat: number; lng: number; label: string }>,
  city: string
): Promise<{ success: boolean; traffic?: TrafficInfo[]; error?: string }> {
  const { data, error } = await supabase.functions.invoke("google-maps-analysis", {
    body: {
      action: "get_traffic_data",
      params: { origins, city },
    },
  });

  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true, traffic: data.traffic };
}

export async function checkGoogleMapsApiKey(): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke("google-maps-analysis", {
      body: { action: "check_api_key", params: {} },
    });
    return !!data?.available;
  } catch {
    return false;
  }
}
