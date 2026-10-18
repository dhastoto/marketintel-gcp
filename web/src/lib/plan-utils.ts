const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Basic",
  pro: "Growth",
  business: "Pro",
};

export const getPlanLabel = (plan?: string | null) => PLAN_LABELS[plan || ""] || "Free";

export const getSidebarPlanLabel = (plan?: string | null) => `${getPlanLabel(plan)} Plan`;

export const formatCreditsDisplay = (plan?: string | null, credits?: number | null) =>
  plan === "free" ? `${credits ?? 0}/1` : `${credits ?? 0} kredit`;

export const isPaidPlan = (plan?: string | null) => ["starter", "pro", "business"].includes(plan || "");

export const hasFullAnalysisAccess = (plan?: string | null) => ["pro", "business"].includes(plan || "");

export const getPlanBadgeClass = (plan?: string | null) => {
  switch (plan) {
    case "starter":
      return "bg-blue-500/10 text-blue-500";
    case "pro":
      return "bg-amber-500/10 text-amber-500";
    case "business":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
};
