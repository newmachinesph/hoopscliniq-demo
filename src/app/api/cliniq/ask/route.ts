import { mockAsk } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"

const MAX_QUESTION = 500

// Proxies to the backend's POST /cliniq/ask (Muse Spark plus tool calls) when HOOPSCLINIQ_API_URL is set;
// otherwise, or on failure, returns the mock.
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
  const trimmed = question.trim()
  return proxyOrMock(
    {
      path: "/cliniq/ask",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: trimmed }),
    },
    () => Response.json(mockAsk(trimmed), { headers }),
  )
}
