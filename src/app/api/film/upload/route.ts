import { mockUploadJob } from "@/data/hackathon"
import { proxyOrMock } from "@/lib/api-proxy"

// Proxies to the backend's POST /film/upload (which starts a Modal job and returns its id) when
// HOOPSCLINIQ_API_URL is set; otherwise, or on failure, returns the mock. The mock never reads the body.
// A 60 MB clip can take longer than the default proxy timeout to reach Modal.
const UPLOAD_TIMEOUT_MS = 90_000
/** The client caps a clip at 60 MB; the extra MiB covers the multipart envelope. The backend has 256 MB of RAM. */
const MAX_BODY_BYTES = 60 * 1024 ** 2 + 1024 ** 2
const rejected = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } })

export async function POST(request: Request) {
  const mock = () =>
    Response.json(mockUploadJob(), {
      status: 202,
      headers: { "x-demo": "mock", "Cache-Control": "no-store" },
    })
  if (!process.env.HOOPSCLINIQ_API_URL?.trim()) return mock()

  const contentType = request.headers.get("content-type")
  if (!contentType?.toLowerCase().startsWith("multipart/form-data"))
    return rejected("Send the clip as a form upload.", 415)
  const length = Number(request.headers.get("content-length"))
  if (!request.headers.get("content-length") || !Number.isFinite(length) || length > MAX_BODY_BYTES)
    return rejected("That clip is over the 60 MB limit. Trim it to one play.", 413)

  return proxyOrMock(
    {
      path: "/film/upload",
      method: "POST",
      headers: { "content-type": contentType },
      body: await request.arrayBuffer(),
      timeoutMs: UPLOAD_TIMEOUT_MS,
      fallback: "error",
      clientError: "The clip could not be accepted. Check that it is an MP4, MOV or WebM under 60 MB and 60 seconds.",
    },
    mock,
  )
}
