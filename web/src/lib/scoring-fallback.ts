import type { ScoreBreakdown } from "@/types/location-scoring";

export function isMockScore(breakdown: ScoreBreakdown): boolean {
  return breakdown.competitor_density.explanation.includes("Data simulasi");
}
