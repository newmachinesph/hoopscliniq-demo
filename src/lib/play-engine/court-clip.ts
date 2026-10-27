// An editable Play (frames of positions plus arrows) turned into the Play DNA shape court.js draws: tracks sampled
// between frames, the ball flying on passes, and each arrow read as a dictionary action (ball screen, back screen,
// drive, roll...) so the H court can draw its notation as the action happens and tag it.
import { type Clip, type CourtArea, H, type Note } from "./court"
import type { Action, Frame, Play, Point } from "./types"

/** One play frame at 1x, in ms (the editor's export timing). */
export const FRAME_MS = 1150
/** Source frames per play frame: enough for smooth notation, small enough to rebuild on every drag. */
export const STEPS = 24

const RIM: Point = [250, 52.5]
/** Where the ball sits next to its holder, in feet (up and right of the disc, clear of the number). */
const BALL_OFFSET: Point = [1.25, -1.25]

export interface BuiltClip {
  clip: Clip
  notes: Note[]
  /** Offense tracks in feet, one point per source frame: for the selection ring. */
  offense: Point[][]
  total: number
}

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const toFt = (p: Point): Point => [p[0] / 10, p[1] / 10]
const rimDist = (p: Point) => dist(p, RIM)

function quad(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
}

/** An arrow's route in feet, bent through `via` when it has one. */
function route(a: Action, samples = 12): Point[] {
  if (!a.via) return [toFt(a.from), toFt(a.to)]
  return Array.from({ length: samples + 1 }, (_, k) => toFt(quad(a.from, a.via as Point, a.to, k / samples)))
}

function nearest(points: Point[], at: Point, skip = -1): number {
  let best = -1
  let bestD = Number.POSITIVE_INFINITY
  points.forEach((p, i) => {
    const d = dist(p, at)
    if (i !== skip && d < bestD) {
      best = i
      bestD = d
    }
  })
  return best
}

/** Every frame lists the same players: missing spots repeat the last known one (or the next, at the start). */
function filled(frames: Frame[], pick: (f: Frame) => Point[] | undefined, count: number): Point[][] {
  const rows: (Point[] | undefined)[] = frames.map(pick)
  const firstKnown = rows.find((r) => r?.length) ?? []
  let prev: Point[] = firstKnown
  return rows.map((r) => {
    const row = Array.from({ length: count }, (_, j) => r?.[j] ?? prev[j] ?? firstKnown[j] ?? ([250, 300] as Point))
    prev = row
    return row
  })
}

const isMove = (a: Action) => a.kind === "cut" || a.kind === "dribble" || a.kind === "screen"

function areaOf(p: Point, areas: CourtArea[]): CourtArea | null {
  for (const a of areas) {
    if (a.circle && Math.hypot(p[0] - a.circle[0], p[1] - a.circle[1]) <= a.circle[2]) return a
    if (a.rect && p[0] >= a.rect[0] && p[0] < a.rect[2] && p[1] >= a.rect[1] && p[1] < a.rect[3]) return a
  }
  return null
}

interface RawAction {
  id: string
  type: string
  who: string
  with?: string
  frame: number
  end: number
  path: Point[]
  route?: Point[]
  lob?: boolean
}

/** The dictionary word for an arrow, read from where it goes and who it involves. */
function screenType(a: Action, screener: number, offense: Point[], holder: number): { type: string; target: number } {
  const target = nearest(offense, a.to, screener)
  if (target === holder) return { type: "ball_screen", target }
  if (dist(a.from, a.to) < 15) return { type: "screen", target }
  const away = rimDist(a.to) - rimDist(a.from)
  if (away > 12) return { type: "back_screen", target }
  if (away < -12) return { type: "down_screen", target }
  return { type: Math.abs(a.to[0] - a.from[0]) > Math.abs(a.to[1] - a.from[1]) ? "cross_screen" : "screen", target }
}

/**
 * Build the clip for `play`, or null when there's nothing to draw (no frames or no players).
 * `defense` adds X1-X5 when the frames carry defenders.
 */
export function buildClip(play: Play, defense: boolean): BuiltClip | null {
  const frames = play.frames
  const nOff = Math.max(0, ...frames.map((f) => f.offense.length))
  if (!frames.length || nOff === 0) return null
  const nDef = defense ? Math.min(9, Math.max(0, ...frames.map((f) => f.defense?.length ?? 0))) : 0
  const count = Math.min(9, nOff)
  const off = filled(frames, (f) => f.offense, count)
  const def = nDef ? filled(frames, (f) => f.defense, nDef) : []
  const last = frames.length - 1
  const total = last * STEPS + 1

  const offTracks: Point[][] = Array.from({ length: count }, () => [])
  const defTracks: Point[][] = Array.from({ length: nDef }, () => [])
  const ball: [number, number, number][] = []
  const holder: (string | null)[] = []
  const actions: RawAction[] = []
  const screenedBy: number[][] = frames.map(() => [])

  for (let i = 0; i <= last; i++) {
    const f = frames[i] as Frame
    const next = frames[i + 1]
    const now = off[i] as Point[]
    const then = (off[i + 1] ?? now) as Point[]
    const base = i * STEPS
    const steps = next ? STEPS : 1
    const holderNow = Math.min(Math.max(0, f.ball), count - 1)
    const holderNext = next ? Math.min(Math.max(0, next.ball), count - 1) : holderNow

    // Each player follows his own arrow (bent through `via`) when it ends where he stands next frame.
    const paths = now.map((p, j) => {
      const q = then[j] as Point
      const arrow = f.actions.find((a) => isMove(a) && dist(a.from, p) < 8 && dist(a.to, q) < 8)
      return (t: number): Point =>
        arrow?.via ? quad(p, arrow.via, q, t) : [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
    })
    const defNow = (def[i] ?? []) as Point[]
    const defThen = (def[i + 1] ?? defNow) as Point[]

    // The ball: with the holder, then in the air on a pass (or a short exchange on a handoff).
    const exchange = f.actions.find((a) => a.kind === "pass" || a.kind === "handoff")
    const changes = holderNext !== holderNow
    const [w0, w1] = exchange?.kind === "handoff" ? [0.6, 0.85] : exchange ? [0.55, 0.9] : [0.6, 0.6]
    const lob = exchange?.kind === "pass" && rimDist(exchange.to) < 75 && rimDist(exchange.from) > 180

    for (let k = 0; k < steps; k++) {
      const t = k / STEPS
      const at = paths.map((fn) => toFt(fn(t)))
      for (const [j, p] of at.entries()) offTracks[j]?.push(p)
      defNow.forEach((p, j) => {
        const q = defThen[j] ?? p
        defTracks[j]?.push(toFt([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]))
      })
      const a = at[holderNow] as Point
      const b = at[holderNext] as Point
      if (!changes || t < w0) {
        ball.push([a[0] + BALL_OFFSET[0], a[1] + BALL_OFFSET[1], 0])
        holder.push(`o${holderNow + 1}`)
      } else if (t >= w1) {
        ball.push([b[0] + BALL_OFFSET[0], b[1] + BALL_OFFSET[1], 0])
        holder.push(`o${holderNext + 1}`)
      } else {
        const u = (t - w0) / (w1 - w0 || 1)
        const lift = exchange?.kind === "handoff" ? 0 : Math.sin(Math.PI * u) * (lob ? 6 : 2)
        ball.push([a[0] + BALL_OFFSET[0] + (b[0] - a[0]) * u, a[1] + BALL_OFFSET[1] + (b[1] - a[1]) * u, lift])
        holder.push(null)
      }
    }

    // The arrows, as dictionary actions timed inside this frame.
    f.actions.forEach((a, n) => {
      const id = `f${i}a${n}`
      if (a.kind === "pass" || a.kind === "handoff") {
        const passer =
          dist(now[holderNow] as Point, a.from) < 40 || dist(then[holderNow] as Point, a.from) < 40
            ? holderNow
            : nearest(then, a.from)
        const receiver = nearest(then, a.to, passer)
        if (passer < 0 || receiver < 0) return
        if (a.kind === "handoff") {
          actions.push({
            id,
            type: "handoff",
            who: `o${passer + 1}`,
            with: `o${receiver + 1}`,
            frame: base + Math.round(STEPS * 0.55),
            end: base + Math.round(STEPS * 0.9),
            path: [toFt(now[passer] as Point), toFt(now[receiver] as Point)],
          })
          return
        }
        const throwLob = rimDist(a.to) < 75 && rimDist(a.from) > 180
        const type =
          Math.abs(a.to[0] - a.from[0]) >= 280
            ? "skip_pass"
            : rimDist(a.from) < 150 && rimDist(a.to) > 200
              ? "kick_out"
              : "pass"
        actions.push({
          id,
          type,
          who: `o${passer + 1}`,
          with: `o${receiver + 1}`,
          frame: base + Math.round(STEPS * 0.5),
          end: base + Math.round(STEPS * 0.9),
          path: [toFt(a.from), toFt(a.to)],
          lob: throwLob,
        })
        return
      }
      const mover = nearest(now, a.from)
      if (mover < 0) return
      const timing = { frame: base, end: base + STEPS }
      if (a.kind === "screen") {
        const { type, target } = screenType(a, mover, now, holderNow)
        screenedBy[i]?.push(mover)
        const r = route(a)
        const targetAt = (then[target] ?? now[target] ?? a.to) as Point
        actions.push({ id, type, who: `o${mover + 1}`, ...timing, path: [toFt(a.to), toFt(targetAt)], route: r })
        return
      }
      if (a.kind === "dribble") {
        const drive = rimDist(a.from) - rimDist(a.to) > 30 || rimDist(a.to) < 160
        actions.push({ id, type: drive ? "drive" : "dribble", who: `o${mover + 1}`, ...timing, path: route(a) })
        return
      }
      // A cut right after setting a screen is the screener's roll (toward the rim) or pop (away from it).
      const screened = (screenedBy[i - 1] ?? []).includes(mover) || (screenedBy[i - 2] ?? []).includes(mover)
      const toward = rimDist(a.to) < rimDist(a.from)
      const type = screened
        ? toward
          ? "roll"
          : "pop"
        : !toward && rimDist(a.to) - rimDist(a.from) > 40
          ? "relocate"
          : "cut"
      actions.push({ id, type, who: `o${mover + 1}`, ...timing, path: route(a) })
    })
  }

  // Court-area runs per player, so the ball's area can be outlined as it moves.
  const areas: Record<string, [number, string, string][]> = {}
  const tracks: Record<string, Point[]> = {}
  const players: Record<string, { team: "offense" | "defense" }> = {}
  const addTrack = (id: string, track: Point[], team: "offense" | "defense") => {
    tracks[id] = track
    players[id] = { team }
    const runs: [number, string, string][] = []
    let key = ""
    track.forEach((p, g) => {
      const a = areaOf(p, H.AREAS)
      const k = a ? `${a.id}|${a.side}` : ""
      if (a && k !== key) runs.push([g, a.id, a.side])
      key = k
    })
    areas[id] = runs
  }
  for (const [j, t] of offTracks.entries()) addTrack(`o${j + 1}`, t, "offense")
  for (const [j, t] of defTracks.entries()) addTrack(`d${j + 1}`, t, "defense")

  const clip = H.parsePlay({
    name: play.title,
    source: { fps: STEPS / (FRAME_MS / 1000), frames: total },
    players,
    tracks: { players: tracks, ball, holder, areas },
    actions,
  })
  const notes = H.applyVerdicts(clip, { verdicts: [] }).notes
  return { clip, notes, offense: offTracks, total }
}

/**
 * Notes for a still: the current frame's arrows fully drawn (and tagged), earlier ones faded, later ones hidden.
 * `summary` draws every arrow at full strength from the start positions, like a playbook page.
 */
export function stillNotes(notes: Note[], f: number, mode: "planned" | "summary", tags: boolean): Note[] {
  const end = f + STEPS
  // The last frame has nothing planned: keep its arrival arrows as playback left them.
  if (mode === "planned" && !notes.some((n) => n.t0 >= f && n.t0 < end)) return notes
  return notes.map((n) => {
    const span = Math.max(1, n.t1 - n.t0)
    if (mode === "summary" || (n.t0 >= f && n.t0 < end)) {
      const t1 = tags ? f : f - 1
      return { ...n, t0: t1 - span, t1 }
    }
    if (n.t1 <= f) {
      const t1 = Math.min(n.t1, f - 21) // past the history fade
      return { ...n, t0: t1 - span, t1 }
    }
    return n
  })
}
