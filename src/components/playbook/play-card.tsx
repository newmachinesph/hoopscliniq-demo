"use client"

import Link from "next/link"

import { Chip } from "@/components/ui/chip"
import { formatDate } from "@/data/clock"
import { staffById } from "@/data/org"
import { type PlaybookPlay, studiedLabel } from "@/data/plays"
import { CourtPlay, usePlayback } from "@/lib/play-engine/court-play"
import { cn } from "@/lib/utils"

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Thumbnail that plays on hover or focus and rests on frame 1 otherwise (no autoplay previews). */
function useHoverPlayback(play: PlaybookPlay) {
  const playback = usePlayback(play, { loop: true })
  const start = () => {
    if (!prefersReducedMotion() && play.frames.length > 1) playback.play()
  }
  const stop = () => {
    playback.pause()
    playback.seek(0)
  }
  return { playback, start, stop }
}

function Stats({ play, className }: { play: PlaybookPlay; className?: string }) {
  const run = play.stats.timesRun > 0
  return (
    <dl className={cn("grid grid-cols-3 gap-2 text-xs", className)}>
      <div>
        <dt className="text-muted-foreground">PPP</dt>
        <dd className="font-semibold text-foreground tabular-nums">{run ? play.stats.ppp.toFixed(2) : "–"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Run</dt>
        <dd className="font-semibold text-foreground tabular-nums">{run ? `${play.stats.timesRun}×` : "Not yet"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Studied</dt>
        <dd className="font-semibold text-foreground tabular-nums">
          {play.assignedTo > 0 ? studiedLabel(play) : "Draft"}
        </dd>
      </div>
    </dl>
  )
}

/** Play card: animated thumbnail first, then title, tags, film stats and "edited 2h ago" (DIRECTION "Play card"). */
export function PlayCard({ play }: { play: PlaybookPlay }) {
  const { playback, start, stop } = useHoverPlayback(play)
  const author = staffById(play.authorId)
  return (
    <Link
      href={`/plays/${play.id}`}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-surface-1 transition-colors hover:border-border-strong"
    >
      <div className="relative bg-court-wrapper p-2">
        <CourtPlay
          play={play}
          frame={playback.frame}
          t={playback.t}
          mode={playback.playing ? "live" : undefined}
          title={`${play.title} diagram`}
          className="block h-auto w-full rounded-sm"
        />
        <span className="absolute right-3 bottom-3 rounded-xs bg-surface-1/90 px-1.5 py-0.5 text-[0.6875rem] text-foreground-secondary tabular-nums">
          {play.frames.length} frames
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{play.title}</h3>
          {play.assignedTo === 0 && <Chip tone="outline">Draft</Chip>}
        </div>
        <div className="flex flex-wrap gap-1">
          <Chip>{play.category}</Chip>
          {play.tags.slice(0, 3).map((t) => (
            <Chip key={t} tone="outline">
              {t}
            </Chip>
          ))}
        </div>
        <Stats play={play} className="mt-auto border-t border-border pt-2" />
        <p className="text-[0.6875rem] text-muted-foreground">
          Edited {play.edited}
          {author ? ` by ${author.name}` : ""}
        </p>
      </div>
    </Link>
  )
}

/** Dense row for the list view; stacks on phone. */
export function PlayRow({ play }: { play: PlaybookPlay }) {
  const { playback, start, stop } = useHoverPlayback(play)
  return (
    <Link
      href={`/plays/${play.id}`}
      onPointerEnter={start}
      onPointerLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="flex items-center gap-3 rounded-md border border-border bg-surface-1 p-2 transition-colors hover:border-border-strong"
    >
      <CourtPlay
        play={play}
        frame={playback.frame}
        t={playback.t}
        mode={playback.playing ? "live" : undefined}
        tags={false}
        title={`${play.title} diagram`}
        className="block h-auto w-20 shrink-0 rounded-xs sm:w-24"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold">{play.title}</h3>
          {play.assignedTo === 0 && <Chip tone="outline">Draft</Chip>}
        </div>
        <p className="mt-0.5 line-clamp-1 text-sm text-foreground-secondary">{play.summary}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Chip>{play.category}</Chip>
          {play.tags.slice(0, 2).map((t) => (
            <Chip key={t} tone="outline" className="max-sm:hidden">
              {t}
            </Chip>
          ))}
          <span className="text-[0.6875rem] text-muted-foreground tabular-nums md:hidden">
            {play.stats.timesRun > 0 ? `${play.stats.ppp.toFixed(2)} PPP · ` : ""}
            {play.assignedTo > 0 ? `${studiedLabel(play)} studied` : "Draft"}
          </span>
          <span className="text-[0.6875rem] text-muted-foreground max-md:hidden">
            {play.lastRun
              ? `Last run ${play.lastRun.label}, ${formatDate(play.lastRun.date)}`
              : `Edited ${play.edited}`}
          </span>
        </div>
      </div>
      <Stats play={play} className="hidden w-56 shrink-0 md:grid" />
    </Link>
  )
}
