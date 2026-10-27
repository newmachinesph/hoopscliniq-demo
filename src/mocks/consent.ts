import type { OpenPlayer, Player } from "@/data/types"

/** Pending and declined consent lock a player's profile: name, number and position only (P0-08). */
export function isLocked(p: Pick<Player, "consent">): boolean {
  return p.consent === "pending" || p.consent === "declined"
}

/** Type guard for the inverse of isLocked: stats, IQ, grade, height and availability are all present (P0-08). */
export function isOpen(p: Player): p is OpenPlayer {
  return !isLocked(p) && p.stats !== null && p.iq !== null && p.availability !== null
}
