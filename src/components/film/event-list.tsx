// Client-only (imported from the client JobView). Passes and shots the backend found by rules on the ball track.
import { ArrowRightIcon } from "@phosphor-icons/react"

import { Chip } from "@/components/ui/chip"
import type { FilmEvent } from "@/lib/film-job"
import { cn } from "@/lib/utils"

const CONFIDENCE: Record<string, string> = { low: "Low", medium: "Medium", high: "High" }

/** Video time of a frame as m:ss.s. */
export function stamp(frame: number, fps: number): string {
  const t = Math.max(frame, 0) / (fps > 0 ? fps : 12)
  const m = Math.floor(t / 60)
  const s = (t - m * 60).toFixed(1).padStart(4, "0")
  return `${m}:${s}`
}

const shown = (e: FilmEvent) =>
  Number.isFinite(e.frame) && ((e.type === "pass" && e.from && e.to) || (e.type === "shot" && e.from))

function EventLabel({ event }: { event: FilmEvent }) {
  if (event.type === "pass")
    return (
      <span className="inline-flex items-center gap-1">
        Pass {event.from} <ArrowRightIcon size={12} weight="bold" aria-label="to" /> {event.to}
      </span>
    )
  const result = event.made === true ? " · made" : event.made === false ? " · missed" : ""
  return (
    <span>
      Shot by {event.from}
      {result}
    </span>
  )
}

/**
 * The events under the video, in time order. Each one seeks the video to its frame; the one playing is marked.
 * Every event is a heuristic guess, so the source line says so.
 */
export function EventList({
  events,
  fps,
  frame,
  onSeek,
  disabled = false,
}: {
  events: FilmEvent[]
  fps: number
  frame: number
  onSeek: (frame: number) => void
  disabled?: boolean
}) {
  const list = events.filter(shown).sort((a, b) => a.frame - b.frame)
  return (
    <section aria-labelledby="events-title" className="rounded-md border border-border bg-surface-1">
      <header className="border-b border-border px-4 py-2.5">
        <h2 id="events-title" className="text-sm font-semibold">
          Passes and shots
        </h2>
        <p className="text-xs text-muted-foreground text-pretty">
          Found by rules on the SAM 3.1 ball track, not measured. Check each one on the video.
        </p>
      </header>
      {list.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">No passes or shots detected in this clip.</p>
      ) : (
        <ol className="divide-y divide-border">
          {list.map((e, i) => {
            const end = Number.isFinite(e.end) ? (e.end as number) : e.frame
            const current = frame >= e.frame && frame <= end
            const confidence = e.confidence ? CONFIDENCE[e.confidence] : undefined
            return (
              <li key={`${e.type}-${e.frame}-${i}`}>
                <button
                  type="button"
                  disabled={disabled}
                  aria-current={current ? "true" : undefined}
                  onClick={() => onSeek(e.frame)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left text-sm outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 sm:min-h-9",
                    current && "bg-surface-2",
                  )}
                >
                  <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {stamp(e.frame, fps)}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">
                    <EventLabel event={e} />
                  </span>
                  {confidence && <Chip tone="outline">{confidence} confidence</Chip>}
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
