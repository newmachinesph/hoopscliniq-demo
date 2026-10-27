import { ArrowRightIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"

import { Chip } from "@/components/ui/chip"
import { getPlay } from "@/data/plays"
import { dnaPlays } from "@/lib/play-dna"
import { ClipboardPlay } from "@/lib/play-engine/clipboard-play"

const FEATURED = ["spain-pnr", "hammer"]

/** Hand-drawn plays (play-dna: authored, no source clip), drawn by the same renderer as the reels. */
export function FeaturedStrip() {
  const featured = dnaPlays.filter((d) => FEATURED.includes(d.id))
  return (
    <section aria-labelledby="featured-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="featured-title" className="text-lg font-semibold">
          Featured: hand-drawn plays
        </h2>
        <span className="text-sm text-muted-foreground">Drawn by coaches, step by step on the clipboard.</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {featured.map((d) => {
          const linked = getPlay(d.id)
          return (
            <article
              key={d.id}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface-1 sm:max-md:flex-row xl:flex-row"
            >
              <div className="shrink-0 bg-court-wrapper p-2 sm:max-md:w-56 xl:w-56">
                <ClipboardPlay play={d.play} labels={d.labels} className="block h-auto w-full rounded-sm" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3">
                <div className="min-w-0">
                  <Chip tone="outline">
                    <PencilSimpleIcon size={11} aria-hidden /> Hand-drawn play
                  </Chip>
                  <h3 className="mt-1.5 font-semibold">{d.title}</h3>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {d.play.moments.length} tagged moments
                    {linked ? ` · ${linked.stats.ppp.toFixed(2)} PPP on ${linked.stats.timesRun} runs` : ""}
                  </p>
                  {linked && <p className="mt-2 text-sm text-foreground-secondary">{linked.summary}</p>}
                </div>
                {linked && (
                  <Link
                    href={`/plays/${linked.id}`}
                    className="inline-flex h-11 w-fit shrink-0 items-center gap-1 rounded-sm px-2 text-sm font-medium text-foreground-secondary hover:bg-accent hover:text-foreground sm:h-8"
                  >
                    Open play <ArrowRightIcon size={14} aria-hidden />
                  </Link>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
