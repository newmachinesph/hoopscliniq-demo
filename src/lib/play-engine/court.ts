// Typed bridge to hoops-court.js (a copy of plays/lib/court.js), the clipboard renderer the reels and the play player use: a Play DNA play.json in,
// SVG markup out. Same bridge as plays/video/src/court.ts.
import "./hoops-court.js"

export interface Clip {
  title: string
  fps: number
  frames: number
  players: Record<string, "offense" | "defense">
  moments: { frame: number; label: string; i: number }[] // sorted by frame
  holder: (string | null)[]
  ball: [number, number, number][] // [x, y, z] per frame; empty when the play has no ball track
  length: number // 47 (half court) or 94 (full court)
}
export interface Note {
  kind: string
  t0: number
  t1: number
}
export interface FrameOptions {
  notation?: boolean
  history?: boolean
  areas?: { fills: boolean; labels: boolean } | null
  highlightBall?: boolean
  highlightFill?: boolean
}
export interface FrameOut {
  areas: string
  dynamic: string
  f: number
  ballOwner: string | null
  viewBox: string
}

/** A named court area, in feet: a circle [cx, cy, r] or a rect [x0, y0, x1, y1]. First match wins. */
export interface CourtArea {
  id: string
  side: string
  circle?: [number, number, number]
  rect?: [number, number, number, number]
}

interface HoopsCourt {
  DICTIONARY_VERSION: string
  AREAS: CourtArea[]
  VIEW: { x: number; y: number; w: number; h: number }
  parsePlay(raw: unknown): Clip
  applyVerdicts(clip: Clip, labels: { verdicts: unknown[] } | null): { notes: Note[] }
  frame(clip: Clip, notes: Note[], src: number, opts: FrameOptions): FrameOut
  floorMarkup(opts?: { logoHref?: string | null; length?: number }): string
  linesMarkup(length?: number): string
}

export const H = (globalThis as unknown as { HoopsCourt: HoopsCourt }).HoopsCourt
