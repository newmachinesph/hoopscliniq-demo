"use client"

import { PauseIcon, PlayIcon, RepeatIcon, SkipBackIcon, SkipForwardIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

export const SPEEDS = [0.5, 1, 2] as const
export type Speed = (typeof SPEEDS)[number]

/** Playback transport, bottom-center of the canvas: frame step, play/pause, speed chip, loop. */
export function Transport({
  playing,
  canPlay,
  atStart,
  atEnd,
  speed,
  loop,
  onToggle,
  onPrev,
  onNext,
  onSpeed,
  onLoop,
  className,
}: {
  playing: boolean
  canPlay: boolean
  atStart: boolean
  atEnd: boolean
  speed: Speed
  loop: boolean
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onSpeed: (speed: Speed) => void
  onLoop: () => void
  className?: string
}) {
  const btn =
    "grid size-11 place-items-center rounded-sm text-foreground-secondary transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 md:size-8"
  return (
    <div
      role="group"
      aria-label="Playback"
      className={cn("flex items-center gap-0.5 rounded-lg border border-border bg-surface-1 p-1 shadow-2", className)}
    >
      <button
        type="button"
        className={btn}
        onClick={onPrev}
        disabled={atStart}
        aria-label="Previous frame"
        title="Previous frame · ←"
      >
        <SkipBackIcon size={16} weight="fill" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onToggle}
        disabled={!canPlay}
        aria-label={playing ? "Pause" : "Play"}
        title={`${playing ? "Pause" : "Play"} · Space`}
        className="grid size-11 place-items-center rounded-sm bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40 md:size-9"
      >
        {playing ? <PauseIcon size={16} weight="fill" aria-hidden /> : <PlayIcon size={16} weight="fill" aria-hidden />}
      </button>
      <button
        type="button"
        className={btn}
        onClick={onNext}
        disabled={atEnd}
        aria-label="Next frame"
        title="Next frame · →"
      >
        <SkipForwardIcon size={16} weight="fill" aria-hidden />
      </button>
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
      <div role="radiogroup" aria-label="Speed" className="hidden items-center sm:flex">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={speed === s}
            onClick={() => onSpeed(s)}
            className={cn(
              "h-7 rounded-xs px-2 text-xs tabular-nums transition-colors",
              speed === s
                ? "bg-surface-2 font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}x
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onLoop}
        aria-pressed={loop}
        aria-label="Loop"
        title="Loop"
        className={cn(btn, loop && "bg-surface-2 text-foreground")}
      >
        <RepeatIcon size={16} weight={loop ? "bold" : "regular"} aria-hidden />
      </button>
    </div>
  )
}
