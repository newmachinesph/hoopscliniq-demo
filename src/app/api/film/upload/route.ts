import { mockUploadJob } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"

// Proxies to the backend's POST /film/upload (which starts a Modal job and returns its id) when
// HOOPSCLINIQ_API_URL is set; otherwise, or on failure, returns the mock. The mock never reads the body.
export async function POST(request: Request) {
  const mock = () =>
    Response.json(mockUploadJob(), {
      status: 202,
      headers: { "x-demo": "mock", "Cache-Control": "no-store" },
    })
  if (!process.env.HOOPSCLINIQ_API_URL?.trim()) return mock()

  const contentType = request.headers.get("content-type")
  return proxyOrMock(
    {
      path: "/film/upload",
      method: "POST",
      headers: contentType ? { "content-type": contentType } : undefined,
      body: await request.arrayBuffer(),
    },
    mock,
  )
}
