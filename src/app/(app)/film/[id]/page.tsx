import { ArrowLeftIcon, CheckCircleIcon, PencilSimpleIcon, SparkleIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { FilmActions } from "@/components/film/film-actions"
import { FilmRoom } from "@/components/film/film-room"
import { PipelineStrip } from "@/components/hackathon/pipeline-strip"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { Chip } from "@/components/ui/chip"
import { formatDate, relative } from "@/data/clock"
import { type Film, filmSummary, films, getFilm } from "@/data/film"
import { staffById } from "@/data/org"

export function generateStaticParams() {
  return films.map((f) => ({ id: f.id }))
}

export async function generateMetadata({ params }: PageProps<"/film/[id]">): Promise<Metadata> {
  const { id } = await params
  const film = getFilm(id)
  return { title: film ? `${filmTitle(film)} · Film` : "Film" }
}

function filmTitle(film: Film) {
  return film.kind === "game" ? `Lakeshore ${film.title}` : film.title
}

function askPrompt(film: Film) {
  if (film.id === "cedar-park") return "Why did we turn it over so much against Cedar Park?"
  if (film.kind === "scout") return "How do we attack the Westview 2-3 zone?"
  return `What worked on offense ${film.title}?`
}

export default async function FilmPage({ params, searchParams }: PageProps<"/film/[id]">) {
  const { id } = await params
  // ?t= (seconds into the video) opens the film at a cited clip, e.g. from a ClinIQ answer.
  const { t } = await searchParams
  const startAt = typeof t === "string" && /^\d{1,6}$/.test(t) ? Number(t) : undefined
  const film = getFilm(id)
  if (!film) notFound()

  const summary = filmSummary(film)
  const uploader = staffById(film.uploadedBy)
  const won = film.final.us > film.final.them
  const score =
    film.kind === "game"
      ? `${won ? "W" : "L"} ${film.final.us}–${film.final.them}`
      : `${film.us.short} ${film.final.us}–${film.final.them} ${film.them.short}`

  return (
    <PageBody wide>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-x-1.5">
            <Link href="/film" className="inline-flex min-h-11 items-center gap-1 hover:text-foreground md:min-h-7">
              <ArrowLeftIcon size={14} aria-hidden /> Film
            </Link>
            <span aria-hidden>·</span>
            {film.kind === "game" ? "Game film" : "Scout film"}
            <span aria-hidden>·</span>
            {formatDate(film.date, { weekday: "short", month: "short", day: "numeric" })}
            <span aria-hidden>·</span>
            {film.venue}
          </span>
        }
        title={filmTitle(film)}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold tabular-nums text-foreground">{score}</span>
            <span className="tabular-nums">{summary.total} possessions</span>
            <span className="tabular-nums">{summary.taggedPct}% tagged</span>
            {film.status === "processed" && (
              <Chip tone="success">
                <CheckCircleIcon size={11} weight="bold" aria-hidden /> Tagged by staff
              </Chip>
            )}
            {film.status === "needs_review" && (
              <Chip tone="warning">
                <SparkleIcon size={11} weight="fill" aria-hidden /> {summary.proposed} suggested · needs review
              </Chip>
            )}
            {film.status === "tagging" && (
              <Chip tone="info">
                <PencilSimpleIcon size={11} weight="bold" aria-hidden /> Staff tagging
              </Chip>
            )}
            <span className="text-muted-foreground">
              Uploaded by {uploader?.name ?? "staff"} {relative(film.uploadedAt)}
            </span>
          </span>
        }
        actions={<FilmActions prompt={askPrompt(film)} />}
      />
      <PipelineStrip compact />
      <FilmRoom filmId={film.id} startAt={startAt} />
    </PageBody>
  )
}
