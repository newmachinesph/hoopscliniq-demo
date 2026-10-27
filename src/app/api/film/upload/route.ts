import { mockUploadJob } from "@/data/hackathon"

// Mock seam: the backend replaces this with the real upload, which starts a Modal job and returns its id.
// The body is not read or stored.
export function POST() {
  return Response.json(mockUploadJob(), {
    status: 202,
    headers: { "x-demo": "mock", "Cache-Control": "no-store" },
  })
}
