import { ArrowRightIcon, FilmStripIcon } from "@phosphor-icons/react"
import Link from "next/link"

import { Chip } from "@/components/ui/chip"
import { formatDate } from "@/data/clock"
import type { PlaybookPlay, PlayClip } from "@/data/plays"
import { clipHref, filmDate, filmName } from "./analysis"

const RESULT: Record<PlayClip["result"], { label: string; tone: "success" | "neutral" | "danger" | "info" }> = {
  score: { label: "Score", tone: "success" },
  foul: { label: "Foul drawn", tone: "info" },
  miss: { label: "Miss", tone: "neutral" },
  turnover: { label: "Turnover", tone: "danger" },
}

/** Film tab: this play's tagged clips, each opening the film at its timestamp. */
export function FilmTab({ play }: { play: PlaybookPlay }) {
  const { stats } = play
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: "Runs", value: stats.timesRun ? String(stats.timesRun) : "–" },
          { label: "PPP", value: stats.timesRun ? stats.ppp.toFixed(2) : "–" },
          { label: "Success", value: stats.timesRun ? `${stats.successRate}%` : "–" },
        ].map((s) => (
          <div key={s.label} className="rounded-sm bg-surface-2 px-2 py-1.5">
            <dt className="text-[0.6875rem] text-muted-foreground">{s.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {play.lastRun && (
        <p className="text-xs text-muted-foreground">
          Last run{" "}
          <Link href={`/film/${play.lastRun.filmId}`} className="font-medium text-foreground hover:underline">
            {play.lastRun.label}
          </Link>
          , <span className="tabular-nums">{formatDate(play.lastRun.date)}</span>
        </p>
      )}

      {play.clips.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong p-4 text-center">
          <FilmStripIcon size={28} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm font-medium">No clips yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tag this play in a game and its clips show up here, linked to the second.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {play.clips.map((clip) => {
            const result = RESULT[clip.result]
            const date = filmDate(clip.filmId)
            return (
              <li key={`${clip.filmId}-${clip.t}`}>
                <Link
                  href={clipHref(clip)}
                  className="group flex items-start gap-2.5 rounded-sm border border-border p-2 transition-colors hover:border-border-strong"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xs bg-surface-2 text-foreground-secondary">
                    <FilmStripIcon size={16} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{filmName(clip.filmId)}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{clip.clock}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-foreground-secondary">{clip.label}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <Chip tone={result.tone}>{result.label}</Chip>
                      {date && (
                        <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{formatDate(date)}</span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Link
        href="/film"
        className="inline-flex items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
      >
        Tag more film <ArrowRightIcon size={12} aria-hidden />
      </Link>
    </div>
  )
}
