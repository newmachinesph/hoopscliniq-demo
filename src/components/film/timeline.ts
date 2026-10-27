import type { Film, Possession } from "@/data/film"

// Pure lookups from a video second to what's on screen: which possession, the score, the game clock.

/** Index of the last possession that started at or before t, or -1 before the first. */
export function possessionIndexAt(possessions: Possession[], t: number): number {
  let lo = 0
  let hi = possessions.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if ((possessions[mid] as Possession).start <= t) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
}

/** The possession being played at t, or -1 during a dead ball. */
export function liveIndexAt(possessions: Possession[], t: number): number {
  const i = possessionIndexAt(possessions, t)
  const p = possessions[i]
  return p && t < p.end ? i : -1
}

export interface ScoreTable {
  us: number[]
  them: number[]
}

/** Running score after each possession (points count when the possession ends). */
export function scoreTable(possessions: Possession[]): ScoreTable {
  const us: number[] = []
  const them: number[] = []
  let u = 0
  let th = 0
  for (const p of possessions) {
    if (p.side === "us") u += p.points
    else th += p.points
    us.push(u)
    them.push(th)
  }
  return { us, them }
}

export function scoreAt(possessions: Possession[], table: ScoreTable, t: number) {
  let i = possessionIndexAt(possessions, t)
  const p = possessions[i]
  if (p && t < p.end) i -= 1
  return i < 0 ? { us: 0, them: 0 } : { us: table.us[i] ?? 0, them: table.them[i] ?? 0 }
}

/** Game-clock seconds elapsed at video second t (the clock stops in dead balls). */
export function gameElapsedAt(possessions: Possession[], t: number): number {
  const i = possessionIndexAt(possessions, t)
  const p = possessions[i]
  if (!p) return 0
  return t < p.end ? p.gameStart + (t - p.start) : p.gameEnd
}

/** Why the film is between possessions, for the dead-ball caption. */
export function deadBallLabel(film: Film, t: number): string {
  const i = possessionIndexAt(film.possessions, t)
  const next = film.possessions[i + 1]
  const prev = film.possessions[i]
  if (!prev) return "Tip-off"
  if (!next) return "Final"
  if (next.gameStart === 960) return "Halftime"
  if (next.gameStart % 480 === 0) return `End of Q${next.gameStart / 480}`
  if (next.start - prev.end > 20) return "Timeout"
  return "Dead ball"
}
