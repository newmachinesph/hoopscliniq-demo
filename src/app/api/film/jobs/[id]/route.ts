import { mockJob } from "@/data/hackathon"

const JOB_ID = /^[a-z0-9-]{1,64}$/i

// Mock seam: the backend replaces this with the Modal job's status, SAM tracks and play-dna JSON.
export async function GET(_request: Request, { params }: RouteContext<"/api/film/jobs/[id]">) {
  const { id } = await params
  const headers = { "x-demo": "mock", "Cache-Control": "no-store" }
  if (!JOB_ID.test(id)) return Response.json({ error: "Unknown job id." }, { status: 400, headers })
  return Response.json(mockJob(id), { headers })
}
