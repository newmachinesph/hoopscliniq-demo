import type { Citation, ID } from "@/data/types"
import { isOpen } from "./consent"
import { players } from "./org"
import { plays } from "./plays"

// Study → Results: playbook study joined to game execution (film tags). Run counts are the play's coach-confirmed
// film runs; the split by "all five had studied it" is sample data, chosen so the two PPPs average back to the play's
// own PPP. Player rows read the same study matrix as the IQ cards. Mateo Ruiz (consent pending) is a row with no data.

export interface PlayStudyRow {
  playId: ID
  title: string
  /** PPP when all five on the floor had studied the play, vs not. Runs are possessions where the play was run. */
  studied: { ppp: number; runs: number }
  notStudied: { ppp: number; runs: number }
}

const open = players.filter(isOpen)
const round2 = (n: number) => Math.round(n * 100) / 100

export const studyKpis = {
  playsAssigned: plays.filter((p) => p.assignedTo > 0).length,
  studiedPct: Math.round(
    (open.reduce((s, p) => s + p.iq.studied, 0) / open.reduce((s, p) => s + p.iq.assigned, 0)) * 100,
  ),
  quizAccuracy: Math.round(open.reduce((s, p) => s + p.iq.quizAccuracy, 0) / open.length),
}

/** Sample split per play: share of runs with five studied players on the floor, and the PPP gap between the two. */
const splits: { playId: ID; share: number; gap: number }[] = [
  { playId: "horns-flare", share: 0.67, gap: 0.32 },
  { playId: "spain-pnr", share: 0.64, gap: 0.46 },
  { playId: "hammer", share: 0.67, gap: 0.18 },
  { playId: "floppy", share: 0.69, gap: 0.05 },
  { playId: "box-blob", share: 0.64, gap: 0.38 },
  { playId: "zone-gut", share: 0.7, gap: 0.08 },
]

export const playStudyRows: PlayStudyRow[] = splits.flatMap(({ playId, share, gap }) => {
  const play = plays.find((p) => p.id === playId)
  if (!play || play.stats.timesRun < 2) return []
  const { timesRun: total, ppp } = play.stats
  const runs = Math.min(total - 1, Math.max(1, Math.round(total * share)))
  const rest = total - runs
  return [
    {
      playId,
      title: play.title,
      studied: { ppp: round2(ppp + (gap * rest) / total), runs },
      notStudied: { ppp: round2(Math.max(0, ppp - (gap * runs) / total)), runs: rest },
    },
  ]
})

export interface PlayerStudyRow {
  playerId: ID
  studyPct: number
  quizPct: number
  /** Plays run correctly out of plays run, from confirmed film tags. */
  executed: { right: number; of: number }
}

/** Plays run right out of plays run, per player (sample from the film tags). */
const executed: Record<ID, { right: number; of: number }> = {
  "p-ellis": { right: 41, of: 46 },
  "p-brooks": { right: 31, of: 40 },
  "p-novak": { right: 35, of: 40 },
  "p-okoro": { right: 30, of: 38 },
  "p-kim": { right: 33, of: 37 },
  "p-washington": { right: 24, of: 34 },
  "p-haddad": { right: 19, of: 29 },
  "p-fischer": { right: 14, of: 23 },
  "p-mensah": { right: 22, of: 27 },
  "p-carter": { right: 15, of: 24 },
  "p-sato": { right: 19, of: 21 },
  "p-oduya": { right: 13, of: 19 },
}

export const playerStudyRows: PlayerStudyRow[] = open
  .map((p) => ({
    playerId: p.id,
    studyPct: Math.round((p.iq.studied / p.iq.assigned) * 100),
    quizPct: p.iq.quizAccuracy,
    executed: executed[p.id] ?? { right: 0, of: 0 },
  }))
  .sort((a, b) => b.studyPct - a.studyPct || b.quizPct - a.quizPct)

export interface StudyInsight {
  id: string
  text: string
  citations: Citation[]
  /** Proposed action, shown on the Assign button. */
  assignLabel: string
}

const spain = playStudyRows.find((r) => r.playId === "spain-pnr")
const spainBehind = open.filter((p) => p.iq.studied < p.iq.assigned).length

export const studyInsight: StudyInsight = {
  id: "insight-spain",
  text: spain
    ? `With all five on the floor having studied Spain PnR, we score ${spain.studied.ppp.toFixed(2)} points per possession on it, vs ${spain.notStudied.ppp.toFixed(2)} otherwise (${spain.studied.runs} and ${spain.notStudied.runs} runs on film) [1]. ${spainBehind} players are behind on their assigned plays, and their quiz scores are lower [2]. Westview plays zone, so finish the game-plan study before Friday.`
    : "Not enough tagged film yet to compare studied and unstudied runs.",
  citations: [
    { kind: "play", label: "Spain Pick and Roll · film runs", href: "/plays/spain-pnr" },
    { kind: "stat", label: "Quiz history, Player IQ", href: "/insights?tab=iq" },
  ],
  assignLabel: `Remind ${spainBehind} players`,
}
