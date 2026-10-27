"use client"

import {
  ArrowClockwiseIcon,
  ArrowCounterClockwiseIcon,
  CornersInIcon,
  CornersOutIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SparkleIcon,
} from "@phosphor-icons/react"
import * as React from "react"

import { PersonAvatar } from "@/components/shell/avatar"
import { gameClock, timecode } from "@/data/film"
import { cn } from "@/lib/utils"
import { FRAME, useClock, useClockPlaying, useClockRate, useClockTime } from "./clock"
import { playFrameAt, TrackedCourt } from "./court-view"
import { useFilmRoom } from "./film-room-context"
import { staffLabel } from "./people"
import { hatchOnDark, playerButton } from "./styles"
import { deadBallLabel, gameElapsedAt, liveIndexAt, possessionIndexAt, scoreAt, scoreTable } from "./timeline"

const RATES = [0.5, 1, 2] as const

/** The "broadcast": a top-down court view of the possession (sample data, no real video), styled and controlled like a video player. */
export function FilmPlayer() {
  const frameRef = React.useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = React.useState(false)

  React.useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const toggleFullscreen = React.useCallback(() => {
    const el = frameRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen?.().catch(() => undefined)
  }, [])

  // "f" toggles fullscreen; the film room's key handler dispatches this event so it stays in one place.
  React.useEffect(() => {
    const onToggle = () => toggleFullscreen()
    window.addEventListener("film:fullscreen", onToggle)
    return () => window.removeEventListener("film:fullscreen", onToggle)
  }, [toggleFullscreen])

  return (
    <section
      ref={frameRef}
      aria-label="Film player"
      className="group/player overflow-hidden rounded-md bg-brand-navy text-white shadow-2 data-[fullscreen=true]:flex data-[fullscreen=true]:flex-col data-[fullscreen=true]:justify-center data-[fullscreen=true]:rounded-none"
      data-fullscreen={fullscreen}
    >
      <Viewport />
      <Controls fullscreen={fullscreen} onFullscreen={toggleFullscreen} />
    </section>
  )
}

function Viewport() {
  const { film, possessions, comments } = useFilmRoom()
  const clock = useClock()
  const t = useClockTime()
  const table = React.useMemo(() => scoreTable(possessions), [possessions])
  const live = liveIndexAt(possessions, t)
  const shownIndex = live >= 0 ? live : Math.max(0, possessionIndexAt(possessions, t))
  const p = possessions[shownIndex]
  const score = scoreAt(possessions, table, t)
  const { q, clock: gc } = gameClock(gameElapsedAt(possessions, t))
  const frame = p ? playFrameAt(p, live >= 0 ? t : p.end) : null
  const pin = comments.find((c) => t >= c.at && t < c.at + 4)
  const pinAuthor = pin ? staffLabel(pin.authorId) : null

  return (
    <div className="relative aspect-video w-full overflow-hidden group-data-[fullscreen=true]/player:mx-auto group-data-[fullscreen=true]/player:w-[min(100%,calc((100svh-5.5rem)*16/9))] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklch,var(--color-brand-navy)_70%,white_8%),var(--color-brand-navy)_70%)]">
      {p && frame && (
        <button
          type="button"
          onClick={() => clock.toggle()}
          aria-label="Play or pause"
          className="absolute inset-0 flex items-center justify-center focus-visible:outline-offset-[-4px]"
        >
          <span
            className={cn(
              "block h-[94%] transition-opacity [transform:perspective(1100px)_rotateX(14deg)]",
              live < 0 && "opacity-45",
            )}
          >
            <TrackedCourt
              dna={p.dna}
              src={frame.src}
              label={`Court view, possession ${p.n}: ${p.set}`}
              className="h-full w-auto drop-shadow-xl"
            />
          </span>
        </button>
      )}

      {/* Top left: what's on screen. */}
      {p && (
        <div className="pointer-events-none absolute top-2 left-2 flex max-w-[70%] flex-wrap items-center gap-1.5 text-[0.6875rem] sm:top-3 sm:left-3 sm:text-xs">
          <span className="rounded-xs bg-black/55 px-1.5 py-0.5 font-semibold tabular-nums backdrop-blur-sm">
            {live >= 0 ? `${p.side === "us" ? film.us.short : film.them.short} ball` : deadBallLabel(film, t)}
          </span>
          {live >= 0 && (
            <span className="truncate rounded-xs bg-black/55 px-1.5 py-0.5 backdrop-blur-sm">
              {p.set}
              {frame?.settingUp ? " · setting up" : ""}
            </span>
          )}
          {live >= 0 && p.tag?.status === "proposed" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-xs bg-black/55 px-1.5 py-0.5 font-semibold tabular-nums backdrop-blur-sm",
              )}
            >
              <span aria-hidden className={cn("size-2.5 rounded-[2px]", hatchOnDark)} />
              <SparkleIcon size={11} weight="fill" aria-hidden /> Suggested · needs review
            </span>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute top-2 right-2 hidden text-right text-[0.625rem] tracking-wide text-white/60 uppercase sm:top-3 sm:right-3 sm:block">
        Court view · sample
        <span className="block normal-case tracking-normal">{film.camera}</span>
      </div>

      {/* Comment pin on the frame while its moment plays. */}
      {pin && pinAuthor && (
        <div className="pointer-events-none absolute top-10 left-1/2 hidden w-[min(28rem,80%)] -translate-x-1/2 items-start gap-2 rounded-md bg-black/65 p-2 text-xs backdrop-blur-sm sm:flex">
          <PersonAvatar initials={pinAuthor.initials} hue={pinAuthor.hue} size={22} />
          <p className="min-w-0 leading-snug">
            <span className="font-semibold">{pinAuthor.name}</span> <span className="text-white/80">{pin.body}</span>
          </p>
        </div>
      )}

      {/* Scoreboard bug, bottom left. */}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-stretch overflow-hidden rounded-xs text-[0.6875rem] font-semibold tabular-nums shadow-2 sm:bottom-3 sm:left-3 sm:text-xs">
        <span className="bg-white px-1.5 py-0.5 text-brand-navy sm:px-2">
          {film.us.short} {score.us}
        </span>
        <span className="bg-brand-navy/90 px-1.5 py-0.5 ring-1 ring-white/20 ring-inset sm:px-2">
          {film.them.short} {score.them}
        </span>
        <span className="bg-black/70 px-1.5 py-0.5 sm:px-2">
          Q{q} {gc}
        </span>
      </div>

      <div className="pointer-events-none absolute right-2 bottom-2 rounded-xs bg-black/55 px-1.5 py-0.5 font-mono text-[0.6875rem] tabular-nums backdrop-blur-sm sm:right-3 sm:bottom-3 sm:text-xs">
        {timecode(t)}
      </div>
    </div>
  )
}

function Controls({ fullscreen, onFullscreen }: { fullscreen: boolean; onFullscreen: () => void }) {
  const clock = useClock()
  const playing = useClockPlaying()
  const rate = useClockRate()

  return (
    <div className="border-t border-white/10 px-2 pt-1 pb-1.5 sm:px-3">
      <Scrubber />
      <div className="mt-0.5 flex items-center gap-0.5 sm:gap-1">
        <button
          type="button"
          className={playerButton}
          onClick={() => clock.toggle()}
          aria-label={playing ? "Pause (Space)" : "Play (Space)"}
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >
          {playing ? (
            <PauseIcon size={18} weight="fill" aria-hidden />
          ) : (
            <PlayIcon size={18} weight="fill" aria-hidden />
          )}
        </button>
        <button
          type="button"
          className={playerButton}
          onClick={() => clock.nudge(-5)}
          aria-label="Back 5 seconds (Left arrow)"
          title="Back 5 s (←)"
        >
          <ArrowCounterClockwiseIcon size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={playerButton}
          onClick={() => clock.nudge(5)}
          aria-label="Forward 5 seconds (Right arrow)"
          title="Forward 5 s (→)"
        >
          <ArrowClockwiseIcon size={17} aria-hidden />
        </button>
        <button
          type="button"
          className={cn(playerButton, "hidden min-[400px]:grid")}
          onClick={() => {
            clock.pause()
            clock.nudge(-FRAME)
          }}
          aria-label="Previous frame (comma)"
          title="Previous frame (,)"
        >
          <SkipBackIcon size={16} weight="fill" aria-hidden />
        </button>
        <button
          type="button"
          className={cn(playerButton, "hidden min-[400px]:grid")}
          onClick={() => {
            clock.pause()
            clock.nudge(FRAME)
          }}
          aria-label="Next frame (period)"
          title="Next frame (.)"
        >
          <SkipForwardIcon size={16} weight="fill" aria-hidden />
        </button>
        <Timecode />
        <span className="ml-auto" />
        <div role="radiogroup" aria-label="Playback speed" className="flex items-center rounded-sm bg-white/8 p-0.5">
          {RATES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={rate === r}
              onClick={() => clock.setRate(r)}
              className={cn(
                "h-9 min-w-9 rounded-xs px-1.5 text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-6 sm:min-w-8",
                rate === r ? "bg-white/18 font-semibold text-white" : "text-white/65 hover:text-white",
              )}
            >
              {r}x
            </button>
          ))}
        </div>
        <button
          type="button"
          className={playerButton}
          onClick={onFullscreen}
          aria-label={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
          title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
        >
          {fullscreen ? <CornersInIcon size={17} aria-hidden /> : <CornersOutIcon size={17} aria-hidden />}
        </button>
      </div>
    </div>
  )
}

function Timecode() {
  const { film } = useFilmRoom()
  const t = useClockTime()
  return (
    <span className="ml-1 font-mono text-xs whitespace-nowrap text-white/80 tabular-nums">
      {timecode(t)} <span className="text-white/45">/ {timecode(film.duration)}</span>
    </span>
  )
}

/** Scrubber with comment pins (avatar dots) above and turnover markers below; drag, click or use the arrow keys. */
function Scrubber() {
  const { film, possessions, comments } = useFilmRoom()
  const clock = useClock()
  const t = useClockTime()
  const trackRef = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef(false)
  const [hover, setHover] = React.useState<number | null>(null)
  const d = film.duration
  const pct = (s: number) => `${(s / d) * 100}%`

  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * d
  }
  const hoverClock = hover === null ? null : gameClock(gameElapsedAt(possessions, hover))
  const turnovers = React.useMemo(() => possessions.filter((p) => p.result === "TOV" && p.tag), [possessions])

  return (
    <div className="relative">
      {/* Comment pins */}
      <div className="relative h-5">
        {comments.map((c) => {
          const who = staffLabel(c.authorId)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => clock.seek(c.at)}
              title={`${who.name} at ${timecode(c.at)}: ${c.body}`}
              aria-label={`Comment by ${who.name} at ${timecode(c.at)}`}
              className="absolute top-0.5 -translate-x-1/2 rounded-full ring-2 ring-brand-navy transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-ring"
              style={{ left: pct(c.at) }}
            >
              <PersonAvatar initials={who.initials} hue={who.hue} size={16} className="text-[7px]" />
            </button>
          )
        })}
      </div>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(d)}
        aria-valuenow={Math.round(t)}
        aria-valuetext={timecode(t)}
        className="group/track relative flex h-7 cursor-pointer touch-none items-center rounded-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-5"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragging.current = true
          clock.seek(timeAt(e.clientX))
        }}
        onPointerMove={(e) => {
          const at = timeAt(e.clientX)
          setHover(at)
          if (dragging.current) clock.seek(at)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
        onPointerLeave={() => setHover(null)}
        onKeyDown={(e) => {
          const step = { ArrowLeft: -5, ArrowRight: 5, PageDown: -30, PageUp: 30 }[e.key]
          if (step !== undefined) {
            e.preventDefault()
            e.stopPropagation()
            clock.nudge(step)
          } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault()
            clock.seek(e.key === "Home" ? 0 : d)
          }
        }}
      >
        <div className="relative h-1 w-full rounded-full bg-white/20 transition-[height] group-hover/track:h-1.5">
          <div className="absolute inset-y-0 left-0 rounded-full bg-playhead" style={{ width: pct(t) }} />
          {hover !== null && (
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: pct(hover) }} />
          )}
        </div>
        {turnovers.map((p) => (
          <span
            key={p.id}
            aria-hidden
            className="absolute bottom-0 h-1.5 w-px bg-white/45"
            style={{ left: pct(p.eventAt) }}
          />
        ))}
        <span
          aria-hidden
          className="absolute size-3 -translate-x-1/2 rounded-full bg-playhead shadow-1 ring-2 ring-brand-navy"
          style={{ left: pct(t) }}
        />
        {hover !== null && hoverClock && (
          <span
            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-xs bg-black/80 px-1.5 py-0.5 text-[0.6875rem] whitespace-nowrap tabular-nums"
            style={{ left: `clamp(2.5rem, ${pct(hover)}, calc(100% - 2.5rem))` }}
          >
            {timecode(hover)} · Q{hoverClock.q} {hoverClock.clock}
          </span>
        )}
      </div>
    </div>
  )
}
