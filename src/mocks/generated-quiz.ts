import type { Quiz, QuizQuestion } from "@/mocks/portal"

// Mock of POST /study/quiz: a deterministic quiz built from the play's own frames by a template. Nothing is written by
// a model. Same response shape as the backend (0.4.0), with `model: "mock"`.

type Pt = [number, number]
interface QuizFrame {
  offense: Pt[]
  ball: number
}
export interface QuizPlayInput {
  id: string
  title: string
  frames: QuizFrame[]
}
export interface GeneratedQuizResponse {
  quiz: Quiz
  source: { playId: string; title: string; frames: number }
  model: string
  seconds: number
}

const ZONES = [
  "the left corner",
  "the right corner",
  "the left wing",
  "the right wing",
  "the top of the key",
  "the left elbow",
  "the right elbow",
  "the low post on the left",
  "the low post on the right",
  "the free-throw line",
  "the rim",
].map((z) => z.charAt(0).toUpperCase() + z.slice(1))

const PLAYERS = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** A half-court point (tenths of a foot, x 0..500, y 0..420 from the baseline) as a court zone name. */
export function zoneName(x: number, y: number): string {
  if (y < 150) {
    if (x < 100) return "the left corner"
    if (x > 400) return "the right corner"
    if (x < 200) return "the low post on the left"
    if (x > 300) return "the low post on the right"
    return "the rim"
  }
  if (x < 170) return "the left wing"
  if (x > 330) return "the right wing"
  if (y < 235) {
    if (x < 230) return "the left elbow"
    if (x > 270) return "the right elbow"
    return "the free-throw line"
  }
  return "the top of the key"
}

interface Draft {
  prompt: string
  frame: number
  answerFrame: number
  correct: string
  pool: readonly string[]
  why: string
}

/** The right answer plus two other choices; `seed` moves the right answer between the three slots. */
function choices(correct: string, pool: readonly string[], seed: number) {
  const wrong = pool.filter((p) => p !== correct)
  const first = wrong[seed % wrong.length] as string
  let second = wrong[(seed + 3) % wrong.length] as string
  if (second === first) second = wrong[(seed + 1) % wrong.length] as string
  const texts = [first, second]
  texts.splice(seed % 3, 0, correct)
  const ids = ["a", "b", "c"]
  return {
    options: texts.map((text, i) => ({ id: ids[i] as string, text })),
    correctId: ids[texts.indexOf(correct)] as string,
  }
}

export function mockQuiz(play: QuizPlayInput, spot: number, count: number): GeneratedQuizResponse {
  const { frames } = play
  const last = frames.length - 1
  const me = spot - 1
  const holder = (f: number) => PLAYERS[frames[f]?.ball ?? 0] as string
  const zoneOf = (f: number) => {
    const p = frames[f]?.offense[me]
    return p ? zoneName(p[0], p[1]) : null
  }

  const drafts: Draft[] = [
    {
      prompt: "Frame 1: who has the ball?",
      frame: 0,
      answerFrame: 0,
      correct: holder(0),
      pool: PLAYERS,
      why: "Frame 1 shows the ball with the player it is drawn on.",
    },
  ]
  for (let f = 0; f < last; f++) {
    const a = zoneOf(f)
    const b = zoneOf(f + 1)
    if (!a || !b || a === b) continue
    drafts.push({
      prompt: `Frame ${f + 1}: where does player ${spot} go next?`,
      frame: f,
      answerFrame: f + 1,
      correct: cap(b),
      pool: ZONES,
      why: `Frame ${f + 2} shows player ${spot} at ${b}, after starting at ${a}.`,
    })
    break
  }
  if (last > 0)
    drafts.push({
      prompt: `Frame ${last}: who has the ball after this action?`,
      frame: last - 1,
      answerFrame: last,
      correct: holder(last),
      pool: PLAYERS,
      why: `Frame ${last + 1} shows the ball with ${holder(last).toLowerCase()}.`,
    })
  for (let f = 0; f <= last; f++) {
    const z = zoneOf(f)
    if (!z) continue
    drafts.push({
      prompt: `Frame ${f + 1}: where is player ${spot}?`,
      frame: f,
      answerFrame: f,
      correct: cap(z),
      pool: ZONES,
      why: `Frame ${f + 1} shows player ${spot} at ${z}.`,
    })
  }

  const questions: QuizQuestion[] = drafts.slice(0, count).map((d, i) => ({
    id: `q${i + 1}`,
    prompt: d.prompt,
    playId: play.id,
    frame: d.frame,
    answerFrame: d.answerFrame,
    why: d.why,
    ...choices(d.correct, d.pool, i + play.id.length),
  }))

  return {
    quiz: {
      id: `gen-${play.id}-mock`,
      title: `${play.title}: spot ${spot}`,
      topic: "Sample quiz",
      due: null,
      spot,
      questions,
    },
    source: { playId: play.id, title: play.title, frames: frames.length },
    model: "mock",
    seconds: 0,
  }
}
