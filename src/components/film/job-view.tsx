"use client"

import {
  CheckCircleIcon,
  CircleNotchIcon,
  ClockIcon,
  CrosshairIcon,
  InfoIcon,
  SparkleIcon,
  UserCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { pipelineSteps } from "@/data/hackathon"
import type { Landmarks, Point } from "@/lib/calibration"
import {
  type FilmJob,
  formatJobTime,
  type JobStep,
  jobStartKey,
  SAMPLE_ATTRIBUTION,
  type SampleId,
  sampleClips,
} from "@/lib/film-job"
import { ClipboardPlay } from "@/lib/play-engine/clipboard-play"
import { cn } from "@/lib/utils"
import { ClipOverlay, frameAt } from "./clip-overlay"
import { CalibrationLayer, CalibrationPanel } from "./court-calibration"
import { DnaCourt, parseDna } from "./court-view"
import { EventList } from "./event-list"
import { SuggestedNameCard } from "./suggested-name-card"

const POLL_MS = 2500
/** Consecutive failed polls before the page stops and offers a retry. */
const MAX_POLL_ERRORS = 5
/** The backend can answer 404 for a moment while a new job starts: only the 4th 404 in a row means "not found". */
const MAX_MISSING = 4

type Poll =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "offline" }
  | { kind: "job"; job: FilmJob; mock: boolean }

const terminal = (job: FilmJob) => job.status === "done" || job.status === "failed"

/**
 * Polls GET /api/film/jobs/<id> every 2.5 s until the job is done or failed. `replace` swaps in a job view the backend
 * returned from another call (calibration), which is always live.
 */
function useJob(jobId: string, attempt: number): { poll: Poll; replace: (job: FilmJob) => void } {
  const [poll, setPoll] = React.useState<Poll>({ kind: "loading" })

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` marks a retry, which shows loading again
  React.useEffect(() => {
    setPoll((cur) => (cur.kind === "offline" ? { kind: "loading" } : cur))
  }, [attempt])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` restarts polling after "Try again"
  React.useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let errors = 0
    let missing = 0
    const load = async () => {
      try {
        const res = await fetch(`/api/film/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" })
        if (!alive) return
        if (res.status === 400) {
          setPoll({ kind: "missing" })
          return
        }
        if (res.status === 404) {
          missing += 1
          if (missing >= MAX_MISSING) {
            setPoll({ kind: "missing" })
            return
          }
        } else {
          missing = 0
          if (!res.ok) throw new Error(`status ${res.status}`)
          const job = (await res.json()) as FilmJob
          if (!alive) return
          errors = 0
          setPoll({ kind: "job", job, mock: res.headers.get("x-demo") !== "live" })
          if (terminal(job)) return
        }
      } catch {
        if (!alive) return
        errors += 1
        if (errors >= MAX_POLL_ERRORS) {
          setPoll({ kind: "offline" })
          return
        }
      }
      timer = setTimeout(load, POLL_MS)
    }
    load()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [jobId, attempt])

  const replace = React.useCallback((job: FilmJob) => setPoll({ kind: "job", job, mock: false }), [])
  return { poll, replace }
}

/** When the upload dialog sent this job (this tab only); null when the page was opened some other way. */
function sentAt(jobId: string): number | null {
  try {
    const n = Number(sessionStorage.getItem(jobStartKey(jobId)))
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

/** Seconds since the clip was sent (or since the page opened), frozen once the job ends. */
function useElapsed(jobId: string, running: boolean) {
  const start = React.useRef<number | null>(null)
  const [secs, setSecs] = React.useState(0)
  React.useEffect(() => {
    if (!running) return
    start.current ??= sentAt(jobId) ?? Date.now()
    const tick = () => setSecs(Math.round((Date.now() - (start.current ?? Date.now())) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [jobId, running])
  return { secs, started: start.current !== null }
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

/** The machine steps in order; used when a job response has no `steps` list. */
const MACHINE: FilmJob["status"][] = ["frames", "track", "name"]

function deriveSteps(job: FilmJob): JobStep[] {
  const at = job.status === "done" ? MACHINE.length : MACHINE.indexOf(job.status)
  return pipelineSteps.map((s) => {
    const i = MACHINE.indexOf(s.id as FilmJob["status"])
    let status: JobStep["status"] = "planned"
    if (s.id === "upload") status = "done"
    else if (i >= 0) status = i < at ? "done" : i === at ? (job.status === "failed" ? "failed" : "running") : "queued"
    return { id: s.id, label: s.label, engine: s.engine, status }
  })
}

function StepChip({ step, jobDone }: { step: JobStep; jobDone: boolean }) {
  switch (step.status) {
    case "done":
      return (
        <Chip tone="success">
          <CheckCircleIcon size={11} weight="bold" aria-hidden /> Done
        </Chip>
      )
    case "running":
      return (
        <Chip tone="info">
          <CircleNotchIcon size={11} weight="bold" className="motion-safe:animate-spin" aria-hidden /> Running
        </Chip>
      )
    case "queued":
      return (
        <Chip tone="outline">
          <ClockIcon size={11} aria-hidden /> Waiting
        </Chip>
      )
    case "failed":
      return (
        <Chip tone="danger">
          <WarningIcon size={11} weight="bold" aria-hidden /> Failed
        </Chip>
      )
    default:
      // Review and Cite belong to the coach: the backend always reports them as planned.
      if (step.id === "review" && jobDone)
        return (
          <Chip tone="warning">
            <UserCheckIcon size={11} weight="bold" aria-hidden /> Your turn
          </Chip>
        )
      return (
        <Chip tone="outline">
          <ClockIcon size={11} aria-hidden /> {step.id === "cite" ? "After review" : "Later"}
        </Chip>
      )
  }
}

function JobSteps({ job }: { job: FilmJob }) {
  const steps = job.steps?.length ? job.steps : deriveSteps(job)
  return (
    <ol
      aria-label="Analysis steps"
      className="grid divide-y divide-border rounded-md border border-border bg-surface-1 sm:grid-cols-3 sm:gap-px sm:divide-y-0 sm:overflow-hidden sm:bg-border xl:grid-cols-6"
    >
      {steps.map((s, i) => (
        <li
          key={s.id}
          className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 bg-surface-1 px-4 py-2 sm:flex-col sm:flex-nowrap sm:items-stretch sm:px-3 sm:py-3"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            {s.label}
          </span>
          <span className="text-xs text-muted-foreground">{s.engine}</span>
          <span className="ml-auto sm:mt-0.5 sm:ml-0 sm:self-start">
            <StepChip step={s} jobDone={job.status === "done"} />
          </span>
        </li>
      ))}
    </ol>
  )
}

function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-border bg-surface-1 p-4", className)} {...props} />
}

function playersFound(job: FilmJob): number | null {
  const meta = job.playDna?.meta?.playersFound
  if (typeof meta === "number") return meta
  const tracks = job.playDna?.tracks?.players
  return tracks ? Object.keys(tracks).length : null
}

function HonestNotes({ job, mock, sample }: { job: FilmJob; mock: boolean; sample: SampleId | null }) {
  const found = playersFound(job)
  const source = job.calibration?.source ?? job.playDna?.meta?.calibration
  const motion = job.cameraMotion ?? job.playDna?.meta?.cameraMotion ?? null
  const motionTotal = motion ? motion.framesTracked + motion.framesFallback : 0
  const hasVideo = Boolean(job.clipUrl && job.overlay)
  return (
    <Panel className="space-y-2 text-sm text-foreground-secondary">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <InfoIcon size={14} aria-hidden /> About this analysis
      </h2>
      {mock ? (
        <p>
          <Chip tone="neutral" className="mr-1.5">
            Sample data
          </Chip>
          This is the hand-drawn Horns Twist play standing in for pipeline output. Nothing was tracked.
        </p>
      ) : (
        found !== null && (
          <p>
            SAM 3.1 found <span className="font-semibold text-foreground tabular-nums">{found}</span>{" "}
            {found === 1 ? "player" : "players"} in this clip.
            {found < 10 && " Players it missed are not on the court diagram."}
          </p>
        )
      )}
      {source === "coach" && (
        <p>
          {job.calibration?.landmarks === "lane"
            ? "Court positions use the lane corners you marked."
            : "Court positions use the corners you marked."}
        </p>
      )}
      {source === "estimated" && <p>Court positions use an estimated camera setup.</p>}
      {motion && motionTotal > 0 && (
        <p>
          Camera movement followed on <span className="tabular-nums">{motion.framesTracked}</span> of{" "}
          <span className="tabular-nums">{motionTotal}</span> frames.
        </p>
      )}
      {!mock && (
        <p>Positions on the court are worked out from the boxes, not measured. Check them against the video.</p>
      )}
      {!hasVideo && !mock && <p>The video with player boxes is not available for this analysis.</p>}
      {sample && <p className="text-xs text-muted-foreground">{SAMPLE_ATTRIBUTION}</p>}
    </Panel>
  )
}

function CourtPanel({ job, frame, synced }: { job: FilmJob; frame: number; synced: boolean }) {
  const parsed = React.useMemo(() => (job.playDna ? parseDna(job.playDna) : null), [job.playDna])
  if (!parsed)
    return <Panel className="text-sm text-muted-foreground">No player tracks to draw on the court for this clip.</Panel>
  // The court follows the video's frame; the overlay and play-dna share frame indices (both 12 fps).
  const fpsRatio = synced && job.overlay?.fps ? parsed.clip.fps / job.overlay.fps : 1
  return (
    <figure className="overflow-hidden rounded-md border border-border bg-court-wrapper">
      {synced ? (
        <DnaCourt
          parsed={parsed}
          src={frame * fpsRatio}
          label="Court diagram of the tracked players"
          className="h-auto w-full"
        />
      ) : (
        <ClipboardPlay play={job.playDna} className="block h-auto w-full" />
      )}
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-surface-1 px-3 py-2 text-xs text-muted-foreground">
        <span>Court diagram</span>
        <span>{synced ? "Follows the video" : "Loops on its own"}</span>
        {parsed.clip.ball.length > 0 && <span>Ball filled in between sightings</span>}
      </figcaption>
    </figure>
  )
}

function TeamLegend({ ball }: { ball: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <span aria-hidden className="size-2.5 rounded-xs border-2 border-info" /> Offense
      </span>
      <span className="flex items-center gap-1">
        <span aria-hidden className="size-2.5 rounded-xs border-2 border-danger" /> Defense
      </span>
      {ball && (
        <span className="flex items-center gap-1">
          <span aria-hidden className="size-2.5 rounded-full border border-white bg-[#ea7a2c]" /> Ball
        </span>
      )}
      <span>Boxes: SAM 3.1</span>
    </p>
  )
}

type Calibrating = { frame: number; points: Point[]; landmarks: Landmarks }

function DoneView({
  job,
  mock,
  sample,
  onCalibrated,
}: {
  job: FilmJob
  mock: boolean
  sample: SampleId | null
  onCalibrated: (job: FilmJob | null) => void
}) {
  const [frame, setFrame] = React.useState(0)
  const [calib, setCalib] = React.useState<Calibrating | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const fixRef = React.useRef<HTMLButtonElement>(null)
  const overlay = job.overlay
  const video = job.clipUrl && overlay ? { clipUrl: job.clipUrl, overlay } : null
  // Calibration and events came with backend 0.3.0: an older job or the mock has neither field.
  const canCalibrate = !mock && job.calibration !== undefined
  const events = Array.isArray(overlay?.ball) ? (job.playDna?.events ?? []) : null

  const leave = React.useCallback(() => {
    setCalib(null)
    requestAnimationFrame(() => fixRef.current?.focus())
  }, [])

  const side = (
    <div className="space-y-4">
      <SuggestedNameCard
        key={job.suggestedName?.title ?? ""}
        name={job.suggestedName ?? null}
        mock={mock}
        primary={!calib}
      />
      <HonestNotes job={job} mock={mock} sample={sample} />
    </div>
  )

  if (!video)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <CourtPanel job={job} frame={0} synced={false} />
        {side}
      </div>
    )

  const start = () => {
    const el = videoRef.current
    el?.pause()
    setCalib({ frame: el ? frameAt(el.currentTime, video.overlay) : frame, points: [], landmarks: "lane" })
  }
  const seek = (f: number) => {
    const el = videoRef.current
    if (!el) return
    // The middle of the frame, so frameAt lands on it despite float rounding.
    el.currentTime = (f + 0.5) / video.overlay.fps
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <figure className="space-y-2">
            <ClipOverlay
              clipUrl={video.clipUrl}
              overlay={video.overlay}
              onFrame={setFrame}
              videoRef={videoRef}
              calibrating={calib !== null}
            >
              {calib && (
                <CalibrationLayer
                  videoRef={videoRef}
                  imageSize={video.overlay.imageSize}
                  points={calib.points}
                  current={job.calibration?.frame === calib.frame ? job.calibration.points : null}
                  onTap={(p) => setCalib((c) => (c && c.points.length < 4 ? { ...c, points: [...c.points, p] } : c))}
                />
              )}
            </ClipOverlay>
            {!calib && (
              <figcaption className="flex flex-wrap items-center justify-between gap-2">
                <TeamLegend ball={Array.isArray(video.overlay.ball)} />
                {canCalibrate && (
                  <Button ref={fixRef} variant="outline" className="h-11 sm:h-8" onClick={start}>
                    <CrosshairIcon aria-hidden /> Fix court position
                  </Button>
                )}
              </figcaption>
            )}
          </figure>
          {calib && (
            <CalibrationPanel
              jobId={job.jobId}
              frame={calib.frame}
              points={calib.points}
              landmarks={calib.landmarks}
              onLandmarks={(landmarks) => setCalib((c) => (c ? { ...c, landmarks, points: [] } : c))}
              onUndo={() => setCalib((c) => (c ? { ...c, points: c.points.slice(0, -1) } : c))}
              onReset={() => setCalib((c) => (c ? { ...c, points: [] } : c))}
              onCancel={leave}
              onSaved={(next) => {
                leave()
                onCalibrated(next)
                if (next) toast("Court positions updated", { description: "Redrawn from the points you marked." })
              }}
            />
          )}
          {events && (
            <EventList events={events} fps={video.overlay.fps} frame={frame} onSeek={seek} disabled={calib !== null} />
          )}
        </div>
        <CourtPanel job={job} frame={frame} synced />
      </div>
      {side}
    </>
  )
}

export function JobView({ jobId, sample }: { jobId: string; sample: SampleId | null }) {
  const [attempt, setAttempt] = React.useState(0)
  const { poll, replace } = useJob(jobId, attempt)
  const job = poll.kind === "job" ? poll.job : null
  // Elapsed counts from the first poll that found the job still running; a finished job shows when it finished.
  const running = job !== null && !terminal(job)
  const elapsed = useElapsed(jobId, running)
  const sampleClip = sampleClips.find((c) => c.id === sample)

  if (poll.kind === "missing")
    return (
      <Panel className="text-sm">
        <p className="font-semibold">We can&rsquo;t find that analysis.</p>
        <p className="mt-1 text-muted-foreground">The link may be old, or the job id has a typo.</p>
        <Link href="/film?upload=1" className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-11 sm:h-8")}>
          Analyze a clip
        </Link>
      </Panel>
    )

  if (poll.kind === "offline")
    return (
      <Panel className="text-sm" role="alert">
        <p className="font-semibold">We lost touch with the analysis.</p>
        <p className="mt-1 text-muted-foreground">It may still be running. Check your connection and try again.</p>
        <Button variant="outline" className="mt-3 h-11 sm:h-8" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </Panel>
    )

  const finished = job ? formatJobTime(job.finishedAt) : null
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span aria-live="polite" className="flex items-center">
          {poll.kind === "loading" && <span>Checking the analysis…</span>}
          {job?.status === "done" && (
            <span className="flex items-center gap-1.5 text-foreground">
              <SparkleIcon size={14} weight="fill" aria-hidden /> Analysis done
            </span>
          )}
          {job?.status === "failed" && <span className="text-danger">Analysis stopped</span>}
          {job && !terminal(job) && <span className="text-foreground">Analyzing your clip</span>}
        </span>
        {elapsed.started && (
          <span className="tabular-nums">
            {running ? "Elapsed" : "Took"} {mmss(elapsed.secs)}
          </span>
        )}
        {!elapsed.started && finished && <span>Finished {finished}</span>}
        {sampleClip && <span>Sample clip: Hazen {sampleClip.label}</span>}
      </div>

      {job && <JobSteps job={job} />}

      {job && !terminal(job) && (
        <p className="text-sm text-muted-foreground text-pretty">
          This page checks the pipeline every few seconds. Keep it open to see each step finish.
        </p>
      )}

      {job?.status === "failed" && (
        <Panel className="text-sm" role="alert">
          <p className="flex items-center gap-1.5 font-semibold">
            <WarningIcon size={16} className="text-danger" aria-hidden /> This clip could not be analyzed.
          </p>
          <p className="mt-1 text-muted-foreground">{job.error || "Something went wrong in the pipeline."}</p>
          <Link href="/film?upload=1" className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-11 sm:h-8")}>
            Try another clip
          </Link>
        </Panel>
      )}

      {job?.status === "done" && (
        <DoneView
          job={job}
          mock={poll.kind === "job" && poll.mock}
          sample={sample}
          // The calibrate answer is the refreshed job; without one, poll again.
          onCalibrated={(next) => (next ? replace(next) : setAttempt((n) => n + 1))}
        />
      )}
    </div>
  )
}
