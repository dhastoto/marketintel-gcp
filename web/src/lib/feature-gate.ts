export type InsightLevel = 'summary' | 'standard' | 'detailed' | 'full';

export interface PlanFeatures {
  insight_level: InsightLevel;
  show_all_insights: boolean;
  show_breakdown: boolean;
  show_raw_data: boolean;
  show_wc_analysis: boolean;
  comparison_max: number;
  export_pdf: boolean;
  action_plan_count: number;
  competitor_detail: boolean;
  omzet_range: boolean;
  confidence_badge: boolean;
  bep_detail: boolean;
}

const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    insight_level: 'summary',
    show_all_insights: true,
    show_breakdown: false,
    show_raw_data: false,
    show_wc_analysis: false,
    comparison_max: 0,
    export_pdf: false,
    action_plan_count: 3,
    competitor_detail: false,
    omzet_range: false,
    confidence_badge: false,
    bep_detail: false,
  },
  starter: {
    insight_level: 'standard',
    show_all_insights: true,
    show_breakdown: true,
    show_raw_data: false,
    show_wc_analysis: false,
    comparison_max: 0,
    export_pdf: false,
    action_plan_count: 5,
    competitor_detail: true,
    omzet_range: true,
    confidence_badge: true,
    bep_detail: false,
  },
  pro: {
    insight_level: 'detailed',
    show_all_insights: true,
    show_breakdown: true,
    show_raw_data: false,
    show_wc_analysis: false,
    comparison_max: 3,
    export_pdf: true,
    action_plan_count: 7,
    competitor_detail: true,
    omzet_range: true,
    confidence_badge: true,
    bep_detail: true,
  },
  business: {
    insight_level: 'full',
    show_all_insights: true,
    show_breakdown: true,
    show_raw_data: true,
    show_wc_analysis: true,
    comparison_max: 99,
    export_pdf: true,
    action_plan_count: 10,
    competitor_detail: true,
    omzet_range: true,
    confidence_badge: true,
    bep_detail: true,
  },
};

export function getFeatures(planKey?: string | null): PlanFeatures {
  return PLAN_FEATURES[planKey || 'free'] || PLAN_FEATURES.free;
}

export function canAccess(planKey: string | null | undefined, feature: keyof PlanFeatures): boolean {
  const features = getFeatures(planKey);
  return !!features[feature];
}

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  topup: -1,
};

export function getUpgradeCTA(
  _currentPlan: string,
  blockedFeature: string
): { targetPlan: string; message: string } {
  const upgrades: Record<string, { targetPlan: string; message: string }> = {
    show_breakdown: {
      targetPlan: 'starter',
      message: 'Upgrade ke Basic untuk lihat breakdown detail per metrik',
    },
    competitor_detail: {
      targetPlan: 'starter',
      message: 'Upgrade ke Basic untuk lihat daftar kompetitor lengkap',
    },
    omzet_range: {
      targetPlan: 'starter',
      message: 'Upgrade ke Basic untuk lihat 3 skenario omzet',
    },
    comparison_max: {
      targetPlan: 'pro',
      message: 'Upgrade ke Growth untuk bandingkan hingga 3 lokasi',
    },
    export_pdf: {
      targetPlan: 'pro',
      message: 'Upgrade ke Growth untuk export laporan PDF',
    },
    bep_detail: {
      targetPlan: 'pro',
      message: 'Upgrade ke Growth untuk detail profit & BEP breakdown',
    },
    show_raw_data: {
      targetPlan: 'business',
      message: 'Upgrade ke Pro untuk akses raw data + working capital analysis',
    },
    show_wc_analysis: {
      targetPlan: 'business',
      message: 'Upgrade ke Pro untuk analisis working capital lengkap',
    },
  };
  return upgrades[blockedFeature] || {
    targetPlan: 'starter',
    message: 'Upgrade paket untuk fitur lebih lengkap',
  };
}
