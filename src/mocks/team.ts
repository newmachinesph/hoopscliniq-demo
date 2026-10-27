import type { Availability } from "@/data/types"
import { guardianById } from "./org"

// Team module mock: evaluations, goals, notes, clips, availability and invites for the 13 Varsity Boys.
// Everything is derived deterministically from mocks/org.ts so stats and IQ agree across screens.

export { isLocked, isOpen } from "./consent"

const _ruizGuardian = guardianById("g-ruiz")

// Fixed wobble so lines look like real games without any randomness.
const _WOBBLE = [-0.9, 0.4, 1.3, -0.2, 0.8, -1.1, 0.2, 1.0, -0.6, -0.7]

/* ---------- Evaluations ---------- */

export const SKILLS = ["Ball handling", "Shooting", "Defense", "Basketball IQ", "Effort"] as const
export type Skill = (typeof SKILLS)[number]

type Scores = [number, number, number, number, number]

// Coach Reyes' January scores, Coach Whitfield's offset from hers, and December's change.
const _REYES: Record<string, Scores> = {
  "p-ellis": [5, 4, 4, 5, 5],
  "p-okoro": [2, 2, 4, 4, 5],
  "p-novak": [4, 5, 3, 4, 5],
  "p-washington": [3, 3, 4, 3, 4],
  "p-kim": [3, 3, 4, 5, 4],
  "p-brooks": [4, 3, 3, 3, 4],
  "p-haddad": [3, 4, 2, 3, 3],
  "p-fischer": [2, 2, 3, 3, 4],
  "p-mensah": [3, 2, 4, 4, 4],
  "p-carter": [1, 2, 3, 3, 4],
  "p-sato": [4, 3, 3, 5, 5],
  "p-oduya": [2, 3, 3, 3, 3],
}
const _WHITFIELD_OFFSET: Record<string, Scores> = {
  "p-ellis": [0, 0, 1, 0, 0],
  "p-okoro": [0, 0, 1, 0, 0],
  "p-novak": [0, 0, -1, 0, 0],
  "p-washington": [0, 1, 0, 0, 0],
  "p-kim": [0, 0, 1, 0, 0],
  "p-brooks": [0, 0, 0, 1, 0],
  "p-haddad": [0, 0, -1, 0, 1],
  "p-fischer": [0, 0, 0, 0, 0],
  "p-mensah": [0, 1, 0, 0, 0],
  "p-carter": [1, 0, 0, 0, 0],
  "p-sato": [0, 0, 1, 0, 0],
  "p-oduya": [0, 0, 0, 0, -1],
}
const _DEC_CHANGE: Record<string, Scores> = {
  "p-ellis": [0, 1, 0, 0, 0],
  "p-okoro": [0, 0, 1, 1, 0],
  "p-novak": [1, 0, 0, 1, 0],
  "p-washington": [0, 0, 0, 1, 0],
  "p-kim": [0, 0, 0, 0, 0],
  "p-brooks": [1, 0, 0, 0, 1],
  "p-haddad": [0, 1, 0, 0, 0],
  "p-fischer": [0, 0, 0, 1, 0],
  "p-mensah": [0, 0, 1, 0, 0],
  "p-carter": [0, 1, 0, 0, 0],
  "p-sato": [0, 0, 1, 0, 0],
  "p-oduya": [0, 0, 0, 0, 0],
}

const _toRecord = (arr: Scores): Record<Skill, number> =>
  Object.fromEntries(SKILLS.map((s, i) => [s, arr[i]])) as Record<Skill, number>

const _GOALS: Record<string, [string, number, string][]> = {
  "p-ellis": [
    ["Keep turnovers under 2.5 a game", 80, "2.4 now"],
    ["Shoot 40% from three", 70, "38.1% now"],
  ],
  "p-okoro": [
    ["Make 70% of free throws", 40, "61.5% now"],
    ["Grab 11 rebounds a game", 80, "10.4 now"],
  ],
  "p-novak": [
    ["Add a pull-up off the ball screen", 60, "Coach check-in"],
    ["Raise assists to 3 a game", 55, "2.2 now"],
  ],
  "p-washington": [
    ["Shoot 40% from three", 35, "33.3% now"],
    ["Study 22 of 24 plays", 80, "18 of 24 now"],
  ],
  "p-kim": [
    ["Call out every defensive rotation", 85, "Coach check-in"],
    ["Make 75% of free throws", 60, "70.0% now"],
  ],
  "p-brooks": [
    ["Cut turnovers to 1.5 a game", 45, "1.8 now"],
    ["Shoot 45% from the field", 40, "40.3% now"],
  ],
  "p-haddad": [
    ["Study every assigned play this month", 60, "15 of 24 now"],
    ["Finish drives with the left hand", 30, "Coach check-in"],
  ],
  "p-fischer": [
    ["Study 18 of 24 plays while out", 67, "12 of 24 now"],
    ["Rebound 5 a game when back", 20, "4.4 now"],
  ],
  "p-mensah": [
    ["Take 2 corner threes a game", 50, "Film count"],
    ["Shoot 33% from three", 70, "30.0% now"],
  ],
  "p-carter": [
    ["Learn the ball-screen coverages", 45, "Quiz 73%"],
    ["Make 60% of free throws", 30, "50.0% now"],
  ],
  "p-sato": [
    ["Keep quiz accuracy above 90%", 100, "95% now"],
    ["Score in double figures once", 25, "Season high 8"],
  ],
  "p-oduya": [
    ["Study 24 of 24 plays", 79, "19 of 24 now"],
    ["Add a dribble drive", 35, "Coach check-in"],
  ],
}

/* ---------- Availability ---------- */

export type DayStatus = Availability | "unknown"

const _A: DayStatus = "available"

const _SOFIA = "Sofia Alvarez"
