// Play model shared by web and mobile. Half-court coordinates in tenths of a foot:
// x 0-500 (sideline to sideline), y 0-420 (baseline to half-court line, NFHS 84 ft court), basket at the top.

export type Point = [number, number]
export type ActionKind = "cut" | "dribble" | "pass" | "screen" | "handoff"

export interface Action {
  kind: ActionKind
  from: Point
  to: Point
  via?: Point // optional bend point
}

export interface Frame {
  offense: Point[] // index 0..4 = players 1..5
  defense?: Point[]
  ball: number // index of the player with the ball
  actions: Action[] // actions that happen during this frame
  note?: string
}

export interface Play {
  id: string
  title: string
  section: "Half court" | "Out of bounds" | "Press break" | "Transition"
  tags: string[]
  edited: string
  frames: Frame[]
}

/** Linear interpolation between two frames' positions, t in [0, 1]. */
export function lerpFrame(a: Point[], b: Point[], t: number): Point[] {
  return a.map((p, i) => {
    const q = b[i] ?? p
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
  })
}
