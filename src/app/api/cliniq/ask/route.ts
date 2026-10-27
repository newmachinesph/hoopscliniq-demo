import { mockAsk } from "@/data/hackathon"

const MAX_QUESTION = 500

// Mock seam: the backend replaces this with Muse Spark plus tool calls (fetch_play, fetch_clip, fetch_stat).
// Contract: { question } in, { answer: { body, citations, confidence, credits }, noSource } out.
export async function POST(request: Request) {
  const headers = { "x-demo": "mock", "Cache-Control": "no-store" }
  let question: unknown
  try {
    question = ((await request.json()) as { question?: unknown }).question
  } catch {
    return Response.json({ error: 'Send JSON: { "question": "..." }.' }, { status: 400, headers })
  }
  if (typeof question !== "string" || !question.trim() || question.length > MAX_QUESTION)
    return Response.json(
      { error: `question must be a non-empty string of at most ${MAX_QUESTION} characters.` },
      { status: 400, headers },
    )
  return Response.json(mockAsk(question.trim()), { headers })
}
