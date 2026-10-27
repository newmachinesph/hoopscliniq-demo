import { org } from "./org"

/**
 * The one credit balance every screen shows (sidebar, billing, ClinIQ, program). Monthly credits are spent before pack
 * credits, so "left" is monthly left plus packs on hand. Pass `packs` when a screen has bought a pack in preview.
 */
export function creditBalance(packs: number = org.credits.packs) {
  const monthly = Math.max(0, org.credits.included - org.credits.used)
  return {
    used: org.credits.used,
    monthly,
    packs,
    left: monthly + packs,
    total: org.credits.included + packs,
    split: `${monthly.toLocaleString()} monthly + ${packs.toLocaleString()} pack`,
  }
}

/** Full-game film breakdown: a per-game add-on outside the credit system. Single source for the app. */
export const filmAddOn = {
  perGame: 15,
  status: "Coming 2027",
  note: "Per-game price will be tested with pilot programs starting spring 2027.",
}
