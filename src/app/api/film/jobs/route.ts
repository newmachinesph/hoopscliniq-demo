import { mockRecentJobs } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"

// Proxies to the backend's GET /film/jobs (finished jobs, newest first, max 10) when HOOPSCLINIQ_API_URL is set;
// otherwise, or on failure, returns the mock job as the only recent analysis.
export async function GET() {
  const headers = { "x-demo": "mock", "Cache-Control": "no-store" }
  return proxyOrMock({ path: "/film/jobs", method: "GET" }, () => Response.json(mockRecentJobs(), { headers }))
}
