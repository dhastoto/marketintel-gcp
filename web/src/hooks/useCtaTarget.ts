import { useAuth } from "@/contexts/AuthContext";

/**
 * Mengembalikan path tujuan untuk CTA publik.
 * Jika user sudah login, arahkan ke halaman aplikasi yang relevan.
 * Jika belum, arahkan ke /register.
 */
export type CtaIntent = "register" | "analysis" | "food" | "dashboard";

export function useCtaTarget(intent: CtaIntent = "register"): string {
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;

  if (!isLoggedIn) return "/register";

  switch (intent) {
    case "analysis":
      return "/app/analysis/new";
    case "food":
      return "/app/food-opportunity";
    case "dashboard":
    case "register":
    default:
      return "/app/dashboard";
  }
}
