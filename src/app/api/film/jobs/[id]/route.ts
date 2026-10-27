import { mockJob } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"

const JOB_ID = /^[a-z0-9-]{1,64}$/i

// Proxies to the backend's GET /film/jobs/<id> (Modal job status, SAM tracks and play-dna JSON) when
// HOOPSCLINIQ_API_URL is set; otherwise, or on failure, returns the mock.
export async function GET(_request: Request, { params }: RouteContext<"/api/film/jobs/[id]">) {
  const { id } = await params
  const headers = { "x-demo": "mock", "Cache-Control": "no-store" }
  if (!JOB_ID.test(id)) return Response.json({ error: "Unknown job id." }, { status: 400, headers })
  return proxyOrMock({ path: `/film/jobs/${id}`, method: "GET" }, () => Response.json(mockJob(id), { headers }))
}
