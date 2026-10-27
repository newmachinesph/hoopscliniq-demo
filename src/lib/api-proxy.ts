const TIMEOUT_MS = 25_000

type ProxyInit = {
  path: string
  method: "GET" | "POST"
  headers?: HeadersInit
  body?: BodyInit
  /** Per-route override; ClinIQ answers can take Muse Spark 30–60 s. */
  timeoutMs?: number
}

// Server-only: HOOPSCLINIQ_API_URL has no NEXT_PUBLIC prefix, so it never reaches the browser bundle.
// Unset: the mock, exactly as before. Set: forward to the backend and pass the status and JSON through.
// A network error, timeout or 5xx falls back to the mock with an x-demo-fallback reason.
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
    if (upstream.status >= 500) return fallback(mockResponse, `upstream ${upstream.status}`)
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
    return fallback(mockResponse, timedOut ? "timeout" : "network error")
  } finally {
    clearTimeout(timer)
  }
}

function fallback(mockResponse: () => Response, reason: string): Response {
  const response = mockResponse()
  response.headers.set("x-demo", "mock")
  response.headers.set("x-demo-fallback", reason)
  return response
}
