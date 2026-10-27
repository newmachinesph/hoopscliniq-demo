"use client"

import * as React from "react"

import { H } from "./court"

export interface ClipboardPlayProps {
  /** A Play DNA play.json (validated by court.js; unknown keys never reach the drawing). */
  play: unknown
  /** Its labels.json: the verdicts decide which detected actions get drawn. */
  labels?: { verdicts?: unknown[] } | null
  className?: string
  /** Hold on the last frame before looping, in seconds. */
  hold?: number
}

function usePrefersReducedMotion() {
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
 * A hand-drawn play on the film-room clipboard, looping at its own frame rate: wood floor, coaching notation drawn as each
 * action happens, tags naming what's happening now. Reduced motion shows the finished diagram instead.
 */
export function ClipboardPlay({ play, labels, className, hold = 1.5 }: ClipboardPlayProps) {
  const clip = React.useMemo(() => H.parsePlay(play), [play])
  const notes = React.useMemo(() => H.applyVerdicts(clip, { verdicts: labels?.verdicts ?? [] }).notes, [clip, labels])
  const floor = React.useMemo(() => H.floorMarkup({ length: clip.length }), [clip.length])
  const lines = React.useMemo(() => H.linesMarkup(clip.length), [clip.length])
  const reduced = usePrefersReducedMotion()
  const last = clip.frames - 1
  const [src, setSrc] = React.useState(0)

  React.useEffect(() => {
    if (reduced) {
      setSrc(last)
      return
    }
    let raf = 0
    let prev = performance.now()
    const tick = (now: number) => {
      // A hidden tab must not jump the play forward: count at most 100 ms per tick.
      const dt = Math.min(now - prev, 100)
      prev = now
      setSrc((s) => {
        const next = s + (dt / 1000) * clip.fps
        return next > last + hold * clip.fps ? 0 : next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, last, hold, clip.fps])

  const out = H.frame(clip, notes, Math.min(src, last), { notation: true, history: true, highlightBall: true })
  return (
    <svg
      viewBox={out.viewBox}
      className={className}
      role="img"
      aria-label={clip.title}
      // court.js writes numbers and escaped text only, from a play it has validated (same as the reels and the player).
      dangerouslySetInnerHTML={{ __html: floor + out.areas + lines + out.dynamic }}
    />
  )
}
