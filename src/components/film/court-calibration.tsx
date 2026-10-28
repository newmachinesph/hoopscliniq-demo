// Client-only (imported from the client JobView). Calibration mode: the coach picks a landmark set (the painted lane's
// corners, recommended, or the attacked half's corners) and taps its four points on the paused video; Save posts them
// with the frame and the set, and the backend redraws the court from them.
import { ArrowCounterClockwiseIcon, CircleNotchIcon } from "@phosphor-icons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import {
  aspectFor,
  clientToClip,
  insideFrame,
  isConvexQuad,
  LANDMARK_ORDER,
  LANDMARK_SETS,
  type Landmarks,
  type ObjectFit,
  type Point,
} from "@/lib/calibration"
import type { FilmJob } from "@/lib/film-job"
import { cn } from "@/lib/utils"

/** The backend re-projects and asks Muse Spark to rename the play: allow its 60 s plus the proxy's overhead. */
const SAVE_TIMEOUT_MS = 65_000
/** Keyboard crosshair step, as a share of the picture width (Shift: five times). */
const KEY_STEP = 0.01
/** On-screen marker sizes, in CSS pixels. */
const MARK = { r: 9, font: 11, stroke: 2 }

const SAVE_FAILED = "The points could not be saved. Check your connection and try again."

/** The video's own size (videoWidth x videoHeight), falling back to the overlay's imageSize before metadata loads. */
function useIntrinsic(videoRef: React.RefObject<HTMLVideoElement | null>, fallback: [number, number]) {
  const [size, setSize] = React.useState<[number, number]>(fallback)
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const read = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) setSize([video.videoWidth, video.videoHeight])
    }
    read()
    video.addEventListener("loadedmetadata", read)
    return () => video.removeEventListener("loadedmetadata", read)
  }, [videoRef])
  return size
}

/** The element's CSS size, for marker sizes that stay the same on screen at any video width. */
function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = React.useState<[number, number]>([0, 0])
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => setSize([el.clientWidth, el.clientHeight])
    const observer = new ResizeObserver(read)
    observer.observe(el)
    read()
    return () => observer.disconnect()
  }, [ref])
  return size
}

const fitOf = (video: HTMLVideoElement | null): ObjectFit =>
  ((video && getComputedStyle(video).objectFit) || "contain") as ObjectFit

/**
 * The tap surface over the video. A tap (mouse or touch) maps from the displayed picture to clip.mp4 pixels, letterbox
 * bars excluded; the marks and the outline are drawn in clip pixels through an SVG that fits the same way as the video.
 * `current` is the calibration in use, drawn faintly for reference when it was set on this frame. Its points can lie
 * off the picture (the estimate extrapolates an off-screen corner): the outline is clipped to the picture and those
 * points get no marker.
 */
export function CalibrationLayer({
  videoRef,
  imageSize,
  points,
  current,
  onTap,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>
  imageSize: [number, number]
  points: Point[]
  current?: Point[] | null
  onTap: (p: Point) => void
}) {
  const layerRef = React.useRef<HTMLDivElement>(null)
  const [iw, ih] = useIntrinsic(videoRef, imageSize)
  const [width, height] = useSize(layerRef)
  const [fit, setFit] = React.useState<ObjectFit>("contain")
  // Clip pixels per CSS pixel, so the marks keep their on-screen size.
  const scale = width && height ? Math.min(width / iw, height / ih) : 1
  const px = (n: number) => n / scale
  const full = points.length === 4
  const clipId = `calibration-frame-${React.useId().replace(/:/g, "")}`

  // Keyboard path: when the layer has keyboard focus, a crosshair shows; arrow keys move it, Enter or Space marks it.
  const [cursor, setCursor] = React.useState<Point | null>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!cursor || e.ctrlKey || e.metaKey || e.altKey) return
    const step = iw * KEY_STEP * (e.shiftKey ? 5 : 1)
    const move: Record<string, Point> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const d = move[e.key]
    if (d) {
      e.preventDefault()
      setCursor([Math.min(Math.max(cursor[0] + d[0], 0), iw), Math.min(Math.max(cursor[1] + d[1], 0), ih)])
    } else if ((e.key === "Enter" || e.key === " ") && !full) {
      e.preventDefault()
      onTap([Math.round(cursor[0] * 10) / 10, Math.round(cursor[1] * 10) / 10])
    }
  }

  // A click covers mouse, pen and touch taps alike (no scroll lock on phones).
  const tap = React.useRef({ onTap, blocked: full, size: [iw, ih] as [number, number] })
  React.useEffect(() => {
    tap.current = { onTap, blocked: full, size: [iw, ih] }
  })
  React.useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    setFit(fitOf(videoRef.current))
    const onClick = (e: MouseEvent) => {
      if (tap.current.blocked) return
      const video = videoRef.current
      const box = (video ?? layer).getBoundingClientRect()
      const p = clientToClip(e.clientX, e.clientY, box, tap.current.size, fitOf(video))
      if (p) tap.current.onTap(p)
    }
    layer.addEventListener("click", onClick)
    return () => layer.removeEventListener("click", onClick)
  }, [videoRef])

  return (
    <div
      ref={layerRef}
      role="application"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the keyboard crosshair needs focus; role="application" takes the arrow keys
      tabIndex={0}
      aria-label="Video frame. Tap the court points, or use the arrow keys to move the crosshair and Enter to mark."
      data-testid="calibration-layer"
      onFocus={(e) => {
        if (e.currentTarget.matches(":focus-visible")) setCursor((c) => c ?? [iw / 2, ih / 2])
      }}
      onBlur={() => setCursor(null)}
      onKeyDown={onKeyDown}
      className={cn(
        "absolute inset-0 touch-manipulation select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        full ? "cursor-default" : "cursor-crosshair",
      )}
    >
      <svg
        viewBox={`0 0 ${iw} ${ih}`}
        preserveAspectRatio={aspectFor(fit)}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={iw} height={ih} />
          </clipPath>
        </defs>
        {current?.length === 4 && (
          <g clipPath={`url(#${clipId})`} data-testid="current-calibration">
            <polygon
              points={current.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#ffffff"
              strokeOpacity={0.7}
              strokeWidth={px(1.5)}
              strokeDasharray={`${px(6)} ${px(5)}`}
              strokeLinejoin="round"
            />
            {current
              .filter((p) => insideFrame(p, [iw, ih]))
              .map(([x, y]) => (
                <circle key={`${x},${y}`} cx={x} cy={y} r={px(3)} fill="#ffffff" fillOpacity={0.8} />
              ))}
          </g>
        )}
        {points.length > 1 &&
          React.createElement(full ? "polygon" : "polyline", {
            points: points.map((p) => p.join(",")).join(" "),
            fill: full ? "var(--brand-orange)" : "none",
            fillOpacity: full ? 0.18 : undefined,
            stroke: "var(--brand-orange)",
            strokeWidth: px(MARK.stroke),
            strokeLinejoin: "round",
          })}
        {cursor && !full && (
          <g stroke="#ffffff" strokeWidth={px(1.5)}>
            <line x1={cursor[0] - px(14)} y1={cursor[1]} x2={cursor[0] + px(14)} y2={cursor[1]} />
            <line x1={cursor[0]} y1={cursor[1] - px(14)} x2={cursor[0]} y2={cursor[1] + px(14)} />
            <circle cx={cursor[0]} cy={cursor[1]} r={px(6)} fill="none" stroke="var(--brand-orange)" />
          </g>
        )}
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={px(MARK.r)} fill="var(--brand-navy)" stroke="#ffffff" strokeWidth={px(1.5)} />
            <text
              x={x}
              y={y}
              fill="#ffffff"
              fontSize={px(MARK.font)}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {i + 1}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Sketch corners of the attacked half (baseline far, half-court line near) and of the painted lane, in tap order. */
const SKETCH: Record<Landmarks, Point[]> = {
  half: [
    [22, 10],
    [86, 10],
    [102, 66],
    [6, 66],
  ],
  lane: [
    [46, 10],
    [62, 10],
    [64, 32],
    [44, 32],
  ],
}

/**
 * A small top-down sketch of the attacked half as the camera sees it (baseline far, half-court line near) with the
 * four points of the chosen set numbered in tap order. Marked points are filled; the next one is ringed in orange.
 */
function CourtSketch({ next, landmarks }: { next: number; landmarks: Landmarks }) {
  const lane = landmarks === "lane"
  // The lane corners sit close together: smaller markers keep them apart.
  const r = lane ? 4.6 : 5.5
  return (
    <svg
      viewBox="0 0 108 76"
      className="h-auto w-24 shrink-0 sm:w-28"
      role="img"
      aria-label={lane ? "Court sketch, painted lane corners" : "Court sketch, half-court corners"}
    >
      <polygon
        points={SKETCH.half.map((p) => p.join(",")).join(" ")}
        className="fill-court-wrapper stroke-muted-foreground"
        strokeWidth={1.2}
      />
      <polygon
        points={SKETCH.lane.map((p) => p.join(",")).join(" ")}
        className={cn("stroke-muted-foreground", lane ? "fill-brand-orange/15" : "fill-none")}
        strokeWidth={1}
      />
      <circle cx={54} cy={15} r={2.2} className="fill-none stroke-muted-foreground" strokeWidth={1} />
      {SKETCH[landmarks].map(([x, y], i) => {
        const done = i < next
        const isNext = i === next
        return (
          <g key={i}>
            {isNext && <circle cx={x} cy={y} r={r + 2.5} className="fill-none stroke-brand-orange" strokeWidth={2} />}
            <circle
              cx={x}
              cy={y}
              r={r}
              className={done ? "fill-foreground" : isNext ? "fill-brand-orange" : "fill-surface-1 stroke-border"}
              strokeWidth={1}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={lane ? 6 : 7}
              fontWeight={700}
              className={done ? "fill-background" : isNext ? "fill-white" : "fill-muted-foreground"}
            >
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const LANDMARK_OPTIONS = LANDMARK_ORDER.map((value) => ({ value, label: LANDMARK_SETS[value].label }))

/**
 * The landmark choice (lane corners first), steps, the sketch, Undo / Reset / Cancel and the view's one orange button,
 * Save. Switching the landmark set clears the marks. Escape cancels and Backspace undoes (not while saving). Save posts
 * the frame, points and landmark set; a 200 hands the refreshed job back through `onSaved`.
 */
export function CalibrationPanel({
  jobId,
  frame,
  points,
  landmarks,
  onLandmarks,
  onUndo,
  onReset,
  onCancel,
  onSaved,
}: {
  jobId: string
  frame: number
  points: Point[]
  landmarks: Landmarks
  onLandmarks: (landmarks: Landmarks) => void
  onUndo: () => void
  onReset: () => void
  onCancel: () => void
  onSaved: (job: FilmJob | null) => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const panelRef = React.useRef<HTMLElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const step = points.length
  const full = step === 4
  const convex = full && isConvexQuad(points)
  const set = LANDMARK_SETS[landmarks]

  React.useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
    return () => abortRef.current?.abort()
  }, [])

  // A new tap or undo clears the last error.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on every change of the points
  React.useEffect(() => setError(null), [points])

  const handlers = React.useRef({ onUndo, onCancel, saving })
  React.useEffect(() => {
    handlers.current = { onUndo, onCancel, saving }
  })
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.isContentEditable || t?.closest("input, textarea, select, [role='textbox'], [role='dialog']")) return
      if (handlers.current.saving) return
      if (e.key === "Escape") {
        e.preventDefault()
        handlers.current.onCancel()
      } else if (e.key === "Backspace") {
        e.preventDefault()
        handlers.current.onUndo()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const save = async () => {
    if (!convex || saving) return
    const controller = new AbortController()
    abortRef.current = controller
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, SAVE_TIMEOUT_MS)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/film/jobs/${encodeURIComponent(jobId)}/calibrate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ frame, points, landmarks }),
        signal: controller.signal,
      })
      const body = (await res.json().catch(() => null)) as (FilmJob & { error?: string }) | null
      if (!res.ok) {
        setError(body?.error || SAVE_FAILED)
        setSaving(false)
        return
      }
      onSaved(body && body.jobId === jobId && body.status === "done" ? body : null)
    } catch {
      // Aborted without a timeout: the panel closed, nothing to show.
      if (controller.signal.aborted && !timedOut) return
      setError(timedOut ? "Saving took longer than a minute. Try again in a moment." : SAVE_FAILED)
      setSaving(false)
    } finally {
      clearTimeout(timer)
    }
  }

  let instruction: string
  if (!full) instruction = `Step ${step + 1} of 4. ${set.corners[step]?.tap ?? ""}`
  else if (!convex) instruction = "Those points cross over. Undo and tap them in the order shown."
  else instruction = "All four points marked. Save to redraw the court from them."

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby="calibrate-title"
      className="space-y-3 rounded-md border border-border bg-surface-1 p-4 outline-none"
    >
      <fieldset disabled={saving} className="min-w-0">
        <legend className="sr-only">What to mark</legend>
        <Segmented<Landmarks>
          label="What to mark"
          options={LANDMARK_OPTIONS}
          value={landmarks}
          onChange={(next) => next !== landmarks && onLandmarks(next)}
          className="flex-wrap"
        />
      </fieldset>
      <div className="flex items-start gap-3">
        <CourtSketch next={step} landmarks={landmarks} />
        <div className="min-w-0 space-y-1">
          <h2 id="calibrate-title" className="text-sm font-semibold">
            Fix court position
          </h2>
          <p aria-live="polite" className={cn("text-sm text-pretty", full && !convex && "text-danger")}>
            {instruction}
          </p>
          <p className="text-xs text-muted-foreground text-pretty">
            {set.frameHint}; Cancel to move the video.
            <span className="hidden sm:inline"> Esc cancels, Backspace undoes.</span>
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button className="h-11 sm:h-8" disabled={!convex || saving} onClick={save}>
          {saving && <CircleNotchIcon weight="bold" className="motion-safe:animate-spin" aria-hidden />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="outline" className="h-11 sm:h-8" disabled={!step || saving} onClick={onUndo}>
          <ArrowCounterClockwiseIcon aria-hidden /> Undo
        </Button>
        <Button variant="outline" className="h-11 sm:h-8" disabled={!step || saving} onClick={onReset}>
          Reset
        </Button>
        <Button variant="ghost" className="h-11 sm:h-8" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {saving && (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Redrawing the court and renaming the play. This can take up to a minute.
        </p>
      )}
    </section>
  )
}
