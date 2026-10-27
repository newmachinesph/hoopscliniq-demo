// The Varsity Boys playbook: 25 editable plays (the Play model in lib/play-engine, drawn by PlayDiagram) plus the
// metadata the playbook, editor and ClinIQ read: category, assignments, and film stats, clips and "last run", which
// are all derived from the coach-confirmed tags in mocks/film.ts so a clip always opens on that play.

import type { ID, ISODate } from "@/data/types"
import type { Action, Frame, Play, Point } from "@/lib/play-engine/types"
import { at, relative } from "./clock"
import { isLocked } from "./consent"
import { films, gameClock, type Possession } from "./film"
import { players } from "./org"
import { games, opponentById, vsAt } from "./season"
import { playStudy } from "./study-plan"

export type PlayCategory = "Half court" | "Zone offense" | "BLOB" | "SLOB" | "Press break" | "Transition"

/**
 * Players who can be assigned plays: the roster minus anyone whose guardian consent is pending or declined (Mateo
 * Ruiz). Study stats read "12 of 12 eligible", so a locked player is never counted, even as a missing study.
 */
export const ELIGIBLE_COUNT = players.filter((p) => !isLocked(p)).length

/** "12 of 12 eligible" for a play assigned to every eligible player, "6 of 8 assigned" for a partial assignment. */
export function studiedLabel(p: { studied: number; assignedTo: number }): string {
  return `${p.studied} of ${p.assignedTo} ${p.assignedTo === ELIGIBLE_COUNT ? "eligible" : "assigned"}`
}

export interface PlayClip {
  /** Film ID: /film/<filmId> (our games only). */
  filmId: ID
  /** Seconds into the film, for /film/<filmId>?t=<t>. */
  t: number
  /** Game clock, e.g. "Q2 4:12". */
  clock: string
  label: string
  result: "score" | "miss" | "turnover" | "foul"
}

export interface PlayStats {
  /** Coach-confirmed possessions tagged with this play on our game film this season. 0 = not run on film yet. */
  timesRun: number
  /** Points per possession when run. */
  ppp: number
  /** Share of runs that ended in a score or a foul, 0-100. */
  successRate: number
}

export interface PlaybookPlay extends Play {
  category: PlayCategory
  /** One line for cards and ClinIQ. */
  summary: string
  /** What it is built to beat. */
  vs: "man" | "zone" | "press" | "any"
  authorId: ID
  updatedAt: ISODate
  stats: PlayStats
  /** Players it is assigned to (out of ELIGIBLE_COUNT). 0 = draft, not published. */
  assignedTo: number
  /** Assigned players who have studied it. */
  studied: number
  clips: PlayClip[]
  /** The most recent game where we ran it on film. */
  lastRun?: { date: ISODate; label: string; filmId: ID }
  /** In the game plan for the next opponent. */
  gamePlan?: "westview"
}

// ---------- frame builder ----------
// A step lists who moves (cut, dribble or screen) and an optional pass; the next frame's positions and ball holder
// follow from it, so every arrow ends exactly where the player stands in the next frame.

type MoveKind = "cut" | "dribble" | "screen"
interface Move {
  p: number
  to: Point
  via?: Point
  kind?: MoveKind
}
interface Step {
  note: string
  moves?: Move[]
  /** Index of the player who receives the pass, thrown from where the holder ends the step. */
  pass?: number
}
type Scheme = "man" | "zone"

const RIM: Point = [250, 52]
const ZONE_23: Point[] = [
  [200, 215],
  [300, 215],
  [140, 100],
  [360, 100],
  [250, 70],
]

/** Man defense: each defender a step inside his man, toward the rim. */
function manDefense(offense: Point[]): Point[] {
  return offense.map(([x, y]) => {
    const dx = RIM[0] - x
    const dy = RIM[1] - y
    const d = Math.hypot(dx, dy) || 1
    const k = Math.min(26, d * 0.4)
    return [Math.round(x + (dx / d) * k), Math.round(y + (dy / d) * k)]
  })
}

/** 2-3 zone, shading toward the ball. */
function zoneDefense(offense: Point[], ball: number): Point[] {
  const [bx, by] = offense[ball] ?? [250, 300]
  const shift = (bx - 250) * 0.28
  const sag = by < 150 ? 12 : 0
  return ZONE_23.map(([x, y]) => [Math.round(x + shift), y - sag])
}

function build(start: Point[], ball: number, steps: Step[], end: string, scheme: Scheme = "man"): Frame[] {
  const defend = (pos: Point[], holder: number) => (scheme === "zone" ? zoneDefense(pos, holder) : manDefense(pos))
  const frames: Frame[] = []
  let pos = start
  let holder = ball
  for (const step of steps) {
    const next = pos.map((p) => [p[0], p[1]] as Point)
    const actions: Action[] = []
    for (const m of step.moves ?? []) {
      const from = pos[m.p] as Point
      actions.push({ kind: m.kind ?? "cut", from, to: m.to, ...(m.via ? { via: m.via } : {}) })
      next[m.p] = m.to
    }
    let nextHolder = holder
    if (step.pass !== undefined) {
      actions.push({ kind: "pass", from: next[holder] as Point, to: next[step.pass] as Point })
      nextHolder = step.pass
    }
    frames.push({ offense: pos, defense: defend(pos, holder), ball: holder, actions, note: step.note })
    pos = next
    holder = nextHolder
  }
  frames.push({ offense: pos, defense: defend(pos, holder), ball: holder, actions: [], note: end })
  return frames
}

// ---------- frames ----------

const spainFrames: Frame[] = [
  {
    offense: [
      [250, 330],
      [45, 40],
      [455, 40],
      [420, 240],
      [250, 230],
    ],
    defense: [
      [250, 295],
      [70, 70],
      [430, 70],
      [395, 225],
      [250, 200],
    ],
    ball: 0,
    actions: [
      { kind: "screen", from: [250, 230], to: [272, 300] },
      { kind: "cut", from: [420, 240], to: [262, 238], via: [340, 230] },
    ],
    note: "5 sprints up to set the ball screen; 4 lifts behind the play.",
  },
  {
    offense: [
      [250, 330],
      [45, 40],
      [455, 40],
      [262, 238],
      [272, 300],
    ],
    defense: [
      [262, 288],
      [70, 70],
      [430, 70],
      [285, 232],
      [270, 270],
    ],
    ball: 0,
    actions: [
      { kind: "dribble", from: [250, 330], to: [160, 268], via: [205, 318] },
      { kind: "screen", from: [262, 238], to: [262, 258] },
    ],
    note: "1 attacks left off the screen; 4 back-screens 5's defender (Spain).",
  },
  {
    offense: [
      [160, 268],
      [45, 40],
      [455, 40],
      [262, 258],
      [272, 300],
    ],
    defense: [
      [180, 255],
      [70, 70],
      [430, 70],
      [280, 252],
      [255, 275],
    ],
    ball: 0,
    actions: [
      { kind: "cut", from: [272, 300], to: [250, 95], via: [290, 190] },
      { kind: "cut", from: [262, 258], to: [255, 345], via: [300, 300] },
      { kind: "pass", from: [160, 268], to: [250, 95] },
    ],
    note: "5 rolls hard to the rim, 4 pops to the top. Hit the roll or the pop.",
  },
  {
    offense: [
      [160, 268],
      [45, 40],
      [455, 40],
      [255, 345],
      [250, 95],
    ],
    defense: [
      [178, 250],
      [70, 70],
      [430, 70],
      [300, 330],
      [235, 120],
    ],
    ball: 4,
    actions: [],
    note: "Finish at the rim, or kick to the corner if the low man helps.",
  },
]

const hornsFlareFrames = build(
  [
    [250, 330],
    [45, 40],
    [455, 40],
    [170, 190],
    [330, 190],
  ],
  0,
  [
    {
      note: "Horns: 4 and 5 at the elbows. 5 steps up to set the ball screen while 2 lifts to the wing.",
      moves: [
        { p: 4, to: [285, 305], kind: "screen" },
        { p: 1, to: [70, 200], via: [40, 130] },
      ],
    },
    {
      note: "1 comes off the screen to the right; 5 rolls. 4 turns and sets the flare screen for 2.",
      moves: [
        { p: 0, to: [370, 260], via: [330, 325], kind: "dribble" },
        { p: 4, to: [285, 120], via: [310, 220] },
        { p: 3, to: [115, 215], kind: "screen" },
      ],
    },
    {
      note: "2 fades off the flare and 1 throws the skip pass over the top.",
      moves: [{ p: 1, to: [95, 300], via: [60, 265] }],
      pass: 1,
    },
  ],
  "2 catches in rhythm for the three. If X4 switches out, 4 seals for the duck-in.",
)

const chicagoFrames = build(
  [
    [250, 330],
    [70, 250],
    [430, 250],
    [40, 40],
    [460, 40],
  ],
  0,
  [
    {
      note: "5-out. 1 dribbles toward the left slot; 2 cuts to the block and 4 rises to set the pin-down.",
      moves: [
        { p: 0, to: [175, 305], via: [215, 330], kind: "dribble" },
        { p: 1, to: [150, 90], via: [100, 165] },
        { p: 3, to: [110, 135], kind: "screen" },
      ],
    },
    {
      note: "2 comes off the pin-down into the handoff with 1 (Chicago).",
      moves: [{ p: 1, to: [185, 265], via: [100, 175] }],
      pass: 1,
    },
    {
      note: "2 turns the corner downhill. 4 slips to the rim; 1 relocates to the wing.",
      moves: [
        { p: 1, to: [255, 150], via: [235, 230], kind: "dribble" },
        { p: 3, to: [205, 60], via: [150, 85] },
        { p: 0, to: [70, 240], via: [120, 300] },
      ],
    },
  ],
  "Lay it up, hit 4 on the slip, or kick to 3 or 5 when the help comes.",
)

const hammerFrames = build(
  [
    [430, 240],
    [45, 40],
    [455, 40],
    [250, 300],
    [330, 110],
  ],
  0,
  [
    {
      note: "3 lifts out of the corner to empty the baseline; 4 drifts to the weak-side wing.",
      moves: [
        { p: 2, to: [345, 315], via: [465, 190] },
        { p: 3, to: [130, 240], via: [190, 290] },
      ],
    },
    {
      note: "1 drives baseline. 5 clears to the weak-side dunker spot; 4 sets the hammer screen on X2.",
      moves: [
        { p: 0, to: [395, 85], via: [450, 150], kind: "dribble" },
        { p: 4, to: [160, 35], via: [250, 80] },
        { p: 3, to: [85, 100], kind: "screen" },
      ],
    },
    {
      note: "2 fades behind the hammer screen and 1 throws it over the top.",
      moves: [{ p: 1, to: [60, 205], via: [28, 125] }],
      pass: 1,
    },
  ],
  "2 shoots the three behind the screen. If X2 cheats over, 5 is open at the dunker spot.",
)

const floppyFrames = build(
  [
    [250, 330],
    [250, 60],
    [160, 110],
    [340, 110],
    [370, 150],
  ],
  0,
  [
    {
      note: "2 starts under the rim and jabs toward 3's single screen; 1 dribbles to the right slot.",
      moves: [
        { p: 1, to: [195, 90] },
        { p: 0, to: [300, 320], kind: "dribble" },
      ],
    },
    {
      note: "2 reverses and runs off the 4-5 double screen to the right wing.",
      moves: [
        { p: 1, to: [440, 240], via: [330, 75] },
        { p: 3, to: [350, 130], kind: "screen" },
        { p: 4, to: [385, 170], kind: "screen" },
      ],
    },
    {
      note: "1 hits 2 on the move. 4 flashes to the high post; 3 seals the lane.",
      moves: [
        { p: 3, to: [300, 185], via: [320, 160] },
        { p: 2, to: [235, 85] },
      ],
      pass: 1,
    },
  ],
  "2 catches on the move for the jumper. Trailed: curl. Cheated: 4 is open on the flash.",
)

const boxBlobFrames = build(
  [
    [250, -15],
    [170, 60],
    [330, 60],
    [170, 160],
    [330, 160],
  ],
  0,
  [
    {
      note: "Box set. 5 cross-screens for 4 at the elbows; 2 clears to the left wing as the outlet.",
      moves: [
        { p: 4, to: [200, 155], kind: "screen" },
        { p: 1, to: [90, 230], via: [100, 130] },
      ],
    },
    {
      note: "3 seals and steps to the rim; 4 flashes to the top as the safety. 1 hits 3.",
      moves: [
        { p: 2, to: [255, 65] },
        { p: 3, to: [245, 300], via: [190, 250] },
      ],
      pass: 2,
    },
    {
      note: "1 steps in to the dunker spot for the dump-off.",
      moves: [{ p: 0, to: [150, 30], via: [200, 10] }],
    },
  ],
  "Layup for 3. If X3 fronts, 1 is open at the dunker spot and 4 resets at the top.",
)

const sidelineFrames = build(
  [
    [505, 300],
    [380, 330],
    [250, 260],
    [170, 140],
    [330, 140],
  ],
  0,
  [
    {
      note: "3 screens for 2, who comes back toward half court for the safe catch.",
      moves: [
        { p: 2, to: [360, 300], kind: "screen" },
        { p: 1, to: [260, 410], via: [330, 380] },
      ],
      pass: 1,
    },
    {
      note: "1 steps in from out of bounds; 5 sets the screen for the inbounder.",
      moves: [
        { p: 0, to: [445, 270], via: [480, 300] },
        { p: 4, to: [405, 215], kind: "screen" },
      ],
    },
    {
      note: "1 runs off 5 down the sideline to the corner; 5 rolls. 2 swings it.",
      moves: [
        { p: 0, to: [440, 65], via: [470, 170] },
        { p: 4, to: [300, 90], via: [350, 160] },
      ],
      pass: 0,
    },
  ],
  "1 catches in the corner for three or hits 5 rolling. Late clock: 2 drives the middle.",
)

const pressBreakFrames = build(
  [
    [250, 415],
    [60, 300],
    [440, 300],
    [250, 220],
    [250, 60],
  ],
  0,
  [
    {
      note: "1-4 look. 2 comes back to the ball and 4 flashes to the middle.",
      moves: [
        { p: 1, to: [90, 420] },
        { p: 3, to: [250, 330] },
      ],
      pass: 1,
    },
    {
      note: "Before the trap closes, 2 hits 4 in the middle. 3 streaks up the sideline; 1 steps in behind.",
      moves: [
        { p: 0, to: [330, 420], via: [300, 415] },
        { p: 2, to: [430, 180] },
      ],
      pass: 3,
    },
    {
      note: "4 turns and attacks; 3 and 5 fill the 2-on-1.",
      moves: [
        { p: 3, to: [250, 245], kind: "dribble" },
        { p: 2, to: [420, 110] },
        { p: 4, to: [205, 90] },
      ],
      pass: 2,
    },
  ],
  "3 attacks the 2-on-1 with 5 at the rim. The middle catch beats the trap every time.",
)

const transitionFrames = build(
  [
    [250, 415],
    [60, 300],
    [440, 300],
    [200, 415],
    [300, 400],
  ],
  0,
  [
    {
      note: "Wings sprint to the corners, 5 runs to the rim, 4 trails. 1 pushes it.",
      moves: [
        { p: 0, to: [250, 330], kind: "dribble" },
        { p: 1, to: [45, 40], via: [40, 170] },
        { p: 2, to: [455, 40], via: [460, 170] },
        { p: 4, to: [300, 70], via: [310, 220] },
        { p: 3, to: [220, 390] },
      ],
    },
    {
      note: "1 takes it to the right wing; 5 posts ball-side and 4 trails to the top.",
      moves: [
        { p: 0, to: [380, 250], via: [330, 305], kind: "dribble" },
        { p: 4, to: [320, 85] },
        { p: 3, to: [245, 320] },
      ],
    },
    {
      note: "Early post touch for 5 before the defense matches up.",
      pass: 4,
    },
  ],
  "5 scores on the early seal, or kicks to 4 for the reversal and a corner three.",
)

const shortCornerFrames = build(
  [
    [250, 330],
    [75, 230],
    [425, 230],
    [180, 90],
    [320, 80],
  ],
  0,
  [
    {
      note: "Swing to the wing. 5 slides to the short corner; 4 flashes to the high post.",
      moves: [
        { p: 4, to: [395, 55] },
        { p: 3, to: [250, 195], via: [200, 150] },
        { p: 1, to: [110, 280] },
      ],
      pass: 2,
    },
    {
      note: "3 hits 4 at the high post. The middle of the zone has to step up.",
      pass: 3,
    },
    {
      note: "4 turns and finds 5 in the short corner; 2 slashes along the weak-side baseline.",
      moves: [{ p: 1, to: [180, 55], via: [140, 170] }],
      pass: 4,
    },
  ],
  "5 shoots the 10-footer, or hits 2 on the baseline when the back-side defender steps up.",
  "zone",
)

const zoneGutFrames = build(
  [
    [160, 310],
    [340, 310],
    [45, 40],
    [400, 60],
    [180, 80],
  ],
  0,
  [
    {
      note: "Two-guard front. 1 attacks the gap between the top two defenders.",
      moves: [
        { p: 0, to: [235, 255], via: [190, 300], kind: "dribble" },
        { p: 3, to: [330, 40] },
        { p: 4, to: [170, 180], via: [160, 130] },
      ],
    },
    {
      note: "Both top defenders collapse on 1. Kick to 2 on the right slot.",
      pass: 1,
    },
    {
      note: "2 attacks the closeout and dumps it to 4 on the baseline.",
      moves: [{ p: 1, to: [380, 220], kind: "dribble" }],
      pass: 3,
    },
  ],
  "4 finishes at the rim. If the bottom defender stays home, 2 has the pull-up.",
  "zone",
)

const baselineRunnerFrames = build(
  [
    [250, 330],
    [45, 40],
    [430, 230],
    [160, 170],
    [180, 80],
  ],
  0,
  [
    {
      note: "1 swings it to 3 while 2 runs the baseline under the zone and 5 screens the bottom defender.",
      moves: [
        { p: 1, to: [455, 45], via: [250, 15] },
        { p: 4, to: [300, 60], kind: "screen" },
      ],
      pass: 2,
    },
    {
      note: "3 hits 2 in the corner; 4 flashes to the middle of the zone.",
      moves: [{ p: 3, to: [250, 190] }],
      pass: 1,
    },
  ],
  "2 shoots the corner three. Closeout: 4 is open in the middle.",
  "zone",
)

const chinFrames = build(
  [
    [250, 330],
    [70, 230],
    [455, 40],
    [45, 40],
    [170, 190],
  ],
  0,
  [
    {
      note: "1 dribbles to the right slot. 5 turns and sets the chin back screen for 2.",
      moves: [
        { p: 0, to: [330, 300], kind: "dribble" },
        { p: 4, to: [115, 215], kind: "screen" },
      ],
    },
    {
      note: "2 back-cuts hard to the rim. 5 pops to the top.",
      moves: [
        { p: 1, to: [230, 65], via: [150, 165] },
        { p: 4, to: [245, 320], via: [170, 300] },
      ],
    },
    {
      note: "No lob, so 1 hits 5 at the top; 2 clears to the right short corner.",
      moves: [{ p: 1, to: [400, 60] }],
      pass: 4,
    },
  ],
  "Lob to 2 if X2 trails; otherwise 5 has the ball at the top with the floor flat for a DHO.",
)

const elevatorFrames = build(
  [
    [420, 240],
    [250, 60],
    [45, 40],
    [215, 250],
    [285, 250],
  ],
  0,
  [
    {
      note: "2 starts under the rim and walks up the lane toward the doors (4 and 5).",
      moves: [{ p: 1, to: [250, 195] }],
    },
    {
      note: "2 sprints through the doors; 4 and 5 close them behind him.",
      moves: [
        { p: 1, to: [250, 330], via: [250, 270] },
        { p: 3, to: [238, 262], kind: "screen" },
        { p: 4, to: [262, 262], kind: "screen" },
      ],
    },
    {
      note: "1 hits 2 at the top; 4 rolls to the rim.",
      moves: [{ p: 3, to: [210, 90], via: [215, 180] }],
      pass: 1,
    },
  ],
  "2 shoots with both defenders walled off. If X4 switches, 4 has the mismatch rolling.",
)

const ramFrames = build(
  [
    [250, 330],
    [45, 40],
    [455, 40],
    [150, 200],
    [170, 80],
  ],
  0,
  [
    {
      note: "4 sets the ram screen on 5's defender.",
      moves: [{ p: 3, to: [185, 140], kind: "screen" }],
    },
    {
      note: "5 comes off the ram screen to set the ball screen; 4 pops to the wing.",
      moves: [
        { p: 4, to: [225, 300], via: [215, 170] },
        { p: 3, to: [90, 230], via: [120, 160] },
      ],
    },
    {
      note: "1 attacks left off 5; 5 rolls with his defender trailing.",
      moves: [
        { p: 0, to: [150, 270], via: [200, 325], kind: "dribble" },
        { p: 4, to: [245, 85], via: [260, 200] },
      ],
    },
    {
      note: "Hit the roll before the low man tags.",
      pass: 4,
    },
  ],
  "5 finishes at the rim. If X2 tags the roll, kick to 2 in the corner.",
)

const atoStackFrames = build(
  [
    [250, 340],
    [170, 210],
    [455, 40],
    [170, 160],
    [170, 110],
  ],
  0,
  [
    {
      note: "Stack on the left lane line. 2 pops to the wing; 4 cuts across to the right elbow.",
      moves: [
        { p: 1, to: [80, 240], via: [110, 235] },
        { p: 3, to: [330, 190], via: [250, 150] },
      ],
    },
    {
      note: "1 hits 2. 5 steps up to set the back screen on 1's defender.",
      moves: [{ p: 4, to: [215, 255], kind: "screen" }],
      pass: 1,
    },
    {
      note: "1 cuts off the back screen to the rim and 2 throws the lob.",
      moves: [{ p: 0, to: [225, 70], via: [190, 230] }],
      pass: 0,
    },
  ],
  "Lob for 1. If X5 helps, 5 pops to the slot for the jumper.",
)

const hornsTwistFrames = build(
  [
    [250, 330],
    [45, 40],
    [455, 40],
    [170, 190],
    [330, 190],
  ],
  0,
  [
    {
      note: "Horns: 4 and 5 at the elbows. 5 steps up to set the ball screen for 1 going right.",
      moves: [{ p: 4, to: [285, 305], kind: "screen" }],
    },
    {
      note: "1 rejects back to the middle as 4 sprints up to screen the other way: the twist.",
      moves: [
        { p: 0, to: [290, 335], kind: "dribble" },
        { p: 3, to: [235, 305], kind: "screen" },
        { p: 4, to: [330, 230] },
      ],
    },
    {
      note: "1 comes off 4's screen going left. 5 rolls to the rim and 4 pops to the top.",
      moves: [
        { p: 0, to: [150, 255], via: [200, 315], kind: "dribble" },
        { p: 4, to: [265, 95], via: [300, 160] },
        { p: 3, to: [250, 350] },
      ],
      pass: 4,
    },
  ],
  "5 finishes on the roll. If the low man helps, kick to the corner; if they switch, 4 is open at the top.",
)

const hornsDownFrames = build(
  [
    [250, 330],
    [45, 40],
    [455, 40],
    [170, 190],
    [330, 190],
  ],
  0,
  [
    {
      note: "Horns. 1 enters to 4 at the left elbow and fades to the left slot.",
      moves: [{ p: 0, to: [150, 290], via: [210, 330] }],
      pass: 3,
    },
    {
      note: "5 sets a down screen for 3 in the right corner. 3 comes up to the right slot.",
      moves: [
        { p: 4, to: [410, 95], kind: "screen" },
        { p: 2, to: [365, 255], via: [440, 140] },
      ],
    },
    {
      note: "4 hits 3 coming off the down screen; 5 seals on the block.",
      moves: [{ p: 4, to: [320, 70] }],
      pass: 2,
    },
  ],
  "3 shoots the catch-and-shoot three or drives the closeout. If they switch, 5 posts the smaller defender.",
)

const spainSlipFrames = build(
  [
    [250, 330],
    [45, 40],
    [455, 40],
    [420, 240],
    [250, 230],
  ],
  0,
  [
    {
      note: "Spain look: 5 runs up for the ball screen while 4 lifts behind it.",
      moves: [
        { p: 4, to: [272, 300], kind: "screen" },
        { p: 3, to: [262, 238], via: [340, 230] },
      ],
    },
    {
      note: "Their big jumps the screen early, so 5 slips before contact. 4 back-screens 5's defender.",
      moves: [
        { p: 4, to: [255, 100], via: [285, 200] },
        { p: 3, to: [262, 262], kind: "screen" },
        { p: 0, to: [205, 305], via: [235, 330], kind: "dribble" },
      ],
    },
    {
      note: "1 hits 5 on the slip; 4 pops to the top.",
      moves: [{ p: 3, to: [255, 345], via: [300, 300] }],
      pass: 4,
    },
  ],
  "Layup for 5 when the defense jumps the ball screen. If the low man helps, 4 is open for the pop three.",
)

const oneFourRubFrames = build(
  [
    [250, 340],
    [70, 250],
    [430, 250],
    [170, 200],
    [330, 200],
  ],
  0,
  [
    {
      note: "1-4 High. 1 passes to 3 on the right wing.",
      pass: 2,
    },
    {
      note: "1 rub-cuts off 5 at the right elbow to the rim; 4 replaces at the top.",
      moves: [
        { p: 0, to: [330, 85], via: [290, 230] },
        { p: 3, to: [250, 335], via: [200, 280] },
      ],
    },
    {
      note: "3 hits 1 on the rub cut.",
      pass: 0,
    },
  ],
  "Layup off the rub. If it is denied, 5 steps out for a ball screen with 3 and 4 spaces at the top.",
)

const oneFourBackdoorFrames = build(
  [
    [250, 340],
    [70, 250],
    [430, 250],
    [170, 200],
    [330, 200],
  ],
  0,
  [
    {
      note: "1-4 High. 1 enters to 5 at the right elbow.",
      pass: 4,
    },
    {
      note: "3 is overplayed on the wing and cuts backdoor; 1 cuts away to clear the side.",
      moves: [
        { p: 2, to: [290, 70], via: [420, 150] },
        { p: 0, to: [120, 320], via: [190, 340] },
      ],
    },
    {
      note: "5 bounce-passes to 3 on the backdoor cut.",
      pass: 2,
    },
  ],
  "3 lays it in. If the cut is covered, 2 flashes to the top for the reversal and 4 posts.",
)

const overloadFrames = build(
  [
    [250, 330],
    [70, 250],
    [45, 40],
    [250, 200],
    [330, 80],
  ],
  0,
  [
    {
      note: "Against the 1-3-1: 4 flashes to the high post and 1 enters it. 3 starts in the left corner.",
      pass: 3,
    },
    {
      note: "3 runs the baseline to the right corner behind the bottom defender; 5 seals him.",
      moves: [
        { p: 2, to: [455, 40], via: [250, 22] },
        { p: 4, to: [370, 60], kind: "screen" },
      ],
    },
    {
      note: "4 turns and skips it to 3 in the right corner.",
      pass: 2,
    },
  ],
  "Corner three for 3. If the bottom defender jumps out, 5 ducks in for the layup.",
  "zone",
)

const pressDiamondFrames = build(
  [
    [250, 415],
    [90, 330],
    [410, 330],
    [250, 250],
    [250, 90],
  ],
  0,
  [
    {
      note: "Diamond: 2 and 3 at the sides, 4 in the middle, 5 deep. 2 steps back to the ball for the inbound.",
      moves: [{ p: 1, to: [110, 405] }],
      pass: 1,
    },
    {
      note: "Before the trap closes, 2 hits 4 flashing to the middle. 1 steps in behind as the safety.",
      moves: [
        { p: 3, to: [250, 330] },
        { p: 0, to: [220, 430] },
      ],
      pass: 3,
    },
    {
      note: "4 turns and attacks; 3 and 5 fill the lanes.",
      moves: [
        { p: 3, to: [250, 230], kind: "dribble" },
        { p: 2, to: [420, 120] },
        { p: 4, to: [160, 80] },
      ],
      pass: 2,
    },
  ],
  "Finish the 2-on-1 at the rim, or hit 5 for the layup when the last defender takes 3.",
)

const lineBlobFrames = build(
  [
    [250, -15],
    [250, 75],
    [250, 130],
    [250, 185],
    [250, 240],
  ],
  0,
  [
    {
      note: "Line: 2, 3, 4 and 5 stacked in the lane. 2 breaks to the left corner, 3 to the right wing.",
      moves: [
        { p: 1, to: [60, 45], via: [150, 60] },
        { p: 2, to: [420, 230], via: [350, 150] },
      ],
    },
    {
      note: "4 down-screens 5's defender; 5 rolls to the rim and 1 hits him.",
      moves: [
        { p: 3, to: [235, 110], kind: "screen" },
        { p: 4, to: [275, 55], via: [300, 150] },
      ],
      pass: 4,
    },
  ],
  "Layup for 5. If they switch, 2 is open in the corner and 4 pops to the top as the safety.",
)

const dragFrames = build(
  [
    [250, 415],
    [60, 300],
    [440, 300],
    [200, 415],
    [300, 400],
  ],
  0,
  [
    {
      note: "Early offense: wings run wide, 5 rim-runs, 4 trails the play.",
      moves: [
        { p: 0, to: [250, 340], kind: "dribble" },
        { p: 1, to: [45, 40], via: [40, 170] },
        { p: 2, to: [455, 40], via: [460, 170] },
        { p: 4, to: [250, 70], via: [290, 220] },
        { p: 3, to: [270, 370] },
      ],
    },
    {
      note: "4 sprints into a drag screen; 1 comes off it to the right.",
      moves: [
        { p: 3, to: [230, 320], kind: "screen" },
        { p: 0, to: [350, 270], via: [300, 335], kind: "dribble" },
      ],
    },
    {
      note: "4 pops to the left slot after the screen and 1 throws it back.",
      moves: [{ p: 3, to: [160, 280] }],
      pass: 3,
    },
  ],
  "4 shoots the trail three, or attacks the closeout with 5 sealing at the rim.",
)

// ---------- the playbook ----------

type PlaybookSeed = Omit<PlaybookPlay, "edited" | "stats" | "assignedTo" | "studied" | "clips" | "lastRun">

const playbook: PlaybookSeed[] = [
  {
    id: "spain-pnr",
    title: "Spain Pick and Roll",
    section: "Half court",
    category: "Half court",
    summary: "Ball screen with a back screen on the roller's defender; the roll or the pop is open.",
    vs: "man",
    tags: ["PnR", "vs man", "Spain"],
    authorId: "staff-reyes",
    updatedAt: at(0, "12:40"),
    frames: spainFrames,
  },
  {
    id: "horns-flare",
    title: "Horns Flare",
    section: "Half court",
    category: "Half court",
    summary: "Horns ball screen into a flare for the shooter on the skip.",
    vs: "any",
    tags: ["Horns", "vs man", "Shooter"],
    authorId: "staff-reyes",
    updatedAt: at(-1, "16:10"),
    gamePlan: "westview",
    frames: hornsFlareFrames,
  },
  {
    id: "five-out-chicago",
    title: "5-Out Chicago",
    section: "Half court",
    category: "Half court",
    summary: "Pin-down straight into a handoff; the wing turns the corner downhill.",
    vs: "any",
    tags: ["5-out", "DHO", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-3, "10:00"),
    gamePlan: "westview",
    frames: chicagoFrames,
  },
  {
    id: "hammer",
    title: "Hammer",
    section: "Half court",
    category: "Half court",
    summary: "Baseline drive with a hammer screen for the weak-side corner shooter.",
    vs: "man",
    tags: ["Baseline drive", "Shooter", "vs man"],
    authorId: "staff-whitfield",
    updatedAt: at(-5, "09:30"),
    frames: hammerFrames,
  },
  {
    id: "floppy",
    title: "Floppy",
    section: "Half court",
    category: "Half court",
    summary: "Shooter under the rim picks a side: single screen or the double.",
    vs: "man",
    tags: ["Off-ball", "Shooter", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-7, "17:45"),
    frames: floppyFrames,
  },
  {
    id: "box-blob",
    title: "Box BLOB",
    section: "Out of bounds",
    category: "BLOB",
    summary: "Box set under our basket: cross screen, seal to the rim, inbounder steps in.",
    vs: "any",
    tags: ["vs man", "vs zone", "Quick hitter"],
    authorId: "staff-whitfield",
    updatedAt: at(-2, "15:20"),
    gamePlan: "westview",
    frames: boxBlobFrames,
  },
  {
    id: "sideline-ob",
    title: "Sideline OB",
    section: "Out of bounds",
    category: "SLOB",
    summary: "Safe catch first, then screen the inbounder down the sideline.",
    vs: "man",
    tags: ["Late clock", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-7, "11:00"),
    frames: sidelineFrames,
  },
  {
    id: "press-break",
    title: "Press Break 1-4",
    section: "Press break",
    category: "Press break",
    summary: "Catch, hit the middle before the trap closes, attack the 2-on-1.",
    vs: "press",
    tags: ["vs press", "1-4"],
    authorId: "staff-whitfield",
    updatedAt: at(-4, "08:15"),
    frames: pressBreakFrames,
  },
  {
    id: "primary-transition",
    title: "Primary Transition",
    section: "Transition",
    category: "Transition",
    summary: "Run wide, rim-run with 5, early post touch before the defense matches up.",
    vs: "any",
    tags: ["Early offense", "Rim run"],
    authorId: "staff-reyes",
    updatedAt: at(-14, "13:00"),
    frames: transitionFrames,
  },
  {
    id: "short-corner-flood",
    title: "Short Corner Flood",
    section: "Half court",
    category: "Zone offense",
    summary: "High-post catch, then the short corner behind the bottom of the 2-3.",
    vs: "zone",
    tags: ["vs 2-3", "Short corner", "High post"],
    authorId: "staff-reyes",
    updatedAt: at(0, "10:15"),
    gamePlan: "westview",
    frames: shortCornerFrames,
  },
  {
    id: "zone-gut",
    title: "Zone Gut",
    section: "Half court",
    category: "Zone offense",
    summary: "Gap the top of the zone, kick, then dump to the baseline.",
    vs: "zone",
    tags: ["vs 2-3", "Gap", "High-low"],
    authorId: "staff-tran",
    updatedAt: at(-1, "20:30"),
    gamePlan: "westview",
    frames: zoneGutFrames,
  },
  {
    id: "baseline-runner",
    title: "Baseline Runner",
    section: "Half court",
    category: "Zone offense",
    summary: "Shooter runs the baseline under the 2-3 off a screen on the bottom defender.",
    vs: "zone",
    tags: ["vs 2-3", "Shooter"],
    authorId: "staff-patel",
    updatedAt: at(0, "09:05"),
    gamePlan: "westview",
    frames: baselineRunnerFrames,
  },
  {
    id: "chin",
    title: "Chin",
    section: "Half court",
    category: "Half court",
    summary: "Back screen at the elbow for the wing, then the screener pops for the DHO.",
    vs: "man",
    tags: ["Back screen", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-9, "14:30"),
    frames: chinFrames,
  },
  {
    id: "elevator",
    title: "Elevator",
    section: "Half court",
    category: "Half court",
    summary: "Shooter runs through the doors; 4 and 5 close them behind him.",
    vs: "man",
    tags: ["Shooter", "ATO", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-6, "19:10"),
    frames: elevatorFrames,
  },
  {
    id: "ram-pnr",
    title: "Ram PnR",
    section: "Half court",
    category: "Half court",
    summary: "A down screen on the screener's defender, then the ball screen and a free roll.",
    vs: "man",
    tags: ["PnR", "Ram", "vs man"],
    authorId: "staff-whitfield",
    updatedAt: at(-10, "16:00"),
    frames: ramFrames,
  },
  {
    id: "ato-stack",
    title: "ATO Stack",
    section: "Half court",
    category: "Half court",
    summary: "Stack on the lane line hides a back screen for a lob after the timeout.",
    vs: "man",
    tags: ["ATO", "Back screen", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-3, "21:00"),
    frames: atoStackFrames,
  },
  {
    id: "horns-twist",
    title: "Horns Twist",
    section: "Half court",
    category: "Half court",
    summary: "Horns ball screen, then the other big re-screens the opposite way: the twist.",
    vs: "man",
    tags: ["Horns", "PnR", "vs man"],
    authorId: "staff-reyes",
    updatedAt: at(-36, "20:10"),
    frames: hornsTwistFrames,
  },
  {
    id: "horns-down",
    title: "Horns Down",
    section: "Half court",
    category: "Half court",
    summary: "Horns entry to the elbow, then a down screen for the corner shooter.",
    vs: "any",
    tags: ["Horns", "Down screen", "Shooter"],
    authorId: "staff-whitfield",
    updatedAt: at(-21, "19:30"),
    frames: hornsDownFrames,
  },
  {
    id: "spain-slip",
    title: "Spain Slip",
    section: "Half court",
    category: "Half court",
    summary: "The Spain look, but 5 slips the ball screen before contact when they jump it.",
    vs: "man",
    tags: ["PnR", "Spain", "Counter"],
    authorId: "staff-reyes",
    updatedAt: at(-26, "21:15"),
    frames: spainSlipFrames,
  },
  {
    id: "one-four-rub",
    title: "1-4 High Rub",
    section: "Half court",
    category: "Half court",
    summary: "1-4 High entry to the wing; the point guard rub-cuts off the elbow to the rim.",
    vs: "man",
    tags: ["1-4 High", "Rub cut", "vs man"],
    authorId: "staff-whitfield",
    updatedAt: at(-36, "18:00"),
    frames: oneFourRubFrames,
  },
  {
    id: "one-four-backdoor",
    title: "1-4 High Backdoor",
    section: "Half court",
    category: "Half court",
    summary: "Elbow entry from 1-4 High; the overplayed wing cuts backdoor.",
    vs: "man",
    tags: ["1-4 High", "Backdoor", "vs pressure"],
    authorId: "staff-reyes",
    updatedAt: at(-26, "20:40"),
    frames: oneFourBackdoorFrames,
  },
  {
    id: "overload-131",
    title: "1-3-1 Overload",
    section: "Half court",
    category: "Zone offense",
    summary: "Overload one side of the 1-3-1; the shooter runs the baseline behind the bottom defender.",
    vs: "zone",
    tags: ["vs 1-3-1", "Overload", "Baseline"],
    authorId: "staff-patel",
    updatedAt: at(-2, "21:05"),
    gamePlan: "westview",
    frames: overloadFrames,
  },
  {
    id: "press-diamond",
    title: "Press Break Diamond",
    section: "Press break",
    category: "Press break",
    summary: "Diamond against full-court man: hit the middle before the trap closes, then fill the lanes.",
    vs: "press",
    tags: ["vs press", "Diamond"],
    authorId: "staff-whitfield",
    updatedAt: at(-9, "17:50"),
    frames: pressDiamondFrames,
  },
  {
    id: "line-blob",
    title: "Line BLOB",
    section: "Out of bounds",
    category: "BLOB",
    summary: "Four in a line in the lane: two break to the outside, then a down screen frees the big at the rim.",
    vs: "man",
    tags: ["vs man", "Quick hitter"],
    authorId: "staff-whitfield",
    updatedAt: at(-40, "16:30"),
    frames: lineBlobFrames,
  },
  {
    id: "drag-screen",
    title: "Drag Screen",
    section: "Transition",
    category: "Transition",
    summary: "The trailer sprints into a drag screen in early offense, then pops for the trail three.",
    vs: "any",
    tags: ["Early offense", "PnR"],
    authorId: "staff-reyes",
    updatedAt: at(-30, "15:00"),
    frames: dragFrames,
  },
]

type FilmRun = { filmId: ID; date: ISODate; gameId?: ID; p: Possession }

/** Our game films, newest first. */
const gameFilms = films.filter((f) => f.kind === "game").sort((a, b) => b.date.localeCompare(a.date))

/** Every coach-confirmed possession tagged with this play, newest film first. ClinIQ suggestions don't count. */
function filmRuns(playId: ID): FilmRun[] {
  return gameFilms.flatMap((f) =>
    f.possessions
      .filter((p) => p.side === "us" && p.playId === playId && p.tag?.status === "confirmed")
      .map((p) => ({ filmId: f.id, date: f.date, gameId: f.gameId, p })),
  )
}

function statsOf(runs: FilmRun[]): PlayStats {
  if (runs.length === 0) return { timesRun: 0, ppp: 0, successRate: 0 }
  const points = runs.reduce((sum, r) => sum + r.p.points, 0)
  const scored = runs.filter((r) => r.p.points > 0).length
  return {
    timesRun: runs.length,
    ppp: Math.round((points / runs.length) * 100) / 100,
    successRate: Math.round((scored / runs.length) * 100),
  }
}

function clipResult(p: Possession): PlayClip["result"] {
  if (p.result === "TOV") return "turnover"
  if (p.result.startsWith("FT")) return "foul"
  return p.points > 0 ? "score" : "miss"
}

const clipLabels: Record<Possession["result"], string> = {
  "3PT make": "Made three",
  "3PT miss": "Missed three",
  "2PT make": "Made two",
  "2PT miss": "Missed two",
  "And-1": "And-one",
  "FT 2/2": "Fouled, 2 of 2 at the line",
  "FT 1/2": "Fouled, 1 of 2 at the line",
  "FT 0/2": "Fouled, 0 of 2 at the line",
  TOV: "Turnover",
}

function clipLabel(p: Possession): string {
  if (p.result !== "TOV") return clipLabels[p.result]
  if (!p.note) return "Turnover"
  return p.note.startsWith("vs ") ? `Turnover ${p.note}` : `Turnover (${p.note.toLowerCase()})`
}

/** Up to three clips from different games, newest first: a good look, then one that broke down, then another. */
function clipsOf(runs: FilmRun[]): PlayClip[] {
  const byFilm = new Map<ID, FilmRun[]>()
  for (const r of runs) byFilm.set(r.filmId, [...(byFilm.get(r.filmId) ?? []), r])
  const wants: ("good" | "bad")[] = ["good", "bad", "good"]
  const clips: PlayClip[] = []
  for (const list of byFilm.values()) {
    if (clips.length === 3) break
    const want = wants[clips.length]
    const pick = list.find((r) => r.p.points > 0 === (want === "good")) ?? (list[0] as FilmRun)
    const { q, clock } = gameClock(pick.p.gameStart)
    clips.push({
      filmId: pick.filmId,
      t: Math.floor(pick.p.start),
      clock: `Q${q} ${clock}`,
      label: clipLabel(pick.p),
      result: clipResult(pick.p),
    })
  }
  return clips
}

function lastRunOf(runs: FilmRun[]): PlaybookPlay["lastRun"] {
  const latest = runs[0]
  const game = latest && games.find((g) => g.id === latest.gameId)
  if (!latest || !game) return undefined
  return {
    date: latest.date,
    label: `${vsAt(game)} ${opponentById(game.opponentId)?.name ?? ""}`,
    filmId: latest.filmId,
  }
}

export const plays: PlaybookPlay[] = playbook.map((p) => {
  const runs = filmRuns(p.id)
  const { assignedTo, studied } = playStudy(p.id)
  return {
    ...p,
    edited: relative(p.updatedAt),
    stats: statsOf(runs),
    assignedTo,
    studied,
    clips: clipsOf(runs),
    lastRun: lastRunOf(runs),
  }
})

export function getPlay(id: string): PlaybookPlay | undefined {
  return plays.find((p) => p.id === id)
}

/** A blank half court for /plays/new: one frame, nobody placed yet. */
export function blankPlay(): PlaybookPlay {
  return {
    id: "new",
    title: "Untitled play",
    section: "Half court",
    category: "Half court",
    summary: "",
    vs: "any",
    tags: [],
    authorId: "staff-reyes",
    updatedAt: at(0, "14:40"),
    edited: "just now",
    stats: { timesRun: 0, ppp: 0, successRate: 0 },
    assignedTo: 0,
    studied: 0,
    clips: [],
    frames: [{ offense: [], ball: 0, actions: [] }],
  }
}

export type { Action, Frame, Play, Point } from "@/lib/play-engine/types"
