"use client"

import * as React from "react"
import type { DnaId, Possession } from "@/data/film"
import { dnaPlays } from "@/lib/play-dna"
import { type Clip, H, type Note } from "@/lib/play-engine/court"
import { cn } from "@/lib/utils"

// The tracked "broadcast" court: a Play DNA play drawn at a frame the film clock chooses, instead of ClipboardPlay's
// own loop. Parsed plays are cached per id; the floor markup is static, only the players and notation change.

export interface Parsed {
  clip: Clip
  notes: Note[]
  floor: string
  lines: string
}

const cache = new Map<DnaId, Parsed>()

export function parsedPlay(id: DnaId): Parsed {
  const hit = cache.get(id)
  if (hit) return hit
  const dna = dnaPlays.find((d) => d.id === id) ?? (dnaPlays[0] as (typeof dnaPlays)[number])
  const clip = H.parsePlay(dna.play)
  const parsed: Parsed = {
    clip,
    notes: H.applyVerdicts(clip, { verdicts: dna.labels.verdicts ?? [] }).notes,
    floor: H.floorMarkup({ length: clip.length }),
    lines: H.linesMarkup(clip.length),
  }
  cache.set(id, parsed)
  return parsed
}

/**
 * Where the play is inside a possession at video second t. Ball-up time holds the set; the action runs over the
 * last few seconds (slowed up to 2x on long possessions, so scrubbing reads like film).
 */
export function playFrameAt(p: Possession, t: number) {
  const { clip } = parsedPlay(p.dna)
  const last = clip.frames - 1
  const playSecs = clip.frames / clip.fps
  const dur = p.end - p.start
  const runSecs = Math.min(Math.max(dur - 0.4, 0.5), playSecs * 2)
  const runStart = p.end - runSecs - 0.2
  const src = Math.min(Math.max(((t - runStart) / runSecs) * last, 0), last)
  return { src, settingUp: t < runStart }
}

export function TrackedCourt({
  dna,
  src,
  label,
  className,
}: {
  dna: DnaId
  src: number
  label: string
  className?: string
}) {
  return <DnaCourt parsed={parsedPlay(dna)} src={src} label={label} className={className} />
}

/** Parse any play-dna document (a pipeline job's play.json) for DnaCourt; null when court.js rejects it. */
export function parseDna(play: unknown): Parsed | null {
  try {
    const clip = H.parsePlay(play)
    return {
      clip,
      notes: H.applyVerdicts(clip, { verdicts: [] }).notes,
      floor: H.floorMarkup({ length: clip.length }),
      lines: H.linesMarkup(clip.length),
    }
  } catch {
    return null
  }
}

/** TrackedCourt for a parsed job play: the same court drawn at source frame `src`, which the caller's clock sets. */
export function DnaCourt({
  parsed,
  src,
  label,
  className,
}: {
  parsed: Parsed
  src: number
  label: string
  className?: string
}) {
  const { clip, notes, floor, lines } = parsed
  const out = H.frame(clip, notes, Math.min(Math.max(src, 0), clip.frames - 1), {
    notation: true,
    history: true,
    highlightBall: true,
  })
  return (
    <svg viewBox={out.viewBox} className={cn("block", className)} role="img" aria-label={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: court.js output from a validated play, as in ClipboardPlay */}
      <g dangerouslySetInnerHTML={{ __html: floor }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: court.js output from a validated play, as in ClipboardPlay */}
      <g dangerouslySetInnerHTML={{ __html: out.areas + lines + out.dynamic }} />
    </svg>
  )
}

/** A still from a hand-drawn play for cards: no notation, players mid-action. */
export function CourtThumb({ dna, at = 0.55, className }: { dna: DnaId; at?: number; className?: string }) {
  const { clip, notes, floor, lines } = parsedPlay(dna)
  const markup = React.useMemo(() => {
    const out = H.frame(clip, notes, Math.round((clip.frames - 1) * at), { notation: false, history: false })
    return { viewBox: out.viewBox, body: out.areas + lines + out.dynamic }
  }, [clip, notes, lines, at])
  return (
    <svg viewBox={markup.viewBox} className={cn("block", className)} aria-hidden>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: court.js output from a validated play, as in ClipboardPlay */}
      <g dangerouslySetInnerHTML={{ __html: floor }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: court.js output from a validated play, as in ClipboardPlay */}
      <g dangerouslySetInnerHTML={{ __html: markup.body }} />
    </svg>
  )
}
