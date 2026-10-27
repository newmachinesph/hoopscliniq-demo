"use client"

import { CoinsIcon, ShieldCheckIcon, SparkleIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CLIP_TO_PLAY_CREDITS, gameClock, type Possession, timecode } from "@/data/film"
import { cn } from "@/lib/utils"
import { CourtThumb } from "./court-view"
import { useFilmRoom } from "./film-room-context"

const MAX_CLIP = 15
const MIN_CLIP = 3
const PAD = 2

/** Pick the clip (15 s max), see the cost, then confirm. The run starts only on confirm (P1-18). */
export function MakePlayDialog({
  possession,
  open,
  onOpenChange,
  onStarted,
}: {
  possession: Possession | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStarted: () => void
}) {
  const { film, requestPlay, creditsLeft } = useFilmRoom()
  // The call site keys this by possession, so the trim window starts fresh without a reset effect.
  const [range, setRange] = React.useState<[number, number]>(() =>
    possession ? [Math.max(possession.start, possession.end - MAX_CLIP), possession.end] : [0, 0],
  )

  if (!possession) return null
  const enough = creditsLeft >= CLIP_TO_PLAY_CREDITS
  const { q, clock } = gameClock(possession.gameStart)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Make a play from this clip</DialogTitle>
          <DialogDescription>
            Possession {possession.n} · {possession.set} · Q{q} {clock}. Clip to play (Beta) drafts a play from a short
            clip; you place and fix the players before anything is saved. Not yet tested on real amateur footage.
          </DialogDescription>
        </DialogHeader>

        <TrimWindow possession={possession} range={range} onChange={setRange} />

        <div className="grid gap-2 text-sm">
          <p className="flex items-start gap-2">
            <ShieldCheckIcon size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
            {film.kind === "scout" ? (
              <span>Scout film: players stay Opponent 1–5 and are never identified.</span>
            ) : (
              <span>Everyone on the floor in this clip has video and AI consent.</span>
            )}
          </p>
          <p className="flex items-start gap-2">
            <CoinsIcon size={16} className="mt-0.5 shrink-0 text-foreground-secondary" aria-hidden />
            <span>
              <span className="font-semibold tabular-nums">{CLIP_TO_PLAY_CREDITS} credits</span>, charged once.{" "}
              <span className="tabular-nums">{creditsLeft.toLocaleString()}</span> left this month. Refunded if no draft
              comes back; a low-quality draft isn't refunded.
            </span>
          </p>
          <p className="flex items-start gap-2 text-muted-foreground">
            <SparkleIcon size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
            Phone high in the stands near half court, or a high corner, so all ten players stay in frame. Crowded paint
            lowers the quality score.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!enough}
            onClick={() => {
              requestPlay(possession, range)
              toast("Preview: draft started", {
                description: `${CLIP_TO_PLAY_CREDITS} credits · about 2 minutes for a ${Math.round(range[1] - range[0])} s clip`,
              })
              onOpenChange(false)
              onStarted()
            }}
          >
            Make a play · {CLIP_TO_PLAY_CREDITS} credits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Trim window (DIRECTION): 12x32 handles with a 44px hit area, start green and end red, labeled. Drag or use the
 * arrow keys (0.5 s; Shift for 2 s). The clip can't pass 15 s.
 */
function TrimWindow({
  possession,
  range,
  onChange,
}: {
  possession: Possession
  range: [number, number]
  onChange: (range: [number, number]) => void
}) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const lo = Math.max(0, possession.start - PAD)
  const hi = possession.end + PAD
  const span = hi - lo
  const pct = (s: number) => `${((s - lo) / span) * 100}%`
  const [start, end] = range

  const clampStart = (s: number) => Math.min(Math.max(s, lo, end - MAX_CLIP), end - MIN_CLIP)
  const clampEnd = (e: number) => Math.max(Math.min(e, hi, start + MAX_CLIP), start + MIN_CLIP)
  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return lo
    return lo + Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * span
  }

  const handle = (which: "start" | "end") => {
    const value = which === "start" ? start : end
    const set = (v: number) => onChange(which === "start" ? [clampStart(v), end] : [start, clampEnd(v)])
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={which === "start" ? "Clip start" : "Clip end"}
        aria-valuemin={Math.round(lo)}
        aria-valuemax={Math.round(hi)}
        aria-valuenow={Math.round(value)}
        aria-valuetext={timecode(value)}
        className="group/handle absolute top-0 grid h-full w-11 -translate-x-1/2 cursor-ew-resize touch-none place-items-center focus-visible:outline-none"
        style={{ left: pct(value) }}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) set(timeAt(e.clientX))
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 2 : 0.5
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            set(value - step)
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            set(value + step)
          }
        }}
      >
        <span
          className={cn(
            "block h-8 w-3 rounded-xs ring-2 ring-surface-1 group-focus-visible/handle:ring-ring",
            which === "start" ? "bg-success" : "bg-danger",
          )}
        />
        <span
          className={cn(
            "absolute -bottom-5 text-[0.6875rem] font-semibold whitespace-nowrap",
            which === "start" ? "text-success" : "text-danger",
          )}
        >
          {which === "start" ? "Start" : "End"}
        </span>
      </div>
    )
  }

  const length = end - start
  return (
    <div className="space-y-2">
      <div ref={trackRef} className="relative h-14 select-none">
        <div className="absolute inset-y-2 inset-x-0 flex overflow-hidden rounded-sm bg-brand-navy">
          {[0.05, 0.3, 0.55, 0.8, 1].map((at) => (
            <CourtThumb key={at} dna={possession.dna} at={at} className="h-full flex-1 object-cover opacity-80" />
          ))}
        </div>
        <div className="absolute inset-y-2 left-0 rounded-l-sm bg-background/70" style={{ width: pct(start) }} />
        <div className="absolute inset-y-2 right-0 rounded-r-sm bg-background/70" style={{ left: pct(end) }} />
        <div
          className="absolute inset-y-1.5 rounded-sm border-2 border-foreground"
          style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }}
        />
        {handle("start")}
        {handle("end")}
      </div>
      <p className="flex justify-between pt-3 text-xs text-muted-foreground tabular-nums">
        <span>{timecode(start)}</span>
        <span
          className={cn("font-semibold", length > MAX_CLIP - 0.01 ? "text-foreground" : "text-foreground-secondary")}
        >
          Clip {length.toFixed(1)} s of {MAX_CLIP} s max
        </span>
        <span>{timecode(end)}</span>
      </p>
    </div>
  )
}
