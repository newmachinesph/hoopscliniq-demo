import { mockJob } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"
import { JOB_ID } from "@/lib/film-job"

// Proxies to the backend's POST /film/jobs/<id>/hide: the tracked players to hide in the clip (consent). The backend
// renders a new clip from their SAM 3.1 boxes and returns the job view; an empty list shows everyone again.
// Rendering a 20 s clip takes up to about 20 s on Modal.
const HIDE_TIMEOUT_MS = 60_000
const MAX_HIDDEN = 4
const PLAYER_ID = /^[a-z0-9_-]{1,16}$/i

const noStore = { "Cache-Control": "no-store" }
const rejected = (error: string, status: number) => Response.json({ error }, { status, headers: noStore })

function clientError(status: number): string {
  if (status === 404) return "We can’t find that analysis. The link may be old."
  if (status === 409) return "This analysis has no video to hide players in yet."
  return "Those players can’t be hidden. Pick up to four players from the list and try again."
}

/** { playerIds: 0 to 4 ids } or null. The backend checks that each id is a player of the job. */
function parseBody(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null
  const { playerIds } = body as { playerIds?: unknown }
  if (!Array.isArray(playerIds) || playerIds.length > MAX_HIDDEN) return null
  if (!playerIds.every((p): p is string => typeof p === "string" && PLAYER_ID.test(p))) return null
  return [...new Set(playerIds)]
}

export async function POST(request: Request, { params }: RouteContext<"/api/film/jobs/[id]/hide">) {
  const { id } = await params
  if (!JOB_ID.test(id)) return rejected("Unknown job id.", 400)
  const playerIds = parseBody(await request.json().catch(() => null))
  if (!playerIds) return rejected("Pick up to four players to hide.", 400)

  return proxyOrMock(
    {
      path: `/film/jobs/${id}/hide`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerIds }),
      timeoutMs: HIDE_TIMEOUT_MS,
      fallback: "error",
      clientError,
    },
    // Mock mode: nothing is rendered; the sample job comes back marked as hidden.
    () =>
      Response.json(
        {
          ...mockJob(id),
          hidden: playerIds.length ? { playerIds, framesMissed: {}, frames: 0, at: new Date().toISOString() } : null,
        },
        { headers: { ...noStore, "x-demo": "mock" } },
      ),
  )
}
