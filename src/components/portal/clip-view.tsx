import { notFound } from "next/navigation"

import { ClipPlayer } from "@/components/portal/clip-player"
import { BackLink, Panel } from "@/components/portal/parts"
import { Chip } from "@/components/ui/chip"
import { formatDate } from "@/data/clock"
import { getFilm } from "@/data/film"
import { plays } from "@/data/plays"
import { assignments, playCoachNotes } from "@/data/portal"

const RESULT = {
  score: { label: "Score", tone: "success" },
  miss: { label: "Miss", tone: "neutral" },
  turnover: { label: "Turnover", tone: "neutral" },
  foul: { label: "Foul", tone: "neutral" },
} as const

/**
 * Player clip view: players watch the clips of their assigned plays here, never in the staff film room.
 * Shared by the player app (/player/clips) and the demo study screen (/study/clips); `playHref` builds the back link.
 */
export function ClipView({
  filmId,
  t,
  playParam,
  playHref,
}: {
  filmId: string
  t: number
  playParam?: string
  playHref: (playId: string) => string
}) {
  const film = getFilm(filmId)
  // Only clips of plays assigned to this player are reachable.
  const play = plays.find(
    (p) =>
      (!playParam || p.id === playParam) &&
      assignments.some((a) => a.playId === p.id) &&
      p.clips.some((c) => c.filmId === filmId && c.t === t),
  )
  const clip = play?.clips.find((c) => c.filmId === filmId && c.t === t)
  if (!film || !play || !clip) notFound()

  const possession =
    film.possessions.find((p) => t >= p.start && t < p.end) ??
    film.possessions.reduce((best, p) => (Math.abs(p.start - t) < Math.abs(best.start - t) ? p : best))
  const result = RESULT[clip.result]

  return (
    <>
      <BackLink href={playHref(play.id)}>{play.title}</BackLink>
      <div className="mb-3">
        <h1 className="text-2xl font-semibold tracking-tight">{clip.label}</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {film.title} · {formatDate(film.date, { month: "short", day: "numeric" })} · {clip.clock}
        </p>
      </div>
      <ClipPlayer dna={possession?.dna ?? "spain-pnr"} label={clip.label} clock={clip.clock} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip tone={result.tone} size="md">
          {result.label}
        </Chip>
        <Chip tone="outline" size="md">
          {play.title}
        </Chip>
      </div>
      {playCoachNotes[play.id] && (
        <Panel className="mt-4 p-3">
          <p className="text-xs font-semibold text-foreground-secondary">Coach Reyes</p>
          <p className="mt-1 text-sm">{playCoachNotes[play.id]}</p>
        </Panel>
      )}
    </>
  )
}
