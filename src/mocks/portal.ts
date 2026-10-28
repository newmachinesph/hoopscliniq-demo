import type { ID, ISODate } from "@/data/types"
import { at } from "./clock"
import { mePlayer } from "./org"
import { assignedTo, hasStudied, studyPlan } from "./study-plan"

// ---------- Player: assigned plays ----------

export interface Assignment {
  playId: ID
  /** Day offset from NOW when the coach assigned it. */
  assignedDay: number
  studied: boolean
  /** Luka's number on the diagram (1-5). */
  role: number
  due: "Westview" | "Pinecrest" | "Review"
}

/** Luka's spot on plays where he isn't the 2. */
const roles: Record<ID, number> = { "short-corner-flood": 3, "box-blob": 4, "line-blob": 3, "overload-131": 3 }

/** Every play assigned to Luka, newest first, from the same study matrix as his IQ card (studied of assigned). */
export const assignments: Assignment[] = studyPlan
  .filter((a) => assignedTo(a).includes(mePlayer.id))
  .map((a) => ({
    playId: a.playId,
    assignedDay: a.assignedOn,
    studied: hasStudied(mePlayer.id, a.playId),
    role: roles[a.playId] ?? 2,
    due:
      a.gamePlan === "westview"
        ? ("Westview" as const)
        : a.gamePlan === "pinecrest"
          ? ("Pinecrest" as const)
          : ("Review" as const),
  }))
  .reverse()

/** Extra lines coaches wrote for specific plays, shown under the diagram. */
export const playCoachNotes: Record<ID, string> = {
  "horns-flare": "Against Westview's 2-3, the flare is your read. Get to the wing early so the skip has a target.",
  "zone-gut": "Be patient. Gap, kick, then the dump. Do not force the first pass.",
}

// ---------- Player: streak ----------

export const streak = {
  days: 14,
  /** Last 7 days, oldest first. Today is pending until the quiz is done. */
  week: [
    { label: "W", done: true },
    { label: "T", done: true },
    { label: "F", done: true },
    { label: "S", done: true },
    { label: "S", done: true },
    { label: "M", done: true },
    { label: "T", done: false },
  ],
}

// ---------- Player: quizzes ----------

export interface QuizQuestion {
  id: string
  prompt: string
  /** The play and frame shown with the question. */
  playId: ID
  frame: number
  options: { id: string; text: string }[]
  correctId: string
  /** The frame shown once answered. */
  answerFrame: number
  why: string
}

export interface Quiz {
  id: ID
  title: string
  topic: string
  due: ISODate | null
  /** The player spot (1-5) the questions are written for; missing means spot 2. Set on quizzes written by ClinIQ. */
  spot?: number
  questions: QuizQuestion[]
}

export const quizzes: Quiz[] = [
  {
    id: "q-horns-flare",
    title: "Horns Flare vs the 2-3",
    topic: "Westview prep",
    due: at(0, "21:00"),
    questions: [
      {
        id: "q1",
        prompt: "Westview is in a 2-3. In Horns Flare, where do you go after the flare screen?",
        playId: "horns-flare",
        frame: 1,
        options: [
          { id: "a", text: "Fade to the wing and show a target for the skip" },
          { id: "b", text: "Curl tight to the rim" },
          { id: "c", text: "Stay at the elbow and reset the offense" },
        ],
        correctId: "a",
        answerFrame: 2,
        why: "The flare pulls the zone's wing defender toward the ball. Fading to the wing opens the skip over the top.",
      },
      {
        id: "q2",
        prompt: "The zone's wing denies the skip pass. What is your next read?",
        playId: "horns-flare",
        frame: 2,
        options: [
          { id: "a", text: "Force the skip anyway" },
          { id: "b", text: "Reverse the ball and let 5 seal at the rim" },
          { id: "c", text: "Dribble into the gap alone" },
        ],
        correctId: "b",
        answerFrame: 3,
        why: "A denied skip means the middle is open. Reverse and look inside before you settle for a contested look.",
      },
      {
        id: "q3",
        prompt: "After a timeout Westview shows a 1-3-1. What changes for the flare screener?",
        playId: "horns-flare",
        frame: 1,
        options: [
          { id: "a", text: "Nothing, run it the same" },
          { id: "b", text: "Screen the point of the zone, then slip to the high post" },
          { id: "c", text: "Stay out of the lane" },
        ],
        correctId: "b",
        answerFrame: 2,
        why: "The 1-3-1 point is the one defender who has to chase. Screening there makes the zone choose.",
      },
    ],
  },
  {
    id: "q-zone-gut",
    title: "Zone Gut: read the gap",
    topic: "Zone offense",
    due: null,
    questions: [
      {
        id: "q1",
        prompt: "You catch at the free-throw line against a 2-3. Both guards are sagging. What do you do?",
        playId: "zone-gut",
        frame: 1,
        options: [
          { id: "a", text: "Shoot immediately" },
          { id: "b", text: "Face up, hold the zone, then hit the baseline cutter" },
          { id: "c", text: "Pass back out to the wing" },
        ],
        correctId: "b",
        answerFrame: 2,
        why: "Holding the zone for one beat opens the high-low. The dump to the baseline is the point of the play.",
      },
      {
        id: "q2",
        prompt: "The weak-side forward steps up to help. Where is the open man?",
        playId: "zone-gut",
        frame: 2,
        options: [
          { id: "a", text: "The corner on the weak side" },
          { id: "b", text: "Nobody. Reset." },
          { id: "c", text: "The ball side wing" },
        ],
        correctId: "a",
        answerFrame: 3,
        why: "When the weak-side forward steps up, the corner is empty. Swing it there.",
      },
    ],
  },
]

export const quizById = (id: string) => quizzes.find((q) => q.id === id)
