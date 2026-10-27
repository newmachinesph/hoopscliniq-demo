// ClinIQ's read of one play, built from that play's own frames, film stats and clips. The real product generates this
// with Muse Spark (P1-15); the mock composes it from the same inputs so every play gets its own cited answer.
import { type PlaybookPlay, type PlayClip, studiedLabel } from "@/data/plays"
import { games, opponentById } from "@/data/season"
import type { Citation } from "@/data/types"
import { spotName } from "./play-edits"

/** Team points per possession by play type, from /insights. */
const BASELINE: Record<PlaybookPlay["category"], { ppp: number; label: string }> = {
  "Half court": { ppp: 0.94, label: "half-court average" },
  "Zone offense": { ppp: 0.88, label: "average against zones" },
  BLOB: { ppp: 0.86, label: "out-of-bounds average" },
  SLOB: { ppp: 0.86, label: "out-of-bounds average" },
  "Press break": { ppp: 0.97, label: "average against pressure" },
  Transition: { ppp: 1.12, label: "transition average" },
}

/** One help defender can guard two players closer than this (feet). */
const TIGHT_FEET = 10

export interface PlayCheck {
  label: string
  value: string
  tone: "success" | "warning" | "neutral"
}

export interface PlayAnalysis {
  body: string[]
  citations: Citation[]
  checks: PlayCheck[]
  credits: number
}

export function filmName(filmId: string): string {
  const game = games.find((g) => g.filmId === filmId)
  const opponent = game ? opponentById(game.opponentId) : undefined
  return opponent ? `vs ${opponent.name}` : filmId
}

export function filmDate(filmId: string): string | undefined {
  return games.find((g) => g.filmId === filmId)?.date
}

export function clipHref(clip: PlayClip): string {
  return `/film/${clip.filmId}?t=${clip.t}`
}

const near = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1

function feet(a: [number, number], b: [number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) / 10
}

/** Closest pair of offensive players over the whole play. */
function closestPair(play: PlaybookPlay) {
  let best = { a: 0, b: 1, dist: Number.POSITIVE_INFINITY, frame: 0 }
  play.frames.forEach((frame, f) => {
    const o = frame.offense
    for (let i = 0; i < o.length; i++) {
      for (let j = i + 1; j < o.length; j++) {
        const d = feet(o[i] as [number, number], o[j] as [number, number])
        // Screens put two players together on purpose; only count frames where neither is screening.
        const screening = frame.actions.some(
          (a) => a.kind === "screen" && [o[i], o[j]].some((p) => p && (near(a.from, p) || near(a.to, p))),
        )
        if (!screening && d < best.dist) best = { a: i, b: j, dist: d, frame: f }
      }
    }
  })
  return best
}

function averageSpacing(points: [number, number][]) {
  let total = 0
  let pairs = 0
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      total += feet(points[i] as [number, number], points[j] as [number, number])
      pairs++
    }
  }
  return pairs ? total / pairs : 0
}

export function analyzePlay(play: PlaybookPlay): PlayAnalysis {
  const citations: Citation[] = []
  const cite = (c: Citation) => {
    const existing = citations.findIndex((x) => x.href === c.href && x.label === c.label)
    if (existing >= 0) return `[${existing + 1}]`
    citations.push(c)
    return `[${citations.length}]`
  }
  const frameCite = (f: number) =>
    cite({ kind: "play", label: `${play.title}, frame ${f + 1}`, href: `/plays/${play.id}` })
  const body: string[] = []
  const checks: PlayCheck[] = []
  const { stats } = play
  const players = play.frames[0]?.offense.length ?? 0

  if (players < 2) {
    return {
      body: [
        `**${play.title}** has ${players === 0 ? "no players" : "one player"} on the court yet ${frameCite(0)}. Place all five and draw the first action, then ask again.`,
      ],
      citations,
      checks: [{ label: "Players placed", value: `${players} of 5`, tone: "warning" }],
      credits: 0,
    }
  }

  // 1. Results on film
  const base = BASELINE[play.category]
  if (stats.timesRun > 0) {
    const diff = stats.ppp - base.ppp
    const runs = cite({ kind: "stat", label: `${play.title}: ${stats.timesRun} runs`, href: "/insights" })
    const team = cite({ kind: "stat", label: `Team ${base.label}`, href: "/insights" })
    body.push(
      `**${play.title}** scores **${stats.ppp.toFixed(2)} points per possession** on ${stats.timesRun} tagged runs ${runs}, ${Math.abs(diff).toFixed(2)} ${diff >= 0 ? "above" : "below"} our ${base.label} of ${base.ppp.toFixed(2)} ${team}. It ends in a score or a foul ${stats.successRate}% of the time.`,
    )
    checks.push({
      label: "Film sample",
      value: stats.timesRun < 10 ? `Small · ${stats.timesRun} runs` : `${stats.timesRun} runs`,
      tone: stats.timesRun < 10 ? "warning" : "neutral",
    })
  } else {
    body.push(
      `**${play.title}** hasn't been run in a game yet, so this read comes from the diagram only ${frameCite(0)}. Tag it on film after Friday and the numbers fill in.`,
    )
    checks.push({ label: "Film sample", value: "Not run yet", tone: "neutral" })
  }

  // 2. Spacing, from the frames
  const last = play.frames.at(-1)?.offense as [number, number][]
  const avg = averageSpacing(last)
  const pair = closestPair(play)
  const tight = pair.dist < TIGHT_FEET
  const pairFrame = play.frames[pair.frame]
  const crowded = pairFrame?.offense[pair.b] as [number, number] | undefined
  if (tight) {
    body.push(
      `Spacing gets tight: players average ${avg.toFixed(1)} ft apart in the final frame, but **${pair.a + 1} and ${pair.b + 1} are ${pair.dist.toFixed(1)} ft apart in frame ${pair.frame + 1}** ${frameCite(pair.frame)}, so one help defender can guard both.`,
    )
    checks.push({ label: "Floor spacing", value: `Tight · frame ${pair.frame + 1}`, tone: "warning" })
  } else {
    body.push(
      `Spacing holds up: players average ${avg.toFixed(1)} ft apart in the final frame, and the closest pair (${pair.a + 1} and ${pair.b + 1}) is still ${pair.dist.toFixed(1)} ft apart in frame ${pair.frame + 1} ${frameCite(pair.frame)}.`,
    )
    checks.push({ label: "Floor spacing", value: `Good · ${avg.toFixed(1)} ft avg`, tone: "success" })
  }

  // 3. What film shows
  const made = play.clips.find((c) => c.result === "score" || c.result === "foul")
  const failed = play.clips.find((c) => c.result === "miss" || c.result === "turnover")
  if (made || failed) {
    const parts: string[] = []
    if (made) {
      parts.push(
        `when it works, it looks like ${made.label.toLowerCase()} ${filmName(made.filmId)} ${cite({ kind: "clip", label: `${filmName(made.filmId)} · ${made.clock}`, href: clipHref(made) })}`,
      )
    }
    if (failed) {
      parts.push(
        `when it breaks down, ${failed.label.toLowerCase()} ${filmName(failed.filmId)} ${cite({ kind: "clip", label: `${filmName(failed.filmId)} · ${failed.clock}`, href: clipHref(failed) })}`,
      )
    }
    body.push(`On film, ${parts.join("; ")}.`)
  }

  // 4. Westview and the fix
  const screens = play.frames.reduce((n, f) => n + f.actions.filter((a) => a.kind === "screen").length, 0)
  const passes = play.frames.reduce((n, f) => n + f.actions.filter((a) => a.kind === "pass").length, 0)
  const scouting = cite({ kind: "stat", label: "Westview: 2-3 on 61% of possessions", href: "/scouting/westview" })
  let westview: string
  if (play.vs === "zone") {
    westview = `Against Westview's 2-3 ${scouting}, this is a direct counter: ${passes} passes move the zone before the catch lands behind the bottom defender.`
  } else if (play.vs === "press") {
    westview = `Westview sits in a 2-3 and doesn't press ${scouting}, so this one is for Cedar Park's 1-2-1-1 on Jan 26.`
  } else if (play.category === "BLOB" || play.category === "SLOB" || play.vs === "any") {
    westview = `It works against Westview's 2-3 too ${scouting}: the first action (${screens} screen${screens === 1 ? "" : "s"}) doesn't depend on man coverage.`
  } else {
    const counter = cite({ kind: "play", label: "Short Corner Flood", href: "/plays/short-corner-flood" })
    westview = `It is a man set, and Westview plays 2-3 ${scouting}; run it after their switch to man, or go to Short Corner Flood ${counter} against the zone.`
  }
  const fix =
    tight && crowded
      ? ` Try moving ${pair.b + 1} out to the ${spotName([crowded[0] < 250 ? Math.max(20, crowded[0] - 120) : Math.min(480, crowded[0] + 120), crowded[1]])} in frame ${pair.frame + 1}.`
      : ""
  body.push(westview + fix)

  if (play.assignedTo > 0) {
    const rate = Math.round((play.studied / play.assignedTo) * 100)
    checks.push({
      label: "Studied",
      value: `${studiedLabel(play)} · ${rate}%`,
      tone: rate >= 80 ? "success" : "warning",
    })
  } else {
    checks.push({ label: "Studied", value: "Not published", tone: "neutral" })
  }

  return { body, citations, checks, credits: 5 }
}
