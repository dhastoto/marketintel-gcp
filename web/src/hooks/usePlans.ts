// DEPRECATED: Sistem plans/kredit lama sudah diganti dengan products & user_purchases.
// File di-stub agar build tidak error. Akan dihapus setelah Step 3 (rewrite /harga).
import { useQuery } from "@tanstack/react-query";

export interface Plan {
  id: string;
  plan_key: string;
  name: string;
  price: number;
  price_display: string;
  period: string;
  description: string;
  credits_label: string;
  credits_amount: number;
  features: string[];
  not_included: string[];
  color: string;
  icon: string;
  button_text: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  discount_percent: number;
  discount_label: string;
}

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ["plans-deprecated"],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}
