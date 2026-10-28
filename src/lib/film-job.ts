// The film-analysis job contract shared by the mock and the backend (hoopscliniq-ai SPEC.md, v0.2.0).
// Every field added in 0.2.0 is optional here: mock mode and an older backend must still render.

export type JobStatus = "queued" | "frames" | "track" | "name" | "done" | "failed"
export type JobStepStatus = "done" | "running" | "queued" | "failed" | "planned"
export type JobStepId = "upload" | "frames" | "track" | "name" | "review" | "cite"

export interface JobStep {
  id: JobStepId
  label: string
  engine: string
  status: JobStepStatus | string
}

export interface SuggestedName {
  playId: string
  title: string
  confidence?: "high" | "medium" | "low"
  why?: string
  needsReview?: boolean
}

/** [x1, y1, x2, y2] in clip.mp4 pixels. */
export type Box = [number, number, number, number]

export interface Overlay {
  fps: number
  frames: number
  imageSize: [number, number]
  players: Record<string, { team: "offense" | "defense"; boxes: (Box | null)[] }>
}

/** The play-dna fields this app reads; court.js validates the rest. */
export interface JobPlayDna {
  source?: { fps?: number; frames?: number }
  tracks?: { players?: Record<string, [number, number][]> }
  meta?: { playersFound?: number; calibration?: "given" | "estimated" | string }
}

export interface FilmJob {
  jobId: string
  status: JobStatus
  finishedAt?: string | null
  steps?: JobStep[]
  suggestedName?: SuggestedName | null
  playDna?: JobPlayDna | null
  error?: string | null
  clipUrl?: string | null
  overlay?: Overlay | null
}

export interface RecentJob {
  jobId: string
  finishedAt: string | null
  title: string | null
  playersFound: number | null
}

export const JOB_ID = /^[a-z0-9-]{1,64}$/i

export const MAX_UPLOAD_BYTES = 60 * 1024 ** 2
export const MAX_UPLOAD_SECONDS = 60

export type SampleId = "girls" | "boys"

export interface SampleClip {
  id: SampleId
  label: string
  detail: string
  src: string
  fileName: string
}

/** The two Hazen Union clips in public/samples/ (CC BY 4.0). */
export const sampleClips: SampleClip[] = [
  {
    id: "girls",
    label: "Girls v. Lake Region",
    detail: "Live play · 20 s",
    src: "/samples/hazen-girls-lakeregion-2026-02-11_t1200.mp4",
    fileName: "hazen-girls-lakeregion-2026-02-11_t1200.mp4",
  },
  {
    id: "boys",
    label: "Boys v. Stowe",
    detail: "Pregame warm-up · 20 s",
    src: "/samples/hazen-boys-stowe-2025-02-10_t720.mp4",
    fileName: "hazen-boys-stowe-2025-02-10_t720.mp4",
  },
]

export const SAMPLE_ATTRIBUTION = "Sample footage: Hazen Union HS (Vermont), Hardwick Community Television, CC BY 4.0."

/** sessionStorage key: when the upload dialog sent a job, so its page can show the real elapsed time. */
export const jobStartKey = (jobId: string) => `hoopscliniq:job-start:${jobId}`

export const isSampleId = (v: unknown): v is SampleId => v === "girls" || v === "boys"

/** Real wall-clock time for job stamps (the mock world's clock does not apply to live jobs). */
export function formatJobTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
}
