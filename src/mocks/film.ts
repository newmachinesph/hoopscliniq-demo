import type { ID, ISODate } from "@/data/types"
import { at } from "./clock"
import { isOpen } from "./consent"
import { players } from "./org"
import { games, opponentById, scoutFilm } from "./season"

// Film room mock: six of our games (recorded by our staff) and two scout films our advance scout recorded from the
// stands. There is no real video, so every film is a deterministic list of possessions (seeded per film) that the
// tracked "broadcast" view renders with the Play DNA plays. Scores add up to the final in mocks/season.ts, and a film
// runs the length of a real recording (about 1h30): dead balls, timeouts, quarter breaks and halftime included. Opponent players are never named: they are "Opponent 1-5" (constitution,
// incidental footage). Mateo Ruiz (consent pending) never appears as an actor.

export type FilmKind = "game" | "scout" | "practice"
/** processed = staff tagged it; needs_review = Beta ClinIQ suggestions wait on a minority of possessions; tagging = staff
 * are still tagging it by hand. */
export type FilmStatus = "processed" | "needs_review" | "tagging"
/** The four hand-drawn plays in lib/play-dna that the viewport can draw. */
export type DnaId = "spain-pnr" | "horns-twist" | "hammer" | "floppy"
/** `us` is the team we tag first: Lakeshore in our games, the scouted opponent in scout film. */
export type Side = "us" | "them"
export type ResultKind =
  | "3PT make"
  | "3PT miss"
  | "2PT make"
  | "2PT miss"
  | "And-1"
  | "FT 2/2"
  | "FT 1/2"
  | "FT 0/2"
  | "TOV"

export const resultPoints: Record<ResultKind, number> = {
  "3PT make": 3,
  "3PT miss": 0,
  "2PT make": 2,
  "2PT miss": 0,
  "And-1": 3,
  "FT 2/2": 2,
  "FT 1/2": 1,
  "FT 0/2": 0,
  TOV: 0,
}
export const isMake = (r: ResultKind) => resultPoints[r] > 0

export interface PossessionTag {
  by: "coach" | "cliniq"
  /** Coach tags are the default. ClinIQ suggestions (Beta) stay hatched in the lanes until a coach confirms them. */
  status: "confirmed" | "proposed"
  /** 0-1. Illustrative sample values on suggestions; 1 on coach tags. */
  confidence: number
}

export interface Possession {
  id: string
  n: number
  side: Side
  /** Video time range in seconds. */
  start: number
  end: number
  /** Game-clock time elapsed (0-1920 s, four 8-minute quarters). */
  gameStart: number
  gameEnd: number
  set: string
  /** Our playbook play (mocks/plays.ts) when the set is one of ours. */
  playId?: ID
  dna: DnaId
  result: ResultKind
  points: number
  /** "Jalen Ellis", "Opponent 3", or a team name for the other side in scout film. */
  actor: string
  playerId?: ID
  /** The shot or turnover moment, video seconds. */
  eventAt: number
  /** The defense the offense faced. */
  defense: string
  note?: string
  /** null = not tagged yet (the staff hasn't reached it, or the camera lost the play). */
  tag: PossessionTag | null
}

export interface FilmComment {
  id: string
  authorId: ID
  at: number
  body: string
  postedAt: ISODate
}

export type DraftActionType =
  | "Ball screen"
  | "Back screen"
  | "Stagger screen"
  | "Roll"
  | "Drive"
  | "Cut"
  | "Pass"
  | "Shot"

export interface DraftAction {
  id: string
  type: DraftActionType
  who: string
  /** Seconds into the clip. */
  at: number
  confidence: number
}

export interface ClipDraft {
  id: string
  possessionId: string
  title: string
  dna: DnaId
  playId?: ID
  /** Where the saved play lives: /plays/<id>, or the scouting report for opponent sets. */
  href: string
  /** processing = the tracker is still running (a play just requested in this session). */
  status: "saved" | "draft" | "processing"
  /** tracking_jobs.quality_score, 0-100. */
  quality: number
  /** Honest quality-check lines from the tracker. */
  issues: string[]
  clipLength: number
  actions: DraftAction[]
  reviewedBy?: ID
}

export interface FilmTeam {
  short: string
  name: string
}

export interface Film {
  id: ID
  kind: FilmKind
  title: string
  date: ISODate
  venue: string
  gameId?: ID
  opponentId: ID
  us: FilmTeam
  them: FilmTeam
  final: { us: number; them: number }
  duration: number
  status: FilmStatus
  uploadedBy: ID
  uploadedAt: ISODate
  sizeGb: number
  camera: string
  source: "Upload" | "Phone"
  /** Video second the player opens at. */
  startAt: number
  possessions: Possession[]
  comments: FilmComment[]
  drafts: ClipDraft[]
}

// ---------- Seeded generation ----------

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32: small, fast, deterministic. */
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rand = () => number
const between = (r: Rand, lo: number, hi: number) => lo + r() * (hi - lo)
const round1 = (n: number) => Math.round(n * 10) / 10

function weighted<T>(r: Rand, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let x = r() * total
  for (const [item, w] of items) {
    x -= w
    if (x <= 0) return item
  }
  return (items.at(-1) as [T, number])[0]
}

function sample<T>(r: Rand, list: T[], n: number): T[] {
  const pool = [...list]
  const out: T[] = []
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(r() * pool.length), 1)[0] as T)
  }
  return out
}

interface SetDef {
  set: string
  dna: DnaId
  playId?: ID
}

const ourSets = {
  spain: { set: "Spain PnR", dna: "spain-pnr", playId: "spain-pnr" },
  horns: { set: "Horns Flare", dna: "horns-twist", playId: "horns-flare" },
  chicago: { set: "5-Out Chicago", dna: "floppy", playId: "five-out-chicago" },
  hammer: { set: "Hammer", dna: "hammer", playId: "hammer" },
  floppy: { set: "Floppy", dna: "floppy", playId: "floppy" },
  transition: { set: "Primary Transition", dna: "hammer", playId: "primary-transition" },
  blob: { set: "Box BLOB", dna: "floppy", playId: "box-blob" },
  slob: { set: "Sideline OB", dna: "floppy", playId: "sideline-ob" },
  press: { set: "Press Break 1-4", dna: "hammer", playId: "press-break" },
  diamond: { set: "Press Break Diamond", dna: "hammer", playId: "press-diamond" },
  chin: { set: "Chin", dna: "horns-twist", playId: "chin" },
  elevator: { set: "Elevator", dna: "floppy", playId: "elevator" },
  ram: { set: "Ram PnR", dna: "spain-pnr", playId: "ram-pnr" },
  ato: { set: "ATO Stack", dna: "floppy", playId: "ato-stack" },
  shortCorner: { set: "Short Corner Flood", dna: "horns-twist", playId: "short-corner-flood" },
  zoneGut: { set: "Zone Gut", dna: "hammer", playId: "zone-gut" },
  hornsTwist: { set: "Horns Twist", dna: "horns-twist", playId: "horns-twist" },
  hornsDown: { set: "Horns Down", dna: "horns-twist", playId: "horns-down" },
  spainSlip: { set: "Spain Slip", dna: "spain-pnr", playId: "spain-slip" },
  rub: { set: "1-4 High Rub", dna: "horns-twist", playId: "one-four-rub" },
  backdoor: { set: "1-4 High Backdoor", dna: "hammer", playId: "one-four-backdoor" },
  overload: { set: "1-3-1 Overload", dna: "hammer", playId: "overload-131" },
  lineBlob: { set: "Line BLOB", dna: "floppy", playId: "line-blob" },
  drag: { set: "Drag Screen", dna: "spain-pnr", playId: "drag-screen" },
  motion: { set: "Motion", dna: "horns-twist" },
} satisfies Record<string, SetDef>

/** Generic sets for teams we don't have a playbook for. */
const otherSets: [SetDef, number][] = [
  [{ set: "High PnR", dna: "spain-pnr" }, 24],
  [{ set: "Horns", dna: "horns-twist" }, 14],
  [{ set: "Stagger", dna: "floppy" }, 12],
  [{ set: "Baseline drive", dna: "hammer" }, 10],
  [{ set: "Transition", dna: "hammer" }, 16],
  [{ set: "Motion", dna: "horns-twist" }, 24],
]

const shooters = players.filter(isOpen)
const scorerWeights: [Player, number][] = shooters.map((p) => [p, p.stats.pts])
const tovWeights: [Player, number][] = shooters.map((p) => [p, p.stats.tov])
type Player = (typeof players)[number]

interface FilmSpec {
  id: ID
  kind: FilmKind
  title: string
  date: ISODate
  venue: string
  gameId?: ID
  opponentId: ID
  us: FilmTeam
  them: FilmTeam
  usHome: boolean
  final: { us: number; them: number }
  /** Possessions per team. */
  perTeam: number
  tov: { us: number; them: number }
  /** Our turnovers against a press (Cedar Park's 1-2-1-1, Pinecrest's full-court man). */
  pressTov?: number
  pressPossessions?: number
  /** A set we always call against one defense, e.g. 1-3-1 Overload against Westview's 1-3-1. */
  setFor?: Record<string, SetDef>
  /** The press we faced and the press breaks we ran against it. */
  pressDefense?: string
  pressSets?: SetDef[]
  /** Score at a game-clock moment, so the opening frame matches a known scoreboard. */
  checkpoint?: { game: number; us: number; them: number }
  /** Where the player opens, in game-clock seconds. */
  openAt: number
  usSets: [SetDef, number][] | "generic"
  defenseVsUs: [string, number][]
  defenseVsThem: [string, number][]
  /** True when `us` is a scouted opponent: their players are "Opponent n", the other team stays a team. */
  scout: boolean
  status: FilmStatus
  /** How far the staff has tagged by hand, 0-100 (100 unless still tagging). */
  staffTaggedPct: number
  /** Possessions with a Beta ClinIQ suggestion waiting for review: always a minority. */
  proposed: number
  untagged: number
  uploadedBy: ID
  uploadedAt: ISODate
  sizeGb: number
  camera: string
  source: Film["source"]
}

const QUARTER = 480

/** Beta suggestions on the Cedar Park film: still waiting in the review queue, and already reviewed by the staff. */
export const CEDAR_PARK_REVIEW = { waiting: 14, reviewed: 6 }

function settle(list: Possession[], target: number, r: Rand) {
  const set = (p: Possession, result: ResultKind) => {
    p.result = result
    p.points = resultPoints[result]
  }
  // Fix the score on possessions outside our playbook first (motion, the other team), so set PPPs stay near target.
  const pick = (results: ResultKind[]) => {
    const pool = list.filter((p) => results.includes(p.result))
    const loose = pool.filter((p) => !p.playId)
    const from = loose.length ? loose : pool
    return from.length ? (from[Math.floor(r() * from.length)] as Possession) : null
  }
  for (let guard = 0; guard < 400; guard++) {
    const diff = target - list.reduce((s, p) => s + p.points, 0)
    if (diff === 0) return
    let p: Possession | null = null
    if (diff >= 3) {
      p = pick(["3PT miss"])
      if (p) set(p, "3PT make")
      else {
        p = pick(["2PT miss", "FT 0/2"])
        if (p) set(p, p.result === "FT 0/2" ? "FT 2/2" : "2PT make")
      }
    } else if (diff === 2) {
      p = pick(["2PT miss", "FT 0/2"])
      if (p) set(p, p.result === "FT 0/2" ? "FT 2/2" : "2PT make")
    } else if (diff === 1) {
      p = pick(["2PT make", "FT 1/2"])
      if (p) set(p, p.result === "FT 1/2" ? "FT 2/2" : "And-1")
    } else if (diff <= -3) {
      p = pick(["3PT make"])
      if (p) set(p, "3PT miss")
      else {
        p = pick(["2PT make"])
        if (p) set(p, "2PT miss")
      }
    } else if (diff === -2) {
      p = pick(["2PT make", "FT 2/2"])
      if (p) set(p, p.result === "FT 2/2" ? "FT 0/2" : "2PT miss")
    } else {
      p = pick(["And-1", "FT 2/2", "3PT make"])
      if (p) set(p, p.result === "FT 2/2" ? "FT 1/2" : "2PT make")
    }
  }
}

/** Roughly what each of our sets scores per possession over a season (sample targets that steer the generator). */
const setPpp: Record<string, number> = {
  "Spain PnR": 1.08,
  "Spain Slip": 1.1,
  "Horns Flare": 1.02,
  "Horns Twist": 0.95,
  "Horns Down": 1.0,
  "5-Out Chicago": 0.97,
  Hammer: 1.12,
  Floppy: 0.93,
  Chin: 1.0,
  Elevator: 1.15,
  "Ram PnR": 0.98,
  "ATO Stack": 1.1,
  "1-4 High Rub": 1.0,
  "1-4 High Backdoor": 1.05,
  "Short Corner Flood": 1.12,
  "Zone Gut": 0.88,
  "1-3-1 Overload": 1.05,
  "Primary Transition": 1.2,
  "Drag Screen": 1.04,
  "Box BLOB": 1.15,
  "Line BLOB": 1.0,
  "Sideline OB": 0.9,
  "Press Break 1-4": 1.05,
  "Press Break Diamond": 1.1,
  Motion: 0.86,
}

/** Make-rate multiplier that lands a set near its target PPP, allowing for about one turnover in six possessions. */
const makeRate = (set: string) => Math.min(1.6, Math.max(0.55, ((setPpp[set] ?? 0.92) / 0.83 - 0.27) / 0.867))

/** Settle our side set by set: each set gets a share of the points in line with its target PPP, so per-play numbers
 * stay believable on small samples. A final pass fixes whatever a small set couldn't reach. */
function settleBySet(list: Possession[], total: number, r: Rand) {
  const groups = new Map<string, Possession[]>()
  for (const p of list) groups.set(p.set, [...(groups.get(p.set) ?? []), p])
  const entries = [...groups.values()]
  const weight = entries.map((ps) => ps.length * (setPpp[ps[0]?.set ?? ""] ?? 0.92))
  const sum = weight.reduce((a, b) => a + b, 0) || 1
  const raw = weight.map((w) => (w * total) / sum)
  const quota = raw.map(Math.floor)
  let left = total - quota.reduce((a, b) => a + b, 0)
  const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0])
  for (const [, i] of order) {
    if (left <= 0) break
    quota[i] = (quota[i] ?? 0) + 1
    left -= 1
  }
  entries.forEach((ps, i) => {
    settle(ps, quota[i] ?? 0, r)
  })
  settle(list, total, r)
}

function randomResult(r: Rand, k = 1): ResultKind {
  const x = r()
  if (x < 0.34) return r() < 0.34 * k ? "3PT make" : "3PT miss"
  if (x < 0.86) return r() < 0.5 * k ? "2PT make" : "2PT miss"
  if (x < 0.96)
    return weighted(r, [
      ["FT 2/2", 6],
      ["FT 1/2", 3],
      ["FT 0/2", 1],
    ] as [ResultKind, number][])
  return "And-1"
}

function build(spec: FilmSpec): Film {
  const r = rng(hash(spec.id))
  const total = spec.perTeam * 2

  // 1. Skeleton: sides alternate; each quarter's possessions fill exactly 8:00 of game clock.
  const skeleton: { side: Side; gameStart: number; gameEnd: number }[] = []
  let side: Side = r() < 0.5 ? "us" : "them"
  for (let q = 0; q < 4; q++) {
    const count = Math.floor(total / 4) + (q < total % 4 ? 1 : 0)
    const raw = Array.from({ length: count }, () => between(r, 7, 24))
    const scale = QUARTER / raw.reduce((s, d) => s + d, 0)
    let t = q * QUARTER
    raw.forEach((d, i) => {
      const end = i === count - 1 ? (q + 1) * QUARTER : round1(t + d * scale)
      skeleton.push({ side, gameStart: t, gameEnd: end })
      t = end
      side = side === "us" ? "them" : "us"
    })
  }

  // 2. Video time, as recorded: dead balls and free throws between possessions, quarter breaks, halftime, timeouts.
  const timeouts = new Set(sample(r, [...skeleton.keys()].slice(4), 7))
  let v = 45
  const possessions: Possession[] = skeleton.map((s, i) => {
    let gap = i === 0 ? 0 : between(r, 12, 26)
    if (i > 0 && s.gameStart % QUARTER === 0) gap += s.gameStart === 2 * QUARTER ? 600 : 120
    if (timeouts.has(i)) gap += 60
    const start = round1(v + gap)
    const end = round1(start + (s.gameEnd - s.gameStart))
    v = end
    const def = spec.usSets === "generic" || s.side === "them" ? weighted(r, otherSets) : weighted(r, spec.usSets)
    return {
      id: `${spec.id}-p${i + 1}`,
      n: i + 1,
      side: s.side,
      start,
      end,
      gameStart: s.gameStart,
      gameEnd: s.gameEnd,
      set: def.set,
      playId: def.playId,
      dna: def.dna,
      result: "2PT miss",
      points: 0,
      actor: "",
      eventAt: end,
      defense: weighted(r, s.side === "us" ? spec.defenseVsUs : spec.defenseVsThem),
      tag: null,
    }
  })
  const duration = Math.ceil(v + 40)
  for (const p of possessions) {
    const set = p.side === "us" ? spec.setFor?.[p.defense] : undefined
    if (set) Object.assign(p, set)
  }
  const ours = possessions.filter((p) => p.side === "us")
  const theirs = possessions.filter((p) => p.side === "them")

  // 3. Press possessions (after an opponent score in a real game; here spread through the film).
  const press = spec.pressPossessions ? sample(r, ours.slice(2), spec.pressPossessions) : []
  const pressDefense = spec.pressDefense ?? "1-2-1-1 press"
  const pressSets = spec.pressSets ?? [ourSets.press]
  press.forEach((p, i) => {
    Object.assign(p, pressSets[i % pressSets.length], {
      defense: pressDefense,
      note: `vs ${pressDefense.toLowerCase()}`,
    })
  })

  // 4. Turnovers first (fixed counts), then shots.
  const pressTov = sample(r, press, spec.pressTov ?? 0)
  const otherTov = sample(
    r,
    ours.filter((p) => !press.includes(p)),
    spec.tov.us - pressTov.length,
  )
  const theirTov = sample(r, theirs, spec.tov.them)
  const tovs = new Set([...pressTov, ...otherTov, ...theirTov])
  for (const p of possessions) {
    p.result = tovs.has(p) ? "TOV" : randomResult(r, makeRate(p.set))
    p.points = resultPoints[p.result]
  }

  // 5. Make the scores add up, per checkpoint segment.
  const segments = spec.checkpoint
    ? [
        { until: spec.checkpoint.game, us: spec.checkpoint.us, them: spec.checkpoint.them },
        { until: Infinity, us: spec.final.us - spec.checkpoint.us, them: spec.final.them - spec.checkpoint.them },
      ]
    : [{ until: Infinity, us: spec.final.us, them: spec.final.them }]
  let from = -1
  for (const seg of segments) {
    const inSeg = (p: Possession) => p.gameEnd > from && p.gameEnd <= seg.until
    if (spec.scout) settle(ours.filter(inSeg), seg.us, r)
    else settleBySet(ours.filter(inSeg), seg.us, r)
    settle(theirs.filter(inSeg), seg.them, r)
    from = seg.until
  }

  // 6. Actors and event moments.
  for (const p of possessions) {
    const isUs = p.side === "us"
    if (isUs && !spec.scout) {
      const player = weighted(r, p.result === "TOV" ? tovWeights : scorerWeights)
      p.actor = player.name
      p.playerId = player.id
    } else if (isUs || !spec.scout) {
      p.actor = `Opponent ${1 + Math.floor(r() * 5)}`
    } else {
      p.actor = spec.them.name
    }
    p.eventAt = round1(p.end - (p.result === "TOV" ? 1.4 : 0.8))
    if (p.result === "TOV" && !p.note)
      p.note = weighted(r, [
        ["Bad pass", 5],
        ["Lost ball", 3],
        ["Travel", 2],
        ["Offensive foul", 1],
      ] as [string, number][])
  }

  // 7. Tags: the staff tags possessions by hand (the default). On a minority, a Beta ClinIQ suggestion waits for review
  // instead. A few are untagged (camera lost the play), and so is everything past where the staff has tagged so far.
  const cutoff = (duration * spec.staffTaggedPct) / 100
  const reached = possessions.filter((p) => p.end <= cutoff)
  const proposed = new Set(
    sample(
      r,
      reached
        .filter((p) => p.side === "us")
        .concat(
          sample(
            r,
            reached.filter((p) => p.side === "them"),
            Math.ceil(spec.proposed / 3),
          ),
        ),
      spec.proposed,
    ),
  )
  const untagged = new Set(
    sample(
      r,
      reached.filter((p) => !proposed.has(p)),
      spec.untagged,
    ),
  )
  for (const p of reached) {
    if (untagged.has(p)) continue
    if (proposed.has(p)) p.tag = { by: "cliniq", status: "proposed", confidence: round1(between(r, 52, 95)) / 100 }
    else p.tag = { by: "coach", status: "confirmed", confidence: 1 }
  }

  // Opening frame: the game-clock moment in `openAt`.
  const open = possessions.find((p) => p.gameStart <= spec.openAt && spec.openAt < p.gameEnd) ?? possessions[0]
  const startAt = open ? round1(open.start + (spec.openAt - open.gameStart)) : 0

  return {
    id: spec.id,
    kind: spec.kind,
    title: spec.title,
    date: spec.date,
    venue: spec.venue,
    gameId: spec.gameId,
    opponentId: spec.opponentId,
    us: spec.us,
    them: spec.them,
    final: spec.final,
    duration,
    status: spec.status,
    uploadedBy: spec.uploadedBy,
    uploadedAt: spec.uploadedAt,
    sizeGb: spec.sizeGb,
    camera: spec.camera,
    source: spec.source,
    startAt,
    possessions,
    comments: [],
    drafts: [],
  }
}

// ---------- Comments and clip-to-play drafts, anchored to generated possessions ----------

type Pred = (p: Possession) => boolean

function find(film: Film, pred: Pred, nth = 0): Possession {
  const list = film.possessions.filter(pred)
  return (list[Math.min(nth, list.length - 1)] ?? film.possessions[0]) as Possession
}

function near(film: Film, seconds: number, pred: Pred): Possession {
  return film.possessions
    .filter(pred)
    .reduce((best, p) => (Math.abs(p.start - seconds) < Math.abs(best.start - seconds) ? p : best)) as Possession
}

const draftActions: Record<DnaId, Omit<DraftAction, "id">[]> = {
  "spain-pnr": [
    { type: "Ball screen", who: "5 for 1", at: 0.3, confidence: 0.95 },
    { type: "Back screen", who: "4 on 5's defender", at: 1.0, confidence: 0.84 },
    { type: "Roll", who: "5", at: 1.7, confidence: 0.91 },
    { type: "Pass", who: "1 to 5", at: 2.6, confidence: 0.88 },
    { type: "Shot", who: "5, at the rim", at: 3.0, confidence: 0.97 },
  ],
  "horns-twist": [
    { type: "Ball screen", who: "5 for 1", at: 0.7, confidence: 0.93 },
    { type: "Drive", who: "1 to the right slot", at: 1.1, confidence: 0.9 },
    { type: "Back screen", who: "5 twists for 4", at: 2.1, confidence: 0.64 },
    { type: "Pass", who: "1 to 4", at: 3.3, confidence: 0.86 },
    { type: "Shot", who: "4, layup", at: 3.7, confidence: 0.95 },
  ],
  hammer: [
    { type: "Ball screen", who: "5 for 1", at: 0.3, confidence: 0.92 },
    { type: "Drive", who: "1, baseline", at: 0.9, confidence: 0.89 },
    { type: "Cut", who: "3 relocates", at: 1.5, confidence: 0.58 },
    { type: "Pass", who: "1 to 2 (skip)", at: 1.8, confidence: 0.66 },
    { type: "Shot", who: "2, corner three", at: 2.9, confidence: 0.94 },
  ],
  floppy: [
    { type: "Stagger screen", who: "5 and 4 for 2", at: 0.5, confidence: 0.87 },
    { type: "Cut", who: "2 off the double", at: 0.5, confidence: 0.81 },
    { type: "Pass", who: "1 to 2", at: 1.5, confidence: 0.92 },
    { type: "Shot", who: "2, wing three", at: 2.4, confidence: 0.96 },
  ],
}

interface DraftSpec {
  anchor: Possession
  title: string
  status: ClipDraft["status"]
  quality: number
  issues?: string[]
  href?: string
  /** Lower some confidences so the review has real "Check this" rows. */
  shaky?: number[]
}

function draft(film: Film, i: number, d: DraftSpec): ClipDraft {
  const p = d.anchor
  return {
    id: `${film.id}-d${i + 1}`,
    possessionId: p.id,
    title: d.title,
    dna: p.dna,
    playId: p.playId,
    href: d.href ?? (p.playId ? `/plays/${p.playId}` : "/playbook"),
    status: d.status,
    quality: d.quality,
    issues: d.issues ?? [],
    clipLength: Math.min(15, Math.round(p.end - p.start)),
    actions: draftActions[p.dna].map((a, j) => ({
      ...a,
      id: `${film.id}-d${i + 1}-a${j + 1}`,
      confidence: d.shaky?.includes(j) ? Math.min(a.confidence, 0.55 + j * 0.03) : a.confidence,
    })),
    reviewedBy: d.status === "saved" ? "staff-tran" : undefined,
  }
}

function comment(
  film: Film,
  i: number,
  authorId: ID,
  p: Possession,
  body: string,
  daysAgo: number,
  offset = -2,
): FilmComment {
  return {
    id: `${film.id}-c${i + 1}`,
    authorId,
    at: Math.max(0, round1(p.eventAt + offset)),
    body,
    postedAt: at(-daysAgo, i % 2 ? "21:40" : "07:15"),
  }
}

const usOff =
  (set?: string, result?: (r: ResultKind) => boolean): Pred =>
  (p) =>
    p.side === "us" && (!set || p.set === set) && (!result || result(p.result))
const themOff =
  (result?: (r: ResultKind) => boolean): Pred =>
  (p) =>
    p.side === "them" && (!result || result(p.result))
const tov: (r: ResultKind) => boolean = (r) => r === "TOV"
const three: (r: ResultKind) => boolean = (r) => r === "3PT make"

const lak: FilmTeam = { short: "LAK", name: "Lakeshore" }
const gameOf = (filmId: string) => games.find((g) => g.filmId === filmId)
const teamOf = (opponentId: string): FilmTeam => {
  const o = opponentById(opponentId)
  return { short: o?.short ?? opponentId.toUpperCase(), name: o?.name ?? opponentId }
}

// How often each of our sets comes up, by the defense we expect. Weights, not percentages.
const zoneSets: [SetDef, number][] = [
  [ourSets.horns, 18],
  [ourSets.chicago, 15],
  [ourSets.shortCorner, 7],
  [ourSets.zoneGut, 6],
  [ourSets.spain, 7],
  [ourSets.floppy, 4],
  [ourSets.transition, 15],
  [ourSets.drag, 4],
  [ourSets.motion, 14],
  [ourSets.blob, 4],
  [ourSets.lineBlob, 2],
  [ourSets.slob, 2],
]
const manSets: [SetDef, number][] = [
  [ourSets.spain, 14],
  [ourSets.spainSlip, 3],
  [ourSets.horns, 10],
  [ourSets.hornsTwist, 4],
  [ourSets.hornsDown, 3],
  [ourSets.chicago, 8],
  [ourSets.hammer, 8],
  [ourSets.floppy, 7],
  [ourSets.chin, 4],
  [ourSets.elevator, 2],
  [ourSets.ram, 8],
  [ourSets.ato, 2],
  [ourSets.rub, 4],
  [ourSets.backdoor, 3],
  [ourSets.transition, 15],
  [ourSets.drag, 5],
  [ourSets.motion, 12],
  [ourSets.blob, 3],
  [ourSets.lineBlob, 2],
  [ourSets.slob, 2],
]

const ourDefense: [string, number][] = [
  ["Man", 78],
  ["2-3 zone", 16],
  ["Full-court man", 6],
]

function gameSpec(
  filmId: string,
  rest: Omit<
    FilmSpec,
    | "id"
    | "kind"
    | "title"
    | "date"
    | "venue"
    | "gameId"
    | "opponentId"
    | "us"
    | "them"
    | "usHome"
    | "final"
    | "scout"
    | "defenseVsThem"
  >,
): FilmSpec {
  const g = gameOf(filmId)
  if (!g?.result) throw new Error(`No played game with film ${filmId}`)
  const them = teamOf(g.opponentId)
  return {
    id: filmId,
    kind: "game",
    title: `${g.home || g.neutral ? "vs" : "@"} ${them.name}`,
    date: g.date,
    venue: g.venue,
    gameId: g.id,
    opponentId: g.opponentId,
    us: lak,
    them,
    usHome: g.home,
    final: { us: g.result.us, them: g.result.them },
    scout: false,
    defenseVsThem: ourDefense,
    ...rest,
  }
}

function scoutSpec(
  filmId: string,
  otherId: string,
  final: { us: number; them: number },
  rest: Omit<
    FilmSpec,
    "id" | "kind" | "title" | "date" | "venue" | "opponentId" | "us" | "them" | "usHome" | "final" | "scout" | "usSets"
  >,
): FilmSpec {
  const s = scoutFilm.find((f) => f.id === filmId)
  if (!s) throw new Error(`No scout film ${filmId}`)
  const other = teamOf(otherId)
  return {
    id: filmId,
    kind: "scout",
    title: s.title,
    date: s.date,
    venue: `${other.name} HS`,
    opponentId: s.opponentId,
    us: teamOf(s.opponentId),
    them: other,
    usHome: false,
    final,
    scout: true,
    usSets: "generic",
    ...rest,
  }
}

function makeFilms(): Film[] {
  const hp = build(
    gameSpec("oak-hollow", {
      perTeam: 60,
      tov: { us: 10, them: 13 },
      openAt: 4 * 60 + 40,
      usSets: zoneSets,
      defenseVsUs: [
        ["Match-up zone", 72],
        ["Man", 28],
      ],
      status: "processed",
      staffTaggedPct: 100,
      proposed: 0,
      untagged: 3,
      uploadedBy: "staff-tran",
      uploadedAt: at(-10, "22:05"),
      sizeGb: 1.6,
      camera: "High in the stands near half court, 1080p",
      source: "Upload",
    }),
  )
  hp.comments = [
    comment(
      hp,
      0,
      "staff-whitfield",
      find(hp, themOff(three)),
      "Low man has to tag the roller and still get out to the corner. That's the second corner three off this action.",
      10,
    ),
    comment(
      hp,
      1,
      "staff-tran",
      find(
        hp,
        usOff("Horns Flare", (r) => isMake(r)),
      ),
      "Clipped every Horns Flare look against the match-up zone into a cut-up for Thursday.",
      10,
    ),
    comment(
      hp,
      2,
      "staff-reyes",
      find(hp, usOff(undefined, tov), 1),
      "Jalen, no jump passes against the zone. Two feet, then find the short corner.",
      9,
    ),
    comment(
      hp,
      3,
      "staff-whitfield",
      find(hp, themOff(tov), 3),
      "Good: Novak's hands in the passing lane. This is the deflection we want on every wing entry.",
      9,
    ),
    comment(
      hp,
      4,
      "staff-tran",
      find(hp, usOff("5-Out Chicago"), 2),
      "Chicago action freed Novak twice in the 3rd. Their zone can't match the handoff.",
      8,
    ),
  ]
  hp.drafts = [
    draft(hp, 0, {
      anchor: find(
        hp,
        usOff("Horns Flare", (r) => isMake(r)),
      ),
      title: "Horns Flare vs match-up zone",
      status: "saved",
      quality: 92,
    }),
    draft(hp, 1, {
      anchor: find(
        hp,
        usOff("5-Out Chicago", (r) => isMake(r)),
      ),
      title: "5-Out Chicago, handoff to wing three",
      status: "saved",
      quality: 88,
    }),
  ]

  const ms = build(
    gameSpec("ridgeline", {
      perTeam: 63,
      tov: { us: 11, them: 12 },
      openAt: 2 * QUARTER + 5 * 60 + 12,
      usSets: manSets,
      defenseVsUs: [
        ["Pack-line man", 84],
        ["2-3 zone", 16],
      ],
      status: "processed",
      staffTaggedPct: 100,
      proposed: 0,
      untagged: 4,
      uploadedBy: "staff-tran",
      uploadedAt: at(-7, "23:10"),
      sizeGb: 1.8,
      camera: "High in the stands near half court, 1080p",
      source: "Upload",
    }),
  )
  ms.comments = [
    comment(
      ms,
      0,
      "staff-reyes",
      find(
        ms,
        usOff("Hammer", (r) => isMake(r)),
      ),
      "Hammer works against the pack line because the help is already in the paint. Run it twice a half.",
      7,
    ),
    comment(
      ms,
      1,
      "staff-whitfield",
      find(
        ms,
        themOff((r) => r === "2PT make"),
        4,
      ),
      "Chidi stays home on the roll and we give up the pocket pass anyway. Talk earlier.",
      7,
    ),
    comment(
      ms,
      2,
      "staff-tran",
      find(ms, usOff("Spain PnR"), 1),
      "Back screen on 5's defender is late here. Daniel needs to sprint into it.",
      6,
    ),
    comment(
      ms,
      3,
      "staff-reyes",
      find(ms, usOff(undefined, tov), 4),
      "Live-ball turnover, two points the other way. Ten of our eleven came in the middle of the floor.",
      6,
    ),
  ]
  ms.drafts = [
    draft(ms, 0, {
      anchor: find(
        ms,
        usOff("Hammer", (r) => isMake(r)),
      ),
      title: "Hammer, skip to the corner",
      status: "saved",
      quality: 90,
    }),
    draft(ms, 1, {
      anchor: find(ms, usOff("Floppy")),
      title: "Floppy, wing three off the double",
      status: "saved",
      quality: 86,
    }),
  ]

  const nt = build(
    gameSpec("lakemont", {
      perTeam: 66,
      tov: { us: 12, them: 10 },
      openAt: QUARTER + 6 * 60,
      usSets: manSets,
      defenseVsUs: [
        ["Switch everything", 86],
        ["Man", 14],
      ],
      status: "processed",
      staffTaggedPct: 100,
      proposed: 0,
      untagged: 2,
      uploadedBy: "staff-tran",
      uploadedAt: at(-4, "23:30"),
      sizeGb: 1.9,
      camera: "High corner of the stands, 1080p",
      source: "Upload",
    }),
  )
  nt.comments = [
    comment(
      nt,
      0,
      "staff-tran",
      near(nt, 12 * 60 + 40, usOff("Spain PnR")),
      "Ball-screen coverage: they switch the screen and the back screen. Sent this one to Coach Reyes.",
      4,
      0,
    ),
    comment(
      nt,
      1,
      "staff-reyes",
      find(
        nt,
        usOff("Spain PnR", (r) => isMake(r)),
        1,
      ),
      "When they switch, Chidi seals the small. This is the look.",
      4,
    ),
    comment(
      nt,
      2,
      "staff-whitfield",
      find(nt, themOff(three), 2),
      "Late closeout from the weak side. Their shooters are 9 of 17 when we're late.",
      3,
    ),
    comment(
      nt,
      3,
      "staff-tran",
      find(nt, (p) => p.side === "us" && p.gameStart >= 2 * QUARTER),
      "Reviewed the Beta suggestions from the 3rd. Two had the wrong set; I fixed those by hand.",
      3,
    ),
    comment(
      nt,
      4,
      "staff-reyes",
      find(
        nt,
        usOff(undefined, (r) => isMake(r)),
        50,
      ),
      "Composure down the stretch. Show this one Thursday.",
      2,
    ),
  ]
  nt.drafts = [
    draft(nt, 0, {
      anchor: find(
        nt,
        usOff("Spain PnR", (r) => isMake(r)),
      ),
      title: "Spain PnR vs switch, seal and lob",
      status: "saved",
      quality: 89,
    }),
    draft(nt, 1, {
      anchor: find(nt, usOff("Floppy")),
      title: "Floppy vs switch",
      status: "draft",
      quality: 74,
      issues: ["Low confidence on 1 player (out of frame for 0:02)"],
      shaky: [1],
    }),
  ]

  const cp = build(
    gameSpec("cedar-park", {
      perTeam: 64,
      tov: { us: 19, them: 11 },
      pressTov: 8,
      pressPossessions: 17,
      checkpoint: { game: QUARTER + 3 * 60 + 48, us: 31, them: 28 },
      openAt: QUARTER + 3 * 60 + 48,
      usSets: manSets,
      defenseVsUs: [["Man", 100]],
      status: "needs_review",
      staffTaggedPct: 100,
      // ClinIQ suggestions still waiting; the review queue (review.ts) is built from exactly these possessions.
      proposed: CEDAR_PARK_REVIEW.waiting,
      untagged: 5,
      uploadedBy: "staff-tran",
      uploadedAt: at(-3, "22:40"),
      sizeGb: 1.7,
      camera: "High corner of the stands, 1080p",
      source: "Upload",
    }),
  )
  cp.comments = [
    comment(
      cp,
      0,
      "staff-whitfield",
      find(cp, (p) => p.set === "Press Break 1-4" && p.result === "TOV"),
      "Second pass goes to the sideline again and the trap closes. The middle has to flash before the inbound, not after.",
      1,
    ),
    comment(
      cp,
      1,
      "staff-reyes",
      find(cp, (p) => p.set === "Press Break 1-4" && p.result === "TOV", 3),
      "Same thing. 4 flashes late, Jalen has nowhere to go. This is a timing fix, not a new play.",
      1,
    ),
    comment(
      cp,
      2,
      "staff-tran",
      find(cp, (p) => p.set === "Press Break 1-4" && p.result !== "TOV"),
      "When the middle flashes on time we score in four seconds. Pairing this with the turnovers for the cut-up.",
      1,
    ),
    comment(
      cp,
      3,
      "staff-whitfield",
      near(cp, 28 * 60 + 14, themOff()),
      "Late-clock defense: we switch the high ball screen and leave the corner. Clip sent to the staff thread.",
      1,
      0,
    ),
    comment(
      cp,
      4,
      "staff-reyes",
      find(
        cp,
        usOff("Spain PnR", (r) => isMake(r)),
      ),
      "Good read by Luka on the pop. More of this in the 4th.",
      0,
    ),
    comment(
      cp,
      5,
      "staff-tran",
      find(cp, (p) => p.tag?.status === "proposed", 4),
      "14 Beta suggestions still need review. Most are press possessions it can't separate from transition.",
      0,
    ),
  ]
  cp.drafts = [
    draft(cp, 0, {
      anchor: find(cp, (p) => p.set === "Press Break 1-4" && p.result === "TOV", 1),
      title: "Press Break 1-4 vs 1-2-1-1",
      status: "draft",
      quality: 61,
      issues: ["Low confidence on 2 players (occluded)", "Ball lost for 9 frames at the sideline trap"],
      shaky: [2, 3],
    }),
    draft(cp, 1, {
      anchor: find(
        cp,
        usOff("Spain PnR", (r) => isMake(r)),
      ),
      title: "Spain PnR, Novak pop",
      status: "saved",
      quality: 91,
    }),
    draft(cp, 2, {
      anchor: find(cp, usOff("Horns Flare")),
      title: "Horns Flare, weak-side flare",
      status: "draft",
      quality: 77,
      issues: ["Low confidence on 1 player (out of frame for 0:02)"],
      shaky: [2],
    }),
  ]

  const wvms = build(
    scoutSpec(
      "westview-ridgeline",
      "ridgeline",
      { us: 58, them: 52 },
      {
        perTeam: 61,
        tov: { us: 11, them: 14 },
        openAt: 3 * 60 + 30,
        defenseVsUs: [["Pack-line man", 100]],
        defenseVsThem: [
          ["2-3 zone", 61],
          ["1-3-1 zone", 21],
          ["Man", 18],
        ],
        status: "processed",
        staffTaggedPct: 100,
        proposed: 0,
        untagged: 3,
        uploadedBy: "staff-patel",
        uploadedAt: at(-8, "16:20"),
        sizeGb: 1.4,
        camera: "High corner of the stands, 1080p",
        source: "Upload",
      },
    ),
  )
  const shortCorner = (p: Possession) => p.side === "them" && p.defense === "2-3 zone" && isMake(p.result)
  wvms.comments = [
    comment(
      wvms,
      0,
      "staff-patel",
      find(wvms, shortCorner),
      "Short corner is open every time the ball hits the high post. Bottom defender steps up and leaves the baseline.",
      7,
    ),
    comment(
      wvms,
      1,
      "staff-reyes",
      find(wvms, shortCorner, 2),
      "This is the look for Horns Flare. High-post catch, short corner, done.",
      6,
    ),
    comment(
      wvms,
      2,
      "staff-whitfield",
      find(wvms, (p) => p.side === "us" && p.set === "High PnR"),
      "Opponent 1 rejects the screen going left almost every time. Force him right.",
      6,
    ),
    comment(
      wvms,
      3,
      "staff-patel",
      find(wvms, (p) => p.side === "them" && p.defense === "1-3-1 zone"),
      "1-3-1 out of the timeout. Two straight possessions, then back to the 2-3.",
      5,
    ),
  ]
  wvms.drafts = [
    draft(wvms, 0, {
      anchor: find(wvms, (p) => p.side === "us" && p.set === "Horns"),
      title: "Westview Horns (their set)",
      status: "saved",
      quality: 84,
      href: "/playbook",
    }),
    draft(wvms, 1, {
      anchor: find(wvms, (p) => p.side === "us" && p.set === "High PnR"),
      title: "Westview high PnR, reject left",
      status: "draft",
      quality: 66,
      issues: ["Low confidence on 2 players (occluded)", "Broadcast camera cut away for 0:01"],
      shaky: [1, 3],
      href: "/playbook",
    }),
  ]

  const wvla = build(
    scoutSpec(
      "westview-harbor-city",
      "harbor-city",
      { us: 61, them: 55 },
      {
        perTeam: 62,
        tov: { us: 9, them: 13 },
        openAt: 60,
        defenseVsUs: [["2-3 zone", 100]],
        defenseVsThem: [
          ["2-3 zone", 64],
          ["1-3-1 zone", 18],
          ["Man", 18],
        ],
        status: "tagging",
        staffTaggedPct: 64,
        proposed: 9,
        untagged: 2,
        uploadedBy: "staff-patel",
        uploadedAt: at(0, "13:55"),
        sizeGb: 1.3,
        camera: "High corner of the stands, 1080p",
        source: "Phone",
      },
    ),
  )
  wvla.comments = [
    comment(
      wvla,
      0,
      "staff-patel",
      find(wvla, (p) => p.side === "them" && p.defense === "2-3 zone"),
      "Same 2-3 as the Ridgeline game. I'll tag the rest after practice.",
      0,
    ),
  ]

  // Our two earlier meetings with the next two opponents: the scouting reports for Westview and Pinecrest read these.
  const pc = build(
    gameSpec("pinecrest", {
      perTeam: 66,
      tov: { us: 10, them: 15 },
      pressTov: 4,
      pressPossessions: 14,
      pressDefense: "Full-court man",
      pressSets: [ourSets.press, ourSets.diamond],
      openAt: 2 * 60 + 30,
      usSets: manSets,
      defenseVsUs: [["Man", 100]],
      status: "processed",
      staffTaggedPct: 100,
      proposed: 0,
      untagged: 4,
      uploadedBy: "staff-tran",
      uploadedAt: at(-48, "23:20"),
      sizeGb: 1.9,
      camera: "Phone on a clamp, high in the stands near half court, 1080p",
      source: "Phone",
    }),
  )
  pc.comments = [
    comment(
      pc,
      0,
      "staff-whitfield",
      find(pc, (p) => p.side === "us" && p.result === "TOV" && p.defense === "Full-court man"),
      "They trap the first pass every time. Our inbounder has to step in, not drift to the corner.",
      47,
    ),
    comment(
      pc,
      1,
      "staff-reyes",
      find(pc, (p) => p.set === "Press Break Diamond" && isMake(p.result)),
      "Diamond beats it when the middle flashes early. This is the look for the rematch.",
      47,
    ),
    comment(
      pc,
      2,
      "staff-tran",
      find(pc, themOff(three), 1),
      "Their wings shoot it off the catch in transition. Sprint back to the corners.",
      46,
    ),
  ]
  pc.drafts = [
    draft(pc, 0, {
      anchor: find(pc, (p) => p.set === "Press Break Diamond" && isMake(p.result)),
      title: "Press Break Diamond vs full-court man",
      status: "saved",
      quality: 87,
    }),
  ]

  const wv = build(
    gameSpec("westview", {
      perTeam: 63,
      tov: { us: 9, them: 12 },
      openAt: QUARTER + 2 * 60,
      usSets: zoneSets,
      setFor: { "1-3-1 zone": ourSets.overload },
      defenseVsUs: [
        ["2-3 zone", 61],
        ["Man", 25],
        ["1-3-1 zone", 14],
      ],
      status: "processed",
      staffTaggedPct: 100,
      proposed: 0,
      untagged: 3,
      uploadedBy: "staff-tran",
      uploadedAt: at(-32, "23:45"),
      sizeGb: 1.8,
      camera: "High corner of the stands, 1080p",
      source: "Phone",
    }),
  )
  wv.comments = [
    comment(
      wv,
      0,
      "staff-reyes",
      find(wv, (p) => p.side === "us" && p.defense === "2-3 zone" && p.set === "Short Corner Flood"),
      "High-post catch, short corner, done. Their bottom man steps up every time.",
      31,
    ),
    comment(
      wv,
      1,
      "staff-whitfield",
      find(wv, (p) => p.side === "us" && p.defense === "1-3-1 zone"),
      "1-3-1 right out of the timeout. We need a call ready before the huddle breaks.",
      31,
    ),
    comment(
      wv,
      2,
      "staff-tran",
      find(wv, (p) => p.side === "us" && p.set === "1-3-1 Overload"),
      "Overload gets the baseline runner open against the 1-3-1. Clipped all of them for the rematch.",
      30,
    ),
  ]
  wv.drafts = [
    draft(wv, 0, {
      anchor: find(wv, (p) => p.side === "us" && p.set === "Short Corner Flood"),
      title: "Short Corner Flood vs 2-3",
      status: "saved",
      quality: 90,
    }),
  ]

  return [hp, ms, nt, cp, wv, pc, wvms, wvla]
}

export const films: Film[] = makeFilms()

export const getFilm = (id: string) => films.find((f) => f.id === id)

/** Set names a coach can pick when correcting a tag: our playbook in our games, generic sets in scout film. */
export function setOptions(film: Film): { set: string; playId?: ID }[] {
  return film.kind === "scout"
    ? otherSets.map(([s]) => ({ set: s.set }))
    : Object.values(ourSets as Record<string, SetDef>).map((s) => ({ set: s.set, playId: s.playId }))
}

/** Clip-to-play cost (PRICING.md credit key `clip_to_play`). */
export const CLIP_TO_PLAY_CREDITS = 20

// ---------- Derived numbers (shared by the library and the film room) ----------

export function filmSummary(film: Film) {
  const total = film.possessions.length
  const confirmed = film.possessions.filter((p) => p.tag?.status === "confirmed").length
  const proposed = film.possessions.filter((p) => p.tag?.status === "proposed").length
  return { total, confirmed, proposed, taggedPct: Math.round((confirmed / total) * 100) }
}

/** Points per possession by set for the tagged team's offense. */
export function pppBySet(possessions: Possession[]) {
  const map = new Map<string, { set: string; playId?: ID; n: number; pts: number }>()
  for (const p of possessions) {
    if (p.side !== "us") continue
    const row = map.get(p.set) ?? { set: p.set, playId: p.playId, n: 0, pts: 0 }
    row.n += 1
    row.pts += p.points
    map.set(p.set, row)
  }
  return [...map.values()].map((r) => ({ ...r, ppp: r.pts / r.n })).sort((a, b) => b.n - a.n)
}

/** "12:04" or "1:02:10". */
export function timecode(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`
}

/** Game clock at a game-elapsed second: { q: 2, clock: "4:12" }. */
export function gameClock(elapsed: number) {
  const e = Math.min(Math.max(0, elapsed), 4 * QUARTER - 0.01)
  const q = Math.floor(e / QUARTER) + 1
  const left = QUARTER - (e - (q - 1) * QUARTER)
  const m = Math.floor(left / 60)
  const s = Math.floor(left % 60)
  return { q, clock: `${m}:${String(s).padStart(2, "0")}` }
}

// ---------- Library extras ----------

export interface UploadRow {
  id: string
  name: string
  sizeMb: number
  kind: FilmKind
  /** preparing = the upload finished and the video is being prepared for tagging (no ClinIQ analysis). */
  state: "queued" | "uploading" | "preparing" | "ready"
  /** Upload progress, 0-100. */
  progress: number
  filmId?: ID
}

export const uploadQueue: UploadRow[] = [
  {
    id: "u1",
    name: "practice-jan-11-shell-drill.mp4",
    sizeMb: 1_420,
    kind: "practice",
    state: "uploading",
    progress: 47,
  },
  { id: "u2", name: "practice-jan-11-scrimmage.mp4", sizeMb: 860, kind: "practice", state: "queued", progress: 0 },
  {
    id: "u3",
    name: "westview-vs-harbor-city.mp4",
    sizeMb: 1_330,
    kind: "scout",
    state: "ready",
    progress: 100,
    filmId: "westview-harbor-city",
  },
  {
    id: "u4",
    name: "lakeshore-vs-cedar-park.mp4",
    sizeMb: 1_740,
    kind: "game",
    state: "ready",
    progress: 100,
    filmId: "cedar-park",
  },
]

export const filmingGuide = [
  "Phone high in the stands near half court, or a high corner, so all ten players stay in frame",
  "1080p, 30 fps or better; landscape, phone locked",
  "Keep rolling through dead balls and timeouts so the game clock stays easy to match",
  "Scoreboard in frame makes it easier to match the game clock when you tag",
]
