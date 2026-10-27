import type { ID } from "@/data/types"
import { CEDAR_PARK_REVIEW, films, gameClock } from "./film"

// Beta review queue for the latest game (Cedar Park): ClinIQ suggestions on a minority of possessions; the staff
// tagged the rest by hand. Confidence levels are illustrative sample values, not measured accuracy. Opponent players are "Opponent 1-5"; Mateo Ruiz
// (consent pending) never appears in a proposal.

export type Confidence = "high" | "medium" | "low"

export interface ProposedTag {
  id: string
  /** Video seconds, shown as a timecode. */
  at: number
  clock: string
  action: string
  /** Our playbook play when the action matches one. */
  playId?: ID
  players: string[]
  confidence: Confidence
  /** Short reason, shown for every row. */
  reason: string
}

const film = films.find((f) => f.id === "cedar-park")
const waiting = film?.possessions.filter((p) => p.tag?.by === "cliniq" && p.tag.status === "proposed") ?? []

export const reviewGame = {
  filmId: "cedar-park",
  opponent: "Cedar Park",
  /** Suggestions on this game (a minority of its possessions) and how many the staff has reviewed. */
  total: waiting.length + CEDAR_PARK_REVIEW.reviewed,
  reviewed: CEDAR_PARK_REVIEW.reviewed,
}

const confidenceOf = (score: number): Confidence => (score >= 0.8 ? "high" : score >= 0.65 ? "medium" : "low")

/** Illustrative reasons by confidence; the row picks one by position so neighbours differ. */
const reasons: Record<Confidence, string[]> = {
  high: [
    "Formation and the shooter's number are both in frame.",
    "Screens and the cut match the diagram.",
    "Ball through the net, shooter number read.",
  ],
  medium: [
    "Medium: the set matches, but the ball handler is half hidden.",
    "Medium: could be a different entry; the first pass is off frame.",
    "Medium: formation matches, the screener is cut off by the frame.",
  ],
  low: [
    "Low: screener partly out of frame.",
    "Low: backlit, the shooter's number is unreadable.",
    "Low: bodies overlap at the rim, the finish is hard to confirm.",
  ],
}

const resultLabel: Record<string, string> = {
  TOV: "Turnover",
  "And-1": "And-1",
}

/** The queue is the Cedar Park film's waiting suggestions, so every row opens on its own possession. */
export const proposedTags: ProposedTag[] = waiting.map((p, i) => {
  const confidence = confidenceOf(p.tag?.confidence ?? 0)
  const { q, clock } = gameClock(p.gameStart)
  const set = p.side === "us" ? p.set : `Their ${p.set}`
  const result = resultLabel[p.result] ?? p.result
  return {
    id: `t${i + 1}`,
    at: Math.round(p.start),
    clock: `Q${q} ${clock}`,
    action: `${set} · ${result}`,
    playId: p.side === "us" ? p.playId : undefined,
    players: p.actor ? [p.actor] : [],
    confidence,
    reason: reasons[confidence][i % reasons[confidence].length] ?? "",
  }
})
