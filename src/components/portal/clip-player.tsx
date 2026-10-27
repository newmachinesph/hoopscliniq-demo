"use client"

import { ArrowCounterClockwiseIcon, PauseIcon, PlayIcon } from "@phosphor-icons/react"
import * as React from "react"

import { parsedPlay, TrackedCourt } from "@/components/film/court-view"
import { Button } from "@/components/ui/button"
import type { DnaId } from "@/data/film"

/** A small read-only clip view for players: the tracked court for one possession, play / pause / replay. No autoplay. */
export function ClipPlayer({ dna, label, clock }: { dna: DnaId; label: string; clock: string }) {
  const { clip } = parsedPlay(dna)
  const last = clip.frames - 1
  const [src, setSrc] = React.useState(0)
  const [playing, setPlaying] = React.useState(false)
  // Mirrors `src` so the rAF tick can decide the end outside the state updater.
  const srcRef = React.useRef(0)
  const commit = React.useCallback((next: number) => {
    srcRef.current = next
    setSrc(next)
  }, [])

  React.useEffect(() => {
    if (!playing) return
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const dt = (now - prev) / 1000
      prev = now
      const next = srcRef.current + dt * clip.fps
      if (next >= last) {
        commit(last)
        setPlaying(false)
        return
      }
      commit(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, clip.fps, last, commit])

  const ended = src >= last
  const toggle = () => {
    if (ended) commit(0)
    setPlaying((p) => !p || ended)
  }
  const pct = Math.round((src / last) * 100)

  return (
    <figure className="overflow-hidden rounded-md border border-border bg-brand-navy">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause clip" : ended ? "Replay clip" : "Play clip"}
        className="relative block aspect-video w-full focus-visible:outline-offset-[-3px]"
      >
        <span className="absolute inset-0 flex items-center justify-center">
          <TrackedCourt dna={dna} src={src} label={`Court view: ${label}`} className="h-[92%] w-auto drop-shadow-xl" />
        </span>
        <span className="absolute top-2 left-2 rounded-xs bg-black/55 px-1.5 py-0.5 text-xs font-semibold text-white tabular-nums">
          {clock}
        </span>
        {!playing && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              {ended ? (
                <ArrowCounterClockwiseIcon size={26} aria-hidden />
              ) : (
                <PlayIcon size={26} weight="fill" aria-hidden />
              )}
            </span>
          </span>
        )}
      </button>
      <figcaption className="flex items-center gap-3 bg-surface-1 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-11"
          onClick={toggle}
          aria-label={playing ? "Pause clip" : ended ? "Replay clip" : "Play clip"}
        >
          {playing ? (
            <PauseIcon size={20} weight="fill" aria-hidden />
          ) : (
            <PlayIcon size={20} weight="fill" aria-hidden />
          )}
        </Button>
        <div
          role="progressbar"
          aria-label="Clip progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-brand-orange" style={{ width: `${pct}%` }} />
        </div>
      </figcaption>
    </figure>
  )
}
