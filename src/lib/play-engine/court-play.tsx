"use client"

import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "@phosphor-icons/react"
import * as React from "react"

import { cn } from "@/lib/utils"
import { H } from "./court"
import { buildClip, FRAME_MS, STEPS, stillNotes } from "./court-clip"
import type { Play } from "./types"
import { useLoopVisible } from "./use-loop-visible"

export { FRAME_MS } from "./court-clip"

/** The H court's window in the Play model's units (tenths of a foot), so overlays can share it. */
export const COURT_VIEW = { x: H.VIEW.x * 10, y: H.VIEW.y * 10, w: H.VIEW.w * 10, h: H.VIEW.h * 10 }
const VIEWBOX = `${COURT_VIEW.x} ${COURT_VIEW.y} ${COURT_VIEW.w} ${COURT_VIEW.h}`

// court.js names its patterns and markers ("planks", "head-off"); every SVG on a page gets its own copies, so a court
// inside a hidden container can't take the floor away from the visible ones.
const scoped = (markup: string, uid: string) => markup.replace(/id="/g, `id="${uid}`).replace(/url\(#/g, `url(#${uid}`)
const FLOOR = H.floorMarkup()
const LINES = H.linesMarkup()

export interface CourtPlayProps {
  play: Play
  frame?: number
  t?: number
  showDefense?: boolean
  showActions?: boolean
  selected?: number | null
  className?: string
  title?: string
  /**
   * "planned" draws this frame's arrows in full (a still), "live" draws them as they happen (playback),
   * "summary" draws every arrow from the start positions. Default: planned when t is 0, else live.
   */
  mode?: "planned" | "live" | "summary"
  /** Action tags ("BALL SCREEN") on stills; off for thumbnails too small to read them. */
  tags?: boolean
}

/**
 * One moment of a play on the clipboard court: wood floor, numbered discs, X1-X5, coaching notation (pass dashed,
 * cut arrow, dribble zigzag, screen T, handoff bars), action tags and the ball's area. Drop-in for PlayDiagram.
 */
export function CourtPlay({
  play,
  frame = 0,
  t = 0,
  showDefense = false,
  showActions = true,
  selected = null,
  className,
  title,
  mode,
  tags = true,
}: CourtPlayProps) {
  const uid = `c${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const built = React.useMemo(() => buildClip(play, showDefense), [play, showDefense])
  const floor = React.useMemo(() => scoped(FLOOR, uid), [uid])
  const lines = React.useMemo(() => scoped(LINES, uid), [uid])
  const frames = Math.max(1, play.frames.length)
  const fi = Math.min(Math.max(0, frame), frames - 1)
  const label = title ?? `${play.title}, frame ${fi + 1} of ${frames}`

  let body = ""
  let ring: [number, number] | null = null
  if (built) {
    const src = Math.min(Math.max(0, (fi + (fi >= frames - 1 ? 0 : t)) * STEPS), built.total - 1)
    const how = mode ?? (t === 0 ? "planned" : "live")
    const f = Math.round(src)
    const notes = how === "live" ? built.notes : stillNotes(built.notes, f, how, tags)
    const out = H.frame(built.clip, notes, how === "summary" ? 0 : src, {
      notation: showActions,
      history: true,
      highlightBall: true,
    })
    body = scoped(out.areas, uid) + lines + scoped(out.dynamic, uid)
    const track = selected !== null ? built.offense[selected] : undefined
    if (track?.length) {
      const i = Math.min(track.length - 1, Math.floor(src))
      const j = Math.min(track.length - 1, i + 1)
      const a = track[i] as [number, number]
      const b = track[j] as [number, number]
      const u = src - i
      ring = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
    }
  } else {
    body = lines
  }

  return (
    <svg viewBox={VIEWBOX} className={className} role="img" aria-label={label}>
      <g transform="scale(10)">
        {/* court.js markup: numbers and escaped text only, from a play it validated (as in ClipboardPlay) */}
        <g dangerouslySetInnerHTML={{ __html: floor }} />
        <g dangerouslySetInnerHTML={{ __html: body }} />
        {ring && (
          <circle
            cx={ring[0]}
            cy={ring[1]}
            r={2.65}
            fill="none"
            stroke="var(--court-lines)"
            strokeWidth={0.32}
            strokeDasharray="0.7 0.45"
          />
        )}
      </g>
    </svg>
  )
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return reduced
}

/**
 * Playback clock for a play: frame index + progress toward the next frame. `gate: false` holds the clock without
 * changing `playing` (offscreen, hovered), so it resumes where it stopped.
 */
export function usePlayback(play: Play, { autoplay = false, loop = false, speed = 1, gate = true } = {}) {
  const reduced = usePrefersReducedMotion()
  const [playing, setPlaying] = React.useState(false)
  const [position, setPosition] = React.useState(0) // in frames, e.g. 1.4
  // Mirrors `position` so the rAF tick can decide the end without a state updater.
  const posRef = React.useRef(0)
  const commit = React.useCallback((next: number) => {
    posRef.current = next
    setPosition(next)
  }, [])
  const last = Math.max(0, play.frames.length - 1)

  React.useEffect(() => {
    if (!autoplay) return
    // Read the query here: on the first pass `reduced` is still its server default (false).
    const reduce = reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    setPlaying(!reduce && last > 0)
  }, [autoplay, reduced, last])

  const running = playing && gate

  React.useEffect(() => {
    if (!running) return
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      // The first rAF timestamp can predate performance.now() (a negative dt would index frames[-1]),
      // and a hidden tab must not jump the play forward: 0-100 ms per tick.
      const dt = Math.min(100, Math.max(0, now - prev))
      prev = now
      const nextPos = posRef.current + (dt / FRAME_MS) * speed
      if (nextPos >= last && !loop) {
        commit(last)
        setPlaying(false)
        return
      }
      // Loop: short hold on the final frame, then back to the start.
      commit(loop && nextPos >= last + 0.8 ? 0 : nextPos)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, loop, last, speed, commit])

  const clamped = Math.max(0, Math.min(position, last))
  const frame = Math.min(Math.floor(clamped), last)
  const seek = (p: number) => commit(Math.max(0, Math.min(last, p)))
  return {
    frame,
    t: frame >= last ? 0 : clamped - frame,
    position: clamped,
    last,
    playing,
    reduced,
    play: () => {
      if (last === 0) return
      if (position >= last) commit(0)
      setPlaying(true)
    },
    pause: () => setPlaying(false),
    seek,
    /** Pause and land on the next or previous whole frame. */
    step: (dir: 1 | -1) => {
      setPlaying(false)
      seek(dir > 0 ? Math.floor(clamped + 0.001) + 1 : Math.ceil(clamped - 0.001) - 1)
    },
  }
}

export type Playback = ReturnType<typeof usePlayback>

/** Looping animated court for previews. Reduced motion shows the whole play as one diagram instead. */
export function AnimatedCourtPlay({
  play,
  className,
  showDefense = true,
  title,
  controls = false,
}: {
  play: Play
  className?: string
  showDefense?: boolean
  title?: string
  /** A compact transport under the court. */
  controls?: boolean
}) {
  const [speed, setSpeed] = React.useState(1)
  const [userPaused, setUserPaused] = React.useState(false)
  const [engaged, setEngaged] = React.useState(false) // hovered or focused: hold so it can be read
  const { ref, visible } = useLoopVisible<HTMLDivElement>()
  // With a transport the viewer already has pause; the hover hold and toggle are for bare courts.
  const gate = visible && (controls || (!userPaused && !engaged))
  const pb = usePlayback(play, { autoplay: true, loop: true, speed, gate })
  const summary = pb.reduced && !pb.playing && pb.position === 0
  const live = pb.playing && gate
  return (
    <div
      ref={ref}
      role="group"
      aria-label={title ?? play.title}
      className="relative"
      onPointerEnter={controls ? undefined : () => setEngaged(true)}
      onPointerLeave={controls ? undefined : () => setEngaged(false)}
      onFocus={controls ? undefined : () => setEngaged(true)}
      onBlur={controls ? undefined : () => setEngaged(false)}
    >
      <CourtPlay
        play={play}
        frame={pb.frame}
        t={pb.t}
        showDefense={showDefense}
        className={className}
        title={title}
        mode={summary ? "summary" : live ? "live" : undefined}
        tags={!summary}
      />
      {controls ? (
        <PlayTransport playback={pb} speed={speed} onSpeed={setSpeed} compact className="mt-2" />
      ) : (
        !pb.reduced &&
        pb.last > 0 && (
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            aria-label={userPaused ? "Play the animation" : "Pause the animation"}
            className="absolute right-2 bottom-2 grid size-11 place-items-center rounded-full border border-border bg-surface-1/90 text-foreground shadow-1 transition-colors hover:bg-surface-2 md:size-9"
          >
            {userPaused ? (
              <PlayIcon size={16} weight="fill" aria-hidden />
            ) : (
              <PauseIcon size={16} weight="fill" aria-hidden />
            )}
          </button>
        )
      )}
    </div>
  )
}

export const TRANSPORT_SPEEDS = [0.5, 1, 2] as const

/** Space plays or pauses, arrows step a frame. The scrubber keeps its own arrow keys. */
export function onPlaybackKey(pb: Playback) {
  return (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const target = e.target as HTMLElement
    if (e.key === " ") {
      if (target.closest("input, textarea, select")) return
      e.preventDefault()
      if (pb.playing) pb.pause()
      else pb.play()
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (target.closest("input, textarea, select, [role='radiogroup']")) return
      e.preventDefault()
      pb.step(e.key === "ArrowRight" ? 1 : -1)
    }
  }
}

/**
 * Shared transport: step back, play/pause, step forward, a scrubber, the frame label and 0.5x/1x/2x.
 * 44px targets on phone; space and arrows work while focus is inside it.
 */
export function PlayTransport({
  playback: pb,
  speed,
  onSpeed,
  compact = false,
  className,
}: {
  playback: Playback
  speed: number
  onSpeed: (speed: number) => void
  /** One row, smaller type: for cards. */
  compact?: boolean
  className?: string
}) {
  const frames = pb.last + 1
  const btn =
    "grid size-11 shrink-0 place-items-center rounded-sm border border-border bg-surface-1 text-foreground transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40 md:size-9"
  return (
    <div
      role="group"
      aria-label="Play controls"
      onKeyDown={onPlaybackKey(pb)}
      className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          onClick={() => pb.step(-1)}
          disabled={pb.position <= 0}
          aria-label="Previous frame"
          title="Previous frame · ←"
        >
          <SkipBackIcon size={16} weight="fill" aria-hidden />
        </button>
        <button
          type="button"
          onClick={pb.playing ? pb.pause : pb.play}
          disabled={frames < 2}
          aria-label={pb.playing ? "Pause" : "Play"}
          title={`${pb.playing ? "Pause" : "Play"} · Space`}
          className="grid size-11 shrink-0 place-items-center rounded-sm bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40 md:size-9"
        >
          {pb.playing ? (
            <PauseIcon size={16} weight="fill" aria-hidden />
          ) : (
            <PlayIcon size={16} weight="fill" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => pb.step(1)}
          disabled={pb.position >= pb.last}
          aria-label="Next frame"
          title="Next frame · →"
        >
          <SkipForwardIcon size={16} weight="fill" aria-hidden />
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(pb.last, 0.001)}
        step={0.01}
        value={pb.position}
        disabled={frames < 2}
        onChange={(e) => {
          pb.pause()
          pb.seek(Number(e.target.value))
        }}
        aria-label="Position in the play"
        aria-valuetext={`Frame ${pb.frame + 1} of ${frames}`}
        className="h-11 min-w-24 flex-1 accent-[var(--brand-orange)] md:h-9"
      />
      <span className={cn("text-muted-foreground tabular-nums", compact ? "text-[0.6875rem]" : "text-xs")}>
        {pb.frame + 1}/{frames}
      </span>
      <div
        role="radiogroup"
        aria-label="Speed"
        className={cn("flex items-center rounded-sm border border-border bg-surface-1 p-0.5", !compact && "ml-auto")}
      >
        {TRANSPORT_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => onSpeed(s)}
            className={cn(
              "min-h-11 min-w-11 rounded-xs px-1.5 text-xs tabular-nums transition-colors md:min-h-7 md:min-w-9",
              speed === s
                ? "bg-surface-2 font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
