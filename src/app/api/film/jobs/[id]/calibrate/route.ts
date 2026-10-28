import { mockJob } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"
import { JOB_ID } from "@/lib/film-job"

// Proxies to the backend's POST /film/jobs/<id>/calibrate: the coach's four court corners on one frame. The backend
// re-projects the stored tracks, renames the play and returns the job view. Muse Spark naming can take most of a minute.
const CALIBRATE_TIMEOUT_MS = 60_000

const noStore = { "Cache-Control": "no-store" }
const rejected = (error: string, status: number) => Response.json({ error }, { status, headers: noStore })

function clientError(status: number): string {
  if (status === 404) return "We can’t find that analysis. The link may be old."
  if (status === 409) return "This analysis is not finished yet. Try again when it is done."
  return "Those corners do not make a court outline. Check the order of the four taps and try again."
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)

/** { frame, points: four [x, y] } in clip.mp4 pixels, or null. The backend checks the bounds and the shape. */
function parseBody(body: unknown): { frame: number; points: [number, number][] } | null {
  if (!body || typeof body !== "object") return null
  const { frame, points } = body as { frame?: unknown; points?: unknown }
  if (!isNum(frame) || !Number.isInteger(frame) || frame < 0) return null
  if (!Array.isArray(points) || points.length !== 4) return null
  const clean: [number, number][] = []
  for (const p of points) {
    if (!Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1]) || p[0] < 0 || p[1] < 0) return null
    clean.push([p[0], p[1]])
  }
  return { frame, points: clean }
}

export async function POST(request: Request, { params }: RouteContext<"/api/film/jobs/[id]/calibrate">) {
  const { id } = await params
  if (!JOB_ID.test(id)) return rejected("Unknown job id.", 400)
  const parsed = parseBody(await request.json().catch(() => null))
  if (!parsed) return rejected("Mark all four court corners on the video, then save.", 400)

  return proxyOrMock(
    {
      path: `/film/jobs/${id}/calibrate`,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed),
      timeoutMs: CALIBRATE_TIMEOUT_MS,
      fallback: "error",
      clientError,
    },
    // Mock mode: nothing is re-projected; the sample job comes back marked with the coach's corners.
    () =>
      Response.json(
        { ...mockJob(id), calibration: { source: "coach", ...parsed } },
        { headers: { ...noStore, "x-demo": "mock" } },
      ),
  )
}
