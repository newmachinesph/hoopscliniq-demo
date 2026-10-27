"use client"

import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, SparkleIcon, XIcon } from "@phosphor-icons/react"
import * as React from "react"

import { PersonAvatar } from "@/components/shell/avatar"
import { isMake, type Possession, timecode } from "@/data/film"
import { confidenceLabel } from "@/lib/confidence"
import { cn } from "@/lib/utils"
import { useClock, useClockPlaying, useClockTime } from "./clock"
import { useFilmRoom } from "./film-room-context"
import { staffLabel } from "./people"
import { hatch } from "./styles"

const LANES = ["Possessions", "Shots", "Turnovers", "Sets", "Comments"] as const
const ZOOMS = [1, 4] as const

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

function tagTitle(p: Possession) {
  if (!p.tag) return "Untagged"
  if (p.tag.status === "proposed")
    return `Suggested · needs review (Beta), ${confidenceLabel(p.tag.confidence * 100).toLowerCase()} confidence (illustrative)`
  return p.tag.by === "coach" ? "Tagged by staff" : "ClinIQ suggestion, confirmed by a coach"
}

/**
 * Event lanes under the scrubber, 28px per type (DIRECTION). Staff tags are solid; the few Beta ClinIQ suggestions are
 * hatched until a coach confirms them.
 * Every possession is a time range; click anything to jump there. Phones scroll the lanes sideways.
 */
export function EventLanes() {
  const { film, possessions, comments } = useFilmRoom()
  const clock = useClock()
  const [zoom, setZoom] = React.useState<(typeof ZOOMS)[number]>(1)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const width = useWidth(innerRef)
  const d = film.duration
  const pct = (s: number) => `${(s / d) * 100}%`
  const px = (s: number) => (s / d) * width
  const proposed = possessions.filter((p) => p.tag?.status === "proposed").length

  const seekFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    clock.seek(((e.clientX - rect.left) / rect.width) * d)
  }

  return (
    <section aria-label="Event lanes" className="rounded-md border border-border bg-surface-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Event lanes</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className={cn("h-3 w-5 rounded-[2px] border border-border-strong", hatch)} />
          <SparkleIcon size={12} weight="fill" aria-hidden /> Suggested · needs review (Beta)
          {proposed > 0 && <span className="tabular-nums">({proposed})</span>}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom(1)}
            aria-pressed={zoom === 1}
            aria-label="Show the whole film"
            title="Whole film"
            className={cn(
              "grid size-11 place-items-center rounded-sm text-foreground-secondary hover:bg-accent sm:size-7",
              zoom === 1 && "bg-surface-2 text-foreground",
            )}
          >
            <MagnifyingGlassMinusIcon size={16} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setZoom(4)}
            aria-pressed={zoom === 4}
            aria-label="Zoom in 4x"
            title="Zoom 4x"
            className={cn(
              "grid size-11 place-items-center rounded-sm text-foreground-secondary hover:bg-accent sm:size-7",
              zoom === 4 && "bg-surface-2 text-foreground",
            )}
          >
            <MagnifyingGlassPlusIcon size={16} aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex">
        <div className="w-24 shrink-0 border-r border-border">
          {LANES.map((lane) => (
            <div
              key={lane}
              className="flex h-7 items-center border-b border-border px-3 text-xs text-muted-foreground last:border-b-0"
            >
              {lane}
            </div>
          ))}
        </div>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer shortcut; the scrubber and Events list are the keyboard path */}
          <div
            ref={innerRef}
            className="relative min-w-[720px] md:min-w-0"
            style={{ width: `${zoom * 100}%` }}
            onClick={seekFromClick}
            role="presentation"
          >
            {/* Possessions */}
            <div className="relative h-7 border-b border-border">
              {possessions.map((p) => (
                <span
                  key={p.id}
                  title={`Possession ${p.n} · ${p.side === "us" ? film.us.short : film.them.short} · ${timecode(p.start)}–${timecode(p.end)} · ${tagTitle(p)}`}
                  className={cn(
                    "absolute top-1.5 bottom-1.5 rounded-[2px]",
                    p.side === "us" ? "bg-foreground/28" : "bg-foreground/10",
                    p.tag?.status === "proposed" && hatch,
                    !p.tag && "bg-transparent outline outline-1 -outline-offset-1 outline-dashed outline-border-strong",
                  )}
                  style={{ left: pct(p.start), width: `max(2px, ${pct(p.end - p.start)})` }}
                />
              ))}
            </div>

            {/* Shots: filled = make, ring = miss; our shots on top, theirs below. */}
            <div className="relative h-7 border-b border-border">
              {possessions
                .filter((p) => p.result !== "TOV" && p.tag)
                .map((p) => (
                  <span
                    key={p.id}
                    title={`${p.actor} · ${p.result} · ${timecode(p.eventAt)}`}
                    className={cn(
                      "absolute size-2 -translate-x-1/2 rounded-full",
                      p.side === "us" ? "top-1.5" : "bottom-1.5",
                      isMake(p.result) ? "bg-foreground" : "border border-foreground/60",
                      p.side === "them" && isMake(p.result) && "bg-foreground/45",
                    )}
                    style={{ left: pct(p.eventAt) }}
                  />
                ))}
            </div>

            {/* Turnovers */}
            <div className="relative h-7 border-b border-border">
              {possessions
                .filter((p) => p.result === "TOV" && p.tag)
                .map((p) => (
                  <span
                    key={p.id}
                    title={`Turnover · ${p.actor} · ${p.note ?? ""} · ${timecode(p.eventAt)}`}
                    className={cn(
                      "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
                      p.side === "us" ? "text-foreground" : "text-muted-foreground",
                    )}
                    style={{ left: pct(p.eventAt) }}
                  >
                    <XIcon size={11} weight="bold" aria-hidden />
                  </span>
                ))}
            </div>

            {/* Sets (the tagged team's offense) */}
            <div className="relative h-7 border-b border-border">
              {possessions
                .filter((p) => p.side === "us" && p.tag && p.set !== "Motion")
                .map((p) => {
                  const w = px(p.end - p.start)
                  const proposedTag = p.tag?.status === "proposed"
                  return (
                    <span
                      key={p.id}
                      title={`${p.set} · ${tagTitle(p)}`}
                      className={cn(
                        "absolute top-1 bottom-1 flex items-center gap-0.5 overflow-hidden rounded-[2px] border-l-[3px] border-foreground/70 bg-foreground/18 px-0.5 text-[0.625rem] leading-none whitespace-nowrap",
                        proposedTag && cn(hatch, "border-dashed border-foreground/50 bg-transparent"),
                      )}
                      style={{ left: pct(p.start), width: `max(3px, ${pct(p.end - p.start)})` }}
                    >
                      {w > 54 && <span className="truncate font-medium">{p.set}</span>}
                      {proposedTag && w > 30 && (
                        <span className="rounded-[2px] bg-surface-1 px-0.5 font-semibold tabular-nums">
                          {confidenceLabel((p.tag?.confidence ?? 0) * 100)[0]}
                        </span>
                      )}
                    </span>
                  )
                })}
            </div>

            {/* Comments */}
            <div className="relative h-7">
              {comments.map((c) => {
                const who = staffLabel(c.authorId)
                return (
                  <span
                    key={c.id}
                    title={`${who.name} · ${timecode(c.at)}: ${c.body}`}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: pct(c.at) }}
                  >
                    <PersonAvatar
                      initials={who.initials}
                      hue={who.hue}
                      size={18}
                      className="text-[8px] ring-2 ring-surface-1"
                    />
                  </span>
                )
              })}
            </div>

            <LanePlayhead scrollRef={scrollRef} duration={d} />
          </div>
        </div>
      </div>
    </section>
  )
}

/** Orange playhead across the lanes; keeps itself in view while playing when zoomed. */
function LanePlayhead({
  scrollRef,
  duration,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>
  duration: number
}) {
  const t = useClockTime()
  const playing = useClockPlaying()
  const ratio = t / duration

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    const x = ratio * el.scrollWidth
    if (x < el.scrollLeft + 24 || x > el.scrollLeft + el.clientWidth - 24) {
      el.scrollTo({ left: Math.max(0, x - el.clientWidth / 3), behavior: playing ? "auto" : "smooth" })
    }
  }, [ratio, playing, scrollRef])

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-playhead"
      style={{ left: `${ratio * 100}%` }}
    >
      <span className="absolute -top-px left-1/2 size-2 -translate-x-1/2 rotate-45 bg-playhead" />
    </div>
  )
}
