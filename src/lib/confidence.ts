/** Plain-language labels for model confidence and clip quality. Percentages are never shown. */
export type ConfidenceLabel = "High" | "Medium" | "Low"
export type QualityLabel = "Good" | "Fair" | "Poor"

/** pct is 0-100. */
export function confidenceLabel(pct: number): ConfidenceLabel {
  if (pct >= 80) return "High"
  if (pct >= 60) return "Medium"
  return "Low"
}

/** Same bands as confidence, for a 0-100 clip quality score. */
export function clipQuality(n: number): QualityLabel {
  if (n >= 80) return "Good"
  if (n >= 60) return "Fair"
  return "Poor"
}
