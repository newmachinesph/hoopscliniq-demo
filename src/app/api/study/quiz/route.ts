import { mockQuiz, type QuizPlayInput } from "@/data/generated-quiz"
import { proxyOrMock } from "@/lib/api-proxy"

// Proxies to the backend's POST /study/quiz (Muse Spark writes questions from the frames of a play) when
// HOOPSCLINIQ_API_URL is set. Contract: { play: { id, title, frames }, spot?, count? } in, { quiz, source, model, seconds }
// out. The backend checks the coordinates and limits; this route checks the shape.
const QUIZ_TIMEOUT_MS = 55_000
const MAX_FRAMES = 12
const MAX_TEXT = 80
const MAX_BODY_BYTES = 64 * 1024

const noStore = { "Cache-Control": "no-store" }
const rejected = (error: string, status: number) => Response.json({ error }, { status, headers: noStore })

function clientError(status: number): string {
  if (status === 404) return "ClinIQ could not find that play."
  return "ClinIQ could not read this play. Try another play."
}

const isPoint = (v: unknown) =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === "number" && Number.isFinite(n))
const isInt = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max

type Parsed = { play: QuizPlayInput; spot?: number; count?: number }

function parseBody(body: unknown): Parsed | null {
  if (!body || typeof body !== "object") return null
  const { play, spot, count } = body as { play?: unknown; spot?: unknown; count?: unknown }
  if (spot !== undefined && !isInt(spot, 1, 5)) return null
  if (count !== undefined && !isInt(count, 2, 5)) return null
  if (!play || typeof play !== "object") return null
  const { id, title, frames } = play as { id?: unknown; title?: unknown; frames?: unknown }
  if (typeof id !== "string" || !id || id.length > MAX_TEXT) return null
  if (typeof title !== "string" || !title.trim() || title.length > MAX_TEXT) return null
  if (!Array.isArray(frames) || frames.length < 1 || frames.length > MAX_FRAMES) return null
  for (const f of frames) {
    if (!f || typeof f !== "object") return null
    const { offense, ball } = f as { offense?: unknown; ball?: unknown }
    if (!Array.isArray(offense) || offense.length !== 5 || !offense.every(isPoint)) return null
    if (!isInt(ball, 0, 4)) return null
  }
  return {
    play: { id, title, frames } as QuizPlayInput,
    spot: spot as number | undefined,
    count: count as number | undefined,
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES)
    return rejected("This play is too large to send to ClinIQ.", 413)
  const body = await request.json().catch(() => null)
  const parsed = parseBody(body)
  if (!parsed) return rejected("Send a play with 1 to 12 frames, and a spot from 1 to 5.", 400)
  const { spot = 2, count = 3 } = parsed

  return proxyOrMock(
    {
      path: "/study/quiz",
      method: "POST",
      headers: { "content-type": "application/json" },
      // Only the play's fields go through; the backend validates the coordinates, actions and notes.
      body: JSON.stringify({ play: parsed.play, spot, count }),
      timeoutMs: QUIZ_TIMEOUT_MS,
      // A failed live call must not come back as a mock quiz that looks written by ClinIQ.
      fallback: "error",
      // The backend's own reason ("ClinIQ could not write a quiz...") beats the generic "not answering".
      passServerErrors: true,
      clientError,
    },
    // Mock mode (no backend URL): a template quiz from the play's own frames.
    () => Response.json(mockQuiz(parsed.play, spot, count), { headers: { ...noStore, "x-demo": "mock" } }),
  )
}
