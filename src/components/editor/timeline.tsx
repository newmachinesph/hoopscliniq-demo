"use client"

import { CopyIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react"
import * as React from "react"

import { IconButton } from "@/components/ui/icon-button"
import type { PlaybookPlay } from "@/data/plays"
import type { Action, Frame, Point } from "@/lib/play-engine/types"
import { cn } from "@/lib/utils"
import { FRAME_SECONDS } from "./play-edits"

const MIN_HEIGHT = 120
const MAX_HEIGHT = 320

// Tracks: 20% tint + 3px solid edge (28% in dark), DIRECTION "Timeline". Literal classes so Tailwind sees them.
const TRACK_STYLES = [
  "border-chart-2 bg-chart-2/20 dark:bg-chart-2/28",
  "border-chart-3 bg-chart-3/20 dark:bg-chart-3/28",
  "border-chart-4 bg-chart-4/20 dark:bg-chart-4/28",
  "border-chart-2 bg-chart-2/20 dark:bg-chart-2/28",
  "border-chart-3 bg-chart-3/20 dark:bg-chart-3/28",
]
const BALL_STYLE = "border-chart-5 bg-chart-5/20 dark:bg-chart-5/28"
const POSITIONS = ["PG", "SG", "SF", "PF", "C"]

export function formatSeconds(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`
}

const near = (a: Point | undefined, b: Point | undefined) => !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1

const KIND_LABEL: Record<Action["kind"], string> = {
  cut: "Cut",
  dribble: "Dribble",
  screen: "Screen",
  pass: "Pass",
  handoff: "Handoff",
}

function playerBlock(frame: Frame, next: Frame, p: number): string | null {
  const action = frame.actions.find((a) => a.kind !== "pass" && a.kind !== "handoff" && near(a.from, frame.offense[p]))
  if (action) return KIND_LABEL[action.kind]
  return near(frame.offense[p], next.offense[p]) ? null : "Move"
}

function ballBlock(frame: Frame, next: Frame): string | null {
  if (next.ball !== frame.ball) return `Pass ${frame.ball + 1}→${next.ball + 1}`
  const holder = frame.offense[frame.ball]
  return frame.actions.some((a) => a.kind === "dribble" && near(a.from, holder)) ? "Dribble" : null
}

export interface TimelineProps {
  play: PlaybookPlay
  position: number
  frame: number
  selected: number | null
  onSeek: (position: number) => void
  onScrubStart: () => void
  onAddFrame: () => void
  onDuplicateFrame: () => void
  onDeleteFrame: () => void
}

/** Docked timeline: ruler, one track per player and the ball, frame blocks, orange playhead with a time pill. */
export function Timeline({
  play,
  position,
  frame,
  selected,
  onSeek,
  onScrubStart,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
}: TimelineProps) {
  const [height, setHeight] = React.useState(196)
  const lane = React.useRef<HTMLDivElement>(null)
  const resizing = React.useRef<{ y: number; h: number } | null>(null)
  const count = play.frames.length
  const last = count - 1
  // A single-frame play has nothing to animate: keep the playhead at 0 instead of dividing by zero.
  const pct = (p: number) => (last > 0 ? (p / last) * 100 : 0)
  const players = play.frames[0]?.offense.length ?? 0

  const seekFrom = (clientX: number) => {
    const rect = lane.current?.getBoundingClientRect()
    if (!rect || last === 0) return
    onSeek(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * last)
  }

  const onSliderKey = (e: React.KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowRight: 0.1,
      ArrowUp: 0.1,
      ArrowLeft: -0.1,
      ArrowDown: -0.1,
      PageUp: 1,
      PageDown: -1,
    }
    let next: number | null = null
    if (e.key in steps) next = position + (steps[e.key] ?? 0)
    if (e.key === "Home") next = 0
    if (e.key === "End") next = last
    if (next === null) return
    e.preventDefault()
    onScrubStart()
    onSeek(Math.max(0, Math.min(last, Math.round(next * 10) / 10)))
  }

  const rows: { key: string; label: string; style: string; blocks: (string | null)[] }[] = [
    ...Array.from({ length: players }, (_, p) => ({
      key: `p${p}`,
      label: `${p + 1} · ${POSITIONS[p]}`,
      style: TRACK_STYLES[p] ?? BALL_STYLE,
      blocks: play.frames.slice(0, -1).map((f, i) => playerBlock(f, play.frames[i + 1] as Frame, p)),
    })),
    {
      key: "ball",
      label: "Ball",
      style: BALL_STYLE,
      blocks: play.frames.slice(0, -1).map((f, i) => ballBlock(f, play.frames[i + 1] as Frame)),
    },
  ]

  return (
    <section
      aria-label="Timeline"
      className="relative hidden shrink-0 flex-col border-t border-border bg-surface-1 md:flex"
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize timeline"
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
        aria-valuenow={height}
        tabIndex={0}
        className="absolute inset-x-0 -top-1 z-10 h-2 cursor-row-resize touch-none focus-visible:bg-brand-orange/40"
        onPointerDown={(e) => {
          resizing.current = { y: e.clientY, h: height }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!resizing.current) return
          const h = resizing.current.h + (resizing.current.y - e.clientY)
          setHeight(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h)))
        }}
        onPointerUp={() => {
          resizing.current = null
        }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
          e.preventDefault()
          setHeight((h) => Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h + (e.key === "ArrowUp" ? 24 : -24))))
        }}
      />

      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="text-xs font-semibold">Timeline</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count} {count === 1 ? "frame" : "frames"} · {(last * FRAME_SECONDS).toFixed(1)}s at 1x
        </span>
        <div role="group" aria-label="Frames" className="ml-2 flex items-center gap-1 overflow-x-auto">
          {play.frames.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-current={frame === i ? "step" : undefined}
              aria-label={`Frame ${i + 1}`}
              onClick={() => {
                onScrubStart()
                onSeek(i)
              }}
              className={cn(
                "h-6 min-w-6 rounded-xs border px-1.5 text-xs font-medium tabular-nums transition-colors",
                frame === i
                  ? "border-brand-orange bg-selection-tint text-foreground"
                  : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton label="Add frame" size="sm" onClick={onAddFrame}>
            <PlusIcon size={15} aria-hidden />
          </IconButton>
          <IconButton label="Duplicate frame" size="sm" onClick={onDuplicateFrame}>
            <CopyIcon size={15} aria-hidden />
          </IconButton>
          <IconButton label="Delete frame" size="sm" onClick={onDeleteFrame} disabled={count <= 1}>
            <TrashIcon size={15} aria-hidden />
          </IconButton>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="w-[120px] shrink-0 border-r border-border text-xs text-muted-foreground">
          <div className="h-6 border-b border-border" />
          {rows.map((row) => (
            <div
              key={row.key}
              className={cn(
                "flex h-7 items-center px-3 tabular-nums",
                row.key === `p${selected}` && "font-semibold text-foreground",
              )}
            >
              {row.label}
            </div>
          ))}
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Playhead"
          aria-valuemin={1}
          aria-valuemax={count}
          aria-valuenow={Math.round((position + 1) * 10) / 10}
          aria-valuetext={`Frame ${Math.floor(position) + 1} of ${count}, ${formatSeconds(position * FRAME_SECONDS)}`}
          onKeyDown={onSliderKey}
          onPointerDown={(e) => {
            onScrubStart()
            seekFrom(e.clientX)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) seekFrom(e.clientX)
          }}
          className="relative min-w-0 flex-1 cursor-pointer touch-none select-none px-6 outline-none focus-visible:bg-selection-tint"
        >
          <div ref={lane} className="relative h-full">
            {/* Ruler */}
            <div className="relative h-6 border-b border-border">
              {play.frames.map((_, i) => (
                <span
                  key={i}
                  className="absolute top-0 flex h-6 -translate-x-1/2 items-center text-[0.6875rem] whitespace-nowrap text-muted-foreground tabular-nums"
                  style={{ left: `${pct(i)}%` }}
                >
                  <span className="mr-1 h-2 w-px bg-border-strong" aria-hidden />
                  {i + 1} · {(i * FRAME_SECONDS).toFixed(1)}s
                </span>
              ))}
            </div>
            {/* Tracks */}
            {rows.map((row) => (
              <div key={row.key} className="relative h-7 border-b border-border/60">
                {row.blocks.map((block, i) =>
                  block ? (
                    <span
                      key={i}
                      className={cn(
                        "absolute top-1 flex h-5 items-center overflow-hidden rounded-xs border-l-[3px] px-1.5 text-[0.625rem] font-medium whitespace-nowrap text-foreground",
                        row.style,
                        row.key === `p${selected}` && "ring-1 ring-brand-orange",
                      )}
                      style={{ left: `calc(${pct(i)}% + 2px)`, width: `calc(${pct(1)}% - 4px)` }}
                    >
                      {block}
                    </span>
                  ) : null,
                )}
              </div>
            ))}
            {last === 0 && (
              <p className="absolute inset-x-0 top-10 text-center text-xs text-muted-foreground">
                One frame. Draw a cut, dribble or pass, or add a frame, to animate.
              </p>
            )}
            {/* Playhead */}
            <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pct(position)}%` }}>
              <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-playhead" />
              <span className="absolute top-0.5 -translate-x-1/2 rounded-xs bg-playhead px-1 text-[0.625rem] font-semibold text-playhead-foreground tabular-nums">
                {formatSeconds(position * FRAME_SECONDS)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
