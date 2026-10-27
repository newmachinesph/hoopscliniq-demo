import type { ID } from "@/data/types"

// Who was assigned which play, and who has studied it. One matrix behind every study number: a player's IQ card
// ("21/23 studied", org.ts), a play's "11 of 12 eligible" (plays.ts), Study results and the player portal. Plays are
// listed in the order they were assigned; a player who is behind has skipped the newest ones, except that the
// Westview game plan went out first (only Omar Haddad hasn't opened it). Mateo Ruiz (consent pending) is never
// assigned anything. No imports from org.ts, which reads this file.

/** The 12 players with consent on file, in roster order. */
const ELIGIBLE: ID[] = [
  "p-ellis",
  "p-okoro",
  "p-novak",
  "p-washington",
  "p-kim",
  "p-brooks",
  "p-haddad",
  "p-fischer",
  "p-mensah",
  "p-carter",
  "p-sato",
  "p-oduya",
]

export interface StudyAssignment {
  playId: ID
  /** Day offset from NOW when the coach assigned it. */
  assignedOn: number
  /** Part of the game plan for an upcoming opponent. */
  gamePlan?: "westview" | "pinecrest"
  /** Assigned to these players only; everyone eligible otherwise. */
  only?: ID[]
}

/** The 24 published plays (Baseline Runner is a draft), oldest assignment first. */
export const studyPlan: StudyAssignment[] = [
  { playId: "primary-transition", assignedOn: -57 },
  { playId: "spain-pnr", assignedOn: -57 },
  { playId: "horns-flare", assignedOn: -57, gamePlan: "westview" },
  { playId: "box-blob", assignedOn: -57, gamePlan: "westview" },
  { playId: "sideline-ob", assignedOn: -57 },
  { playId: "press-break", assignedOn: -55 },
  { playId: "five-out-chicago", assignedOn: -55, gamePlan: "westview" },
  { playId: "hammer", assignedOn: -50 },
  {
    playId: "floppy",
    assignedOn: -50,
    only: ["p-ellis", "p-novak", "p-washington", "p-brooks", "p-haddad", "p-mensah", "p-sato", "p-oduya"],
  },
  { playId: "chin", assignedOn: -45 },
  { playId: "ram-pnr", assignedOn: -40 },
  { playId: "line-blob", assignedOn: -40 },
  { playId: "horns-twist", assignedOn: -36 },
  { playId: "one-four-rub", assignedOn: -36 },
  { playId: "drag-screen", assignedOn: -30 },
  { playId: "elevator", assignedOn: -30 },
  { playId: "spain-slip", assignedOn: -26 },
  { playId: "one-four-backdoor", assignedOn: -26 },
  { playId: "ato-stack", assignedOn: -21 },
  { playId: "horns-down", assignedOn: -21 },
  { playId: "zone-gut", assignedOn: -16, gamePlan: "westview" },
  { playId: "press-diamond", assignedOn: -8, gamePlan: "pinecrest" },
  { playId: "overload-131", assignedOn: -2, gamePlan: "westview" },
  { playId: "short-corner-flood", assignedOn: -1, gamePlan: "westview" },
]

/** Plays each player hasn't studied yet. Everyone else in ELIGIBLE has studied everything assigned to them. */
const behindBy: Record<ID, number> = {
  "p-okoro": 3,
  "p-novak": 1,
  "p-washington": 6,
  "p-brooks": 4,
  "p-haddad": 9,
  "p-fischer": 12,
  "p-mensah": 2,
  "p-carter": 7,
  "p-oduya": 5,
}

/** Players this play is assigned to. */
export const assignedTo = (a: StudyAssignment): ID[] => a.only ?? ELIGIBLE

function unstudiedFor(playerId: ID): Set<ID> {
  const mine = studyPlan.filter((a) => assignedTo(a).includes(playerId)).reverse()
  // Omar hasn't opened the game plan, so he skipped the newest plays in order. Everyone else did the game plan first.
  const order = playerId === "p-haddad" ? mine : mine.filter((a) => a.gamePlan !== "westview")
  return new Set(order.slice(0, behindBy[playerId] ?? 0).map((a) => a.playId))
}

const unstudied = new Map(ELIGIBLE.map((id) => [id, unstudiedFor(id)]))

export const hasStudied = (playerId: ID, playId: ID) => !unstudied.get(playerId)?.has(playId)

/** "21 of 23": what a player's IQ card shows. Null for anyone who can't be assigned plays. */
export function playerStudy(playerId: ID): { studied: number; assigned: number } | null {
  if (!ELIGIBLE.includes(playerId)) return null
  const mine = studyPlan.filter((a) => assignedTo(a).includes(playerId))
  return { assigned: mine.length, studied: mine.filter((a) => hasStudied(playerId, a.playId)).length }
}

/** Assigned and studied counts for a play. Zero and zero for a draft. */
export function playStudy(playId: ID): { assignedTo: number; studied: number; assignedOn?: number } {
  const a = studyPlan.find((s) => s.playId === playId)
  if (!a) return { assignedTo: 0, studied: 0 }
  const who = assignedTo(a)
  return {
    assignedTo: who.length,
    studied: who.filter((id) => hasStudied(id, playId)).length,
    assignedOn: a.assignedOn,
  }
}
