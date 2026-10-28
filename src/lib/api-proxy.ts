const TIMEOUT_MS = 25_000

type ProxyInit = {
  path: string
  method: "GET" | "POST"
  headers?: HeadersInit
  body?: BodyInit
  /** Per-route override; ClinIQ answers can take Muse Spark 30–60 s. */
  timeoutMs?: number
  /** On a network error, timeout or 5xx: the mock (default), or a 502 JSON error with no x-demo header. */
  fallback?: "mock" | "error"
  /** When set, a 4xx from the backend returns this message (or the message for its status) as JSON instead of its body. */
  clientError?: string | ((status: number) => string)
  /** A 5xx whose JSON body carries `{ error }` returns that message with its status (the backend's own friendly
   * reason) instead of the fallback. Other 5xx bodies still fall back. */
  passServerErrors?: boolean
}

// Server-only: HOOPSCLINIQ_API_URL has no NEXT_PUBLIC prefix, so it never reaches the browser bundle.
// Unset: the mock, exactly as before. Set: forward to the backend and pass the status and JSON through.
// A network error, timeout or 5xx falls back to the mock with an x-demo-fallback reason (or a 502 JSON error
// when the route sets `fallback: "error"`).
export async function proxyOrMock(init: ProxyInit, mockResponse: () => Response): Promise<Response> {
  const base = process.env.HOOPSCLINIQ_API_URL?.trim().replace(/\/+$/, "")
  if (!base) return mockResponse()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? TIMEOUT_MS)
  try {
    const upstream = await fetch(`${base}${init.path}`, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      cache: "no-store",
      signal: controller.signal,
    })
    if (upstream.status >= 500) {
      const error = init.passServerErrors ? await upstreamError(upstream) : null
      if (error) return Response.json({ error }, { status: upstream.status, headers: { "Cache-Control": "no-store" } })
      return fallback(init, mockResponse, `upstream ${upstream.status}`)
    }
    if (init.clientError && upstream.status >= 400) {
      const error = typeof init.clientError === "function" ? init.clientError(upstream.status) : init.clientError
      return Response.json({ error }, { status: upstream.status, headers: { "Cache-Control": "no-store" } })
    }
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "x-demo": "live",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError"
    return fallback(init, mockResponse, timedOut ? "timeout" : "network error")
  } finally {
    clearTimeout(timer)
  }
}

async function upstreamError(res: Response): Promise<string | null> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null
  return typeof body?.error === "string" && body.error.length <= 200 ? body.error : null
}

function fallback(init: ProxyInit, mockResponse: () => Response, reason: string): Response {
  if (init.fallback === "error") {
    return Response.json(
      { error: "The analysis service is not answering. Try again in a moment." },
      { status: 502, headers: { "Cache-Control": "no-store", "x-demo-fallback": reason } },
    )
  }
  const response = mockResponse()
  response.headers.set("x-demo", "mock")
  response.headers.set("x-demo-fallback", reason)
  return response
}
