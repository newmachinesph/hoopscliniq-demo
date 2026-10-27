import { type Game, opponentById, playedGames } from "./season"

// Analytics for home, /insights and /org. Scores and dates come from season.ts and players from org.ts; everything
// here is either derived from them or a season total chosen so the math closes (points = 2·FGM + 3PM + FTM, etc.).

// ---------- Game log ----------

/** Per-game detail we track on top of the score: possessions, our turnovers, opponent threes. Filmed games
 * (g02, g07, g12-g15) match their film's possession and turnover counts; turnovers total 168 (11.2 a game). */
const gameDetail: Record<string, { poss: number; tov: number; opp3m: number; opp3a: number }> = {
  g01: { poss: 62, tov: 12, opp3m: 5, opp3a: 18 },
  g02: { poss: 66, tov: 10, opp3m: 8, opp3a: 23 },
  g03: { poss: 60, tov: 12, opp3m: 8, opp3a: 21 },
  g04: { poss: 61, tov: 12, opp3m: 9, opp3a: 22 },
  g05: { poss: 58, tov: 11, opp3m: 5, opp3a: 17 },
  g06: { poss: 59, tov: 8, opp3m: 6, opp3a: 19 },
  g07: { poss: 63, tov: 9, opp3m: 7, opp3a: 20 },
  g08: { poss: 59, tov: 13, opp3m: 7, opp3a: 18 },
  g09: { poss: 62, tov: 10, opp3m: 7, opp3a: 20 },
  g10: { poss: 64, tov: 8, opp3m: 5, opp3a: 19 },
  g11: { poss: 61, tov: 11, opp3m: 6, opp3a: 18 },
  g12: { poss: 60, tov: 10, opp3m: 4, opp3a: 16 },
  g13: { poss: 63, tov: 11, opp3m: 7, opp3a: 19 },
  g14: { poss: 66, tov: 12, opp3m: 9, opp3a: 22 },
  g15: { poss: 64, tov: 19, opp3m: 8, opp3a: 20 },
}

export interface GameRow {
  id: string
  /** Game number in the season, 1-based. */
  n: number
  opponentId: string
  opponent: string
  short: string
  date: string
  /** True at home and at a neutral tournament site: the row reads "vs". */
  home: boolean
  us: number
  them: number
  win: boolean
  poss: number
  /** Points per 100 possessions. */
  ortg: number
  drtg: number
  tov: number
  opp3m: number
  opp3a: number
  opp3pct: number
  filmId?: string
}

const round1 = (n: number) => Math.round(n * 10) / 10

export const gameLog: GameRow[] = playedGames.map((g: Game, i) => {
  const d = gameDetail[g.id] ?? { poss: 60, tov: 11, opp3m: 6, opp3a: 19 }
  const opp = opponentById(g.opponentId)
  const us = g.result?.us ?? 0
  const them = g.result?.them ?? 0
  return {
    id: g.id,
    n: i + 1,
    opponentId: g.opponentId,
    opponent: opp?.name ?? g.opponentId,
    short: opp?.short ?? g.opponentId.toUpperCase(),
    date: g.date,
    home: g.home || !!g.neutral,
    us,
    them,
    win: us > them,
    poss: d.poss,
    ortg: round1((us / d.poss) * 100),
    drtg: round1((them / d.poss) * 100),
    tov: d.tov,
    opp3m: d.opp3m,
    opp3a: d.opp3a,
    opp3pct: round1((d.opp3m / d.opp3a) * 100),
    filmId: g.filmId,
  }
})

// ---------- Four factors ----------

/** Season shooting totals. Points close against season.ts: us 2·338 + 96 + 150 = 922, them 2·317 + 101 + 125 = 860. */
const totals = {
  us: { fgm: 338, fga: 760, tpm: 96, tpa: 260, ftm: 150, fta: 214, orb: 102 },
  them: { fgm: 317, fga: 765, tpm: 101, tpa: 292, ftm: 125, fta: 180, orb: 110 },
}
const ourTov = gameLog.reduce((a, r) => a + r.tov, 0)
const theirTov = 186

function factors(side: "us" | "them", tov: number) {
  const t = totals[side]
  // Every miss is either our offensive rebound or their defensive one (team rebounds ignored).
  const otherDrb = t.fga - t.fgm - t.orb
  return {
    efg: round1(((t.fgm + 0.5 * t.tpm) / t.fga) * 100),
    tovPct: round1((tov / (t.fga + 0.44 * t.fta + tov)) * 100),
    orbPct: round1((t.orb / (t.orb + otherDrb)) * 100),
    ftRate: round1((t.fta / t.fga) * 100),
  }
}

const _ours = factors("us", ourTov)
const _theirs = factors("them", theirTov)

export const totalPossessions = gameLog.reduce((a, r) => a + r.poss, 0)

// ---------- Lineups ----------

export interface Lineup {
  id: string
  playerIds: string[]
  min: number
  ortg: number
  drtg: number
  net: number
  plusMinus: number
}

const possPerMinute = totalPossessions / (gameLog.length * 32)

const lineupSeed: Omit<Lineup, "net" | "plusMinus">[] = [
  {
    id: "l1",
    playerIds: ["p-ellis", "p-novak", "p-washington", "p-kim", "p-okoro"],
    min: 142,
    ortg: 108.9,
    drtg: 95.1,
  },
  { id: "l2", playerIds: ["p-ellis", "p-novak", "p-mensah", "p-kim", "p-okoro"], min: 48, ortg: 106.2, drtg: 97.0 },
  {
    id: "l3",
    playerIds: ["p-brooks", "p-novak", "p-washington", "p-kim", "p-okoro"],
    min: 39,
    ortg: 101.3,
    drtg: 96.8,
  },
  { id: "l4", playerIds: ["p-ellis", "p-haddad", "p-novak", "p-kim", "p-okoro"], min: 31, ortg: 110.4, drtg: 101.8 },
  {
    id: "l5",
    playerIds: ["p-ellis", "p-novak", "p-washington", "p-fischer", "p-okoro"],
    min: 27,
    ortg: 97.6,
    drtg: 99.9,
  },
  { id: "l6", playerIds: ["p-sato", "p-haddad", "p-oduya", "p-mensah", "p-carter"], min: 22, ortg: 88.4, drtg: 99.0 },
]

export const lineups: Lineup[] = lineupSeed.map((l) => {
  const net = round1(l.ortg - l.drtg)
  return { ...l, net, plusMinus: Math.round((net * l.min * possPerMinute) / 100) }
})
