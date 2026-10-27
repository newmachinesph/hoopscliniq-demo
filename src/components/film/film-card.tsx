"use client"

import { BinocularsIcon, CheckCircleIcon, PencilSimpleIcon, SparkleIcon } from "@phosphor-icons/react"
import Link from "next/link"

import { Chip } from "@/components/ui/chip"
import { formatDate, relative } from "@/data/clock"
import { type Film, filmSummary, timecode } from "@/data/film"
import { staffById } from "@/data/org"
import { CourtThumb } from "./court-view"

/** Library card: a court-style still with the broadcast bug, then title, result and tagging state. */
export function FilmCard({ film }: { film: Film }) {
  const s = filmSummary(film)
  const uploader = staffById(film.uploadedBy)
  const thumbDna = film.drafts[0]?.dna ?? film.possessions[0]?.dna ?? "spain-pnr"
  const won = film.final.us > film.final.them

  return (
    <Link
      href={`/film/${film.id}`}
      className="group block overflow-hidden rounded-md border border-border bg-surface-1 shadow-1 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-video overflow-hidden bg-brand-navy">
        <CourtThumb
          dna={thumbDna}
          className="absolute inset-0 m-auto h-[92%] w-auto opacity-90 transition-transform duration-300 [transform:perspective(900px)_rotateX(14deg)] group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span className="absolute bottom-2 left-2 flex overflow-hidden rounded-xs text-[0.6875rem] font-semibold tabular-nums">
          <span className="bg-white px-1.5 py-0.5 text-brand-navy">
            {film.us.short} {film.final.us}
          </span>
          <span className="bg-brand-navy/90 px-1.5 py-0.5 text-white ring-1 ring-white/20 ring-inset">
            {film.them.short} {film.final.them}
          </span>
          <span className="bg-black/70 px-1.5 py-0.5 text-white">Final</span>
        </span>
        <span className="absolute right-2 bottom-2 rounded-xs bg-black/70 px-1.5 py-0.5 font-mono text-[0.6875rem] text-white tabular-nums">
          {timecode(film.duration)}
        </span>
        {film.kind === "scout" && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-xs bg-black/60 px-1.5 py-0.5 text-[0.6875rem] text-white">
            <BinocularsIcon size={11} aria-hidden /> Scout
          </span>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <p className="text-xs text-muted-foreground">
          {film.kind === "game" ? "Game film" : "Scout film"} ·{" "}
          {formatDate(film.date, { weekday: "short", month: "short", day: "numeric" })}
        </p>
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate font-semibold">
            {film.kind === "game" ? `Lakeshore ${film.title}` : film.title}
          </h3>
          {film.kind === "game" && (
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {won ? "W" : "L"} {film.final.us}–{film.final.them}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {s.total} possessions · {s.taggedPct}% tagged · {film.drafts.length}{" "}
          {film.drafts.length === 1 ? "play" : "plays"}
        </p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <StatusChip film={film} proposed={s.proposed} />
          <span className="truncate text-xs text-muted-foreground">
            {uploader?.name.split(" ")[0]} · {relative(film.uploadedAt)}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function StatusChip({ film, proposed }: { film: Film; proposed: number }) {
  if (film.status === "tagging") {
    return (
      <Chip tone="info">
        <PencilSimpleIcon size={11} weight="bold" aria-hidden /> Staff tagging
      </Chip>
    )
  }
  if (film.status === "needs_review") {
    return (
      <Chip tone="warning">
        <SparkleIcon size={11} weight="fill" aria-hidden /> {proposed} suggested · needs review
      </Chip>
    )
  }
  return (
    <Chip tone="success">
      <CheckCircleIcon size={11} weight="bold" aria-hidden /> Tagged by staff
    </Chip>
  )
}
