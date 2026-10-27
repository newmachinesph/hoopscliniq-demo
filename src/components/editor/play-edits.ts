// Pure, immutable edits on a play. The editor keeps every result in its undo history.

import type { PlaybookPlay } from "@/data/plays"
import { COURT_VIEW } from "@/lib/play-engine/court-play"
import type { Action, Frame, Point } from "@/lib/play-engine/types"

/** The court's viewBox, so pointer positions map to court coordinates. */
export const VIEW = COURT_VIEW

/** Seconds one frame takes at 1x (matches FRAME_MS in court-clip.ts). */
export const FRAME_SECONDS = 1.15

/** Phone layout (the tool tray, no keyboard shortcuts on screen): hints say "tap the tool" instead of "press 2". */
export function isPhone(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
}

export const ROLE_NAMES = ["Point guard", "Shooting guard", "Wing", "Power forward", "Center"]

const same = (a: Point | undefined, b: Point | undefined) => !!a && !!b && a[0] === b[0] && a[1] === b[1]

export function toCourt(clientX: number, clientY: number, rect: DOMRect): Point {
  const x = ((clientX - rect.left) / rect.width) * VIEW.w + VIEW.x
  const y = ((clientY - rect.top) / rect.height) * VIEW.h + VIEW.y
  return [Math.round(Math.max(-20, Math.min(520, x))), Math.round(Math.max(-30, Math.min(490, y)))]
}

export function nearestPlayer(points: Point[], at: Point, radius = 30): number | null {
  let best: number | null = null
  let bestDist = radius
  points.forEach((p, i) => {
    const d = Math.hypot(p[0] - at[0], p[1] - at[1])
    if (d <= bestDist) {
      best = i
      bestDist = d
    }
  })
  return best
}

function withFrames(play: PlaybookPlay, frames: Frame[]): PlaybookPlay {
  return { ...play, frames }
}

/** Move player `p` to `to` from frame `start` on, for as long as he stood still; arrows touching him follow. */
function relocate(frames: Frame[], start: number, p: number, to: Point): Frame[] {
  const old = frames[start]?.offense[p]
  if (!old) return frames
  const next = [...frames]
  for (let f = start; f < next.length; f++) {
    const frame = next[f] as Frame
    if (!same(frame.offense[p], old)) break
    next[f] = {
      ...frame,
      offense: frame.offense.map((q, i) => (i === p ? to : q)),
      actions: frame.actions.map((a) => (same(a.from, old) ? { ...a, from: to } : a)),
    }
  }
  const prev = next[start - 1]
  if (prev) {
    next[start - 1] = { ...prev, actions: prev.actions.map((a) => (same(a.to, old) ? { ...a, to } : a)) }
  }
  return next
}

export function movePlayer(play: PlaybookPlay, frame: number, p: number, to: Point): PlaybookPlay {
  return withFrames(play, relocate(play.frames, frame, p, to))
}

export function addPlayer(play: PlaybookPlay, at: Point): PlaybookPlay | null {
  if ((play.frames[0]?.offense.length ?? 0) >= 5) return null
  return withFrames(
    play,
    play.frames.map((f) => ({ ...f, offense: [...f.offense, at] })),
  )
}

function ensureNext(frames: Frame[], frame: number): Frame[] {
  if (frames[frame + 1]) return frames
  const current = frames[frame] as Frame
  return [...frames, { offense: current.offense, defense: current.defense, ball: current.ball, actions: [] }]
}

/**
 * Add an arrow to `frame`. A cut, dribble or screen moves the player there in the next frame; a pass hands the
 * ball to `receiver` in the next frame. The next frame is created when needed, so drawing builds the animation.
 */
export function addAction(play: PlaybookPlay, frame: number, action: Action, mover: number, receiver?: number) {
  let frames = ensureNext(play.frames, frame)
  frames = frames.map((f, i) => (i === frame ? { ...f, actions: [...f.actions, action] } : f))
  if ((action.kind === "pass" || action.kind === "handoff") && receiver !== undefined) {
    const oldBall = frames[frame + 1]?.ball
    frames = frames.map((f, i) => (i > frame && (i === frame + 1 || f.ball === oldBall) ? { ...f, ball: receiver } : f))
  } else {
    frames = relocate(frames, frame + 1, mover, action.to)
  }
  return withFrames(play, frames)
}

export function removeAction(play: PlaybookPlay, frame: number, index: number): PlaybookPlay {
  return withFrames(
    play,
    play.frames.map((f, i) => (i === frame ? { ...f, actions: f.actions.filter((_, k) => k !== index) } : f)),
  )
}

export function setNote(play: PlaybookPlay, frame: number, note: string): PlaybookPlay {
  return withFrames(
    play,
    play.frames.map((f, i) => (i === frame ? { ...f, note } : f)),
  )
}

/** New frame after `frame`, starting where everyone stands at the end of it. */
export function insertFrame(play: PlaybookPlay, frame: number): PlaybookPlay {
  const base = (play.frames[frame + 1] ?? play.frames[frame]) as Frame
  const fresh: Frame = { offense: base.offense, defense: base.defense, ball: base.ball, actions: [] }
  const frames = [...play.frames]
  frames.splice(frame + 1, 0, fresh)
  return withFrames(play, frames)
}

export function duplicateFrame(play: PlaybookPlay, frame: number): PlaybookPlay {
  const frames = [...play.frames]
  frames.splice(frame + 1, 0, { ...(play.frames[frame] as Frame) })
  return withFrames(play, frames)
}

export function deleteFrame(play: PlaybookPlay, frame: number): PlaybookPlay {
  if (play.frames.length <= 1) return play
  return withFrames(
    play,
    play.frames.filter((_, i) => i !== frame),
  )
}

/** Where a point sits on the half court, in coaching words. */
export function spotName([x, y]: Point): string {
  const side = x < 250 ? "left" : "right"
  if (y < 20 && x > 130 && x < 370) return `${side} dunker spot`
  if (y < 150 && (x < 45 || x > 455)) return `${side} corner`
  if (y < 100 && (x < 170 || x > 330)) return `${side} short corner`
  if (y < 130 && x >= 170 && x <= 330) return x > 225 && x < 275 ? "rim" : `${side} block`
  if (y < 230 && x >= 150 && x <= 350) return x > 215 && x < 285 ? "high post" : `${side} elbow`
  if (y < 280 && (x < 150 || x > 350)) return `${side} wing`
  if (y < 380) return x > 200 && x < 300 ? "top of the key" : `${side} slot`
  return "backcourt"
}
