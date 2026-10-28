"use client"

import {
  CheckCircleIcon,
  ClockIcon,
  DeviceMobileCameraIcon,
  FilmStripIcon,
  HourglassIcon,
  ListChecksIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"
import { PipelineStrip } from "@/components/hackathon/pipeline-strip"
import { PageHeader } from "@/components/shell/page-header"
import { Button, buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Segmented } from "@/components/ui/segmented"
import { type FilmKind, filmSummary, films, type UploadRow, uploadQueue } from "@/data/film"
import { org } from "@/data/org"
import { cn } from "@/lib/utils"
import { FilmCard } from "./film-card"
import { RecentAnalyses } from "./recent-analyses"
import { type NewUpload, UploadDialog } from "./upload-dialog"

type Filter = "all" | FilmKind

/** The film library: upload queue, storage, then every film as a card, filtered by type and searchable. */
export function FilmLibrary({ openUpload = false }: { openUpload?: boolean }) {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [query, setQuery] = React.useState("")
  const [uploadOpen, setUploadOpen] = React.useState(openUpload)
  const [rows, setRows] = React.useState<(UploadRow & { note?: string })[]>(uploadQueue)

  // The command palette links to /film?upload=1 while this page may already be open. Adjust during render, not in an
  // effect: reopen whenever the flag turns on.
  const [seenOpenUpload, setSeenOpenUpload] = React.useState(openUpload)
  if (openUpload !== seenOpenUpload) {
    setSeenOpenUpload(openUpload)
    if (openUpload) setUploadOpen(true)
  }

  // Simulated tus upload: the uploading row creeps forward; when it finishes, the video is prepared for tagging and the
  // next queued (not held) row begins.
  React.useEffect(() => {
    const id = setInterval(() => {
      const bump = 1 + Math.round(Math.random() * 2)
      setRows((list) => {
        const next = list.map((r) => {
          if (r.state === "uploading") {
            const progress = Math.min(100, r.progress + bump)
            return progress >= 100 ? { ...r, state: "preparing" as const, progress: 100 } : { ...r, progress }
          }
          return r
        })
        if (next.some((r) => r.state === "uploading")) return next
        const first = next.findIndex((r) => r.state === "queued" && !r.note)
        return next.map((r, i) => (i === first ? { ...r, state: "uploading" as const, progress: 0 } : r))
      })
    }, 1200)
    return () => clearInterval(id)
  }, [])

  const q = query.trim().toLowerCase()
  const shown = films.filter(
    (f) =>
      (filter === "all" || f.kind === filter) &&
      (!q || `${f.title} ${f.them.name} ${f.us.name} ${f.venue}`.toLowerCase().includes(q)),
  )
  const counts = { all: films.length, game: 0, scout: 0, practice: 0 }
  for (const f of films) counts[f.kind] += 1
  const toReview = films.reduce((n, f) => n + filmSummary(f).proposed, 0)
  const drafts = films.reduce((n, f) => n + f.drafts.filter((d) => d.status === "draft").length, 0)

  const addUpload = (u: NewUpload) => {
    setRows((list) => [
      ...list,
      {
        id: `u-${list.length + 1}-${u.name}`,
        name: u.name,
        sizeMb: u.sizeMb,
        kind: u.kind,
        state: "queued",
        progress: 0,
        note: u.held ? "Held until consent" : undefined,
      },
    ])
    // Only a held upload lands here: everything else goes to the pipeline and its job page.
    toast("Preview: upload held, not stored", {
      description: "It starts when the guardian agrees. Nothing is stored until then.",
    })
  }

  return (
    <>
      <PageHeader
        eyebrow="Varsity Boys · 2026–27"
        title="Film"
        description="Record games on your phone with Hoops ClinIQ, or upload a video file from any camera. Your film, tagged with your own play names, linked to your playbook and your players' study."
        actions={
          <>
            <Link href="/film/review" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
              <ListChecksIcon aria-hidden /> Beta review queue
            </Link>
            <Link href="/film/record" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
              <DeviceMobileCameraIcon aria-hidden /> Record on phone
            </Link>
            <Button onClick={() => setUploadOpen(true)} className="h-11 sm:h-8">
              <UploadSimpleIcon weight="bold" aria-hidden /> Analyze a clip
            </Button>
          </>
        }
      />

      <RecentAnalyses />

      <PipelineStrip />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="upload-queue" className="rounded-md border border-border bg-surface-1">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 id="upload-queue" className="text-sm font-semibold">
              Upload queue
            </h2>
            <span className="text-right text-xs text-muted-foreground">Uploads keep going if you leave this page</span>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <UploadRowView
                key={r.id}
                row={r}
                onCancel={() => {
                  const index = rows.findIndex((x) => x.id === r.id)
                  setRows((list) => list.filter((x) => x.id !== r.id))
                  toast("Upload cancelled", {
                    description: r.name,
                    action: {
                      label: "Undo",
                      onClick: () =>
                        setRows((list) =>
                          list.some((x) => x.id === r.id) ? list : [...list.slice(0, index), r, ...list.slice(index)],
                        ),
                    },
                  })
                }}
              />
            ))}
            {rows.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nothing uploading.</li>
            )}
          </ul>
        </section>

        <div className="space-y-4">
          <StorageMeter />
          {(toReview > 0 || drafts > 0) && (
            <div className="rounded-md border border-border bg-surface-1 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-mark">
                <SparkleIcon size={14} weight="fill" aria-hidden /> ClinIQ
                <Chip tone="info">Beta</Chip>
              </p>
              <p className="mt-1.5 text-foreground-secondary">
                Your staff tags film by hand.{" "}
                <span className="font-semibold text-foreground tabular-nums">{toReview}</span> ClinIQ suggestions and{" "}
                <span className="font-semibold text-foreground tabular-nums">{drafts}</span> draft plays are Suggested ·
                needs review.
              </p>
              <Link
                href="/film/cedar-park"
                className="mt-2 inline-flex min-h-11 md:min-h-7 items-center text-xs font-medium text-foreground-secondary underline underline-offset-2 hover:text-foreground"
              >
                Start with Cedar Park
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented<Filter>
          label="Film type"
          value={filter}
          onChange={setFilter}
          className="w-full sm:w-fit [&>button]:flex-1 [&>button]:sm:flex-none"
          options={[
            { value: "all", label: `All ${counts.all}` },
            { value: "game", label: `Games ${counts.game}` },
            { value: "scout", label: `Scouting ${counts.scout}` },
            { value: "practice", label: `Practice ${counts.practice}` },
          ]}
        />
        <label className="relative sm:ml-auto sm:w-72">
          <MagnifyingGlassIcon
            size={16}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by opponent or venue"
            aria-label="Search film"
            className="h-11 w-full rounded-sm border border-input bg-surface-1 pr-3 pl-8 text-md outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:text-sm"
          />
        </label>
      </div>

      {shown.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((f) => (
            <FilmCard key={f.id} film={f} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-md border border-dashed border-border px-4 py-12 text-center">
          <FilmStripIcon size={48} className="text-muted-foreground" aria-hidden />
          <p className="mt-3 font-semibold">
            {filter === "practice" && !q ? "No practice film processed yet" : "No film matches that search"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {filter === "practice" && !q
              ? "Two practice videos are in the upload queue. They show up here once they are ready for your staff to tag."
              : "Try an opponent name, or clear the filter."}
          </p>
          <Button
            variant="outline"
            className="mt-4 h-11 sm:h-8"
            onClick={() => {
              if (filter === "practice" && !q) setUploadOpen(true)
              else {
                setQuery("")
                setFilter("all")
              }
            }}
          >
            {filter === "practice" && !q ? "Upload practice film" : "Clear filters"}
          </Button>
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUpload={addUpload} />
    </>
  )
}

function StorageMeter() {
  const { used, included } = org.videoHours
  const ratio = used / included
  return (
    <div className="rounded-md border border-border bg-surface-1 p-3">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">Video storage</span>
        <span className="text-muted-foreground tabular-nums">
          {used} of {included} hours
        </span>
      </div>
      <div
        role="meter"
        aria-label="Video storage used"
        aria-valuemin={0}
        aria-valuemax={included}
        aria-valuenow={used}
        aria-valuetext={`${used} of ${included} hours`}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cn(
            "h-full rounded-full",
            ratio >= 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-brand-orange",
          )}
          style={{ width: `${Math.min(1, ratio) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-[0.6875rem] text-muted-foreground">
        Program plan, shared by all three teams. <span className="tabular-nums">{included - used}</span> hours left.
      </p>
    </div>
  )
}

const kindLabel: Record<FilmKind, string> = { game: "Game", scout: "Scouting", practice: "Practice" }

function UploadRowView({ row, onCancel }: { row: UploadRow & { note?: string }; onCancel: () => void }) {
  const size = row.sizeMb >= 1000 ? `${(row.sizeMb / 1024).toFixed(2)} GB` : `${row.sizeMb} MB`
  const showBar = row.state === "uploading"
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-surface-2 text-foreground-secondary">
        <FilmStripIcon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{row.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {kindLabel[row.kind]} · {size}
          {row.note && ` · ${row.note}`}
        </p>
        {showBar && (
          <div
            role="progressbar"
            aria-label={`${row.name} upload`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.progress}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full bg-brand-orange transition-[width] duration-700"
              style={{ width: `${row.progress}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {row.state === "queued" && (
          <Chip tone={row.note ? "warning" : "neutral"}>
            {row.note ? <HourglassIcon size={11} aria-hidden /> : <ClockIcon size={11} aria-hidden />} Queued
          </Chip>
        )}
        {row.state === "uploading" && (
          <Chip tone="info">
            <UploadSimpleIcon size={11} weight="bold" aria-hidden /> Uploading {row.progress}%
          </Chip>
        )}
        {row.state === "preparing" && (
          <Chip tone="neutral">
            <HourglassIcon size={11} aria-hidden /> Preparing for tagging
          </Chip>
        )}
        {row.state === "ready" && row.filmId && (
          <>
            <Chip tone="success" className="hidden sm:inline-flex">
              <CheckCircleIcon size={11} weight="bold" aria-hidden /> Ready
            </Chip>
            <Link
              href={`/film/${row.filmId}`}
              className="inline-flex h-11 items-center rounded-sm border border-border px-2.5 text-xs font-medium hover:bg-surface-2 sm:h-7"
            >
              Open
            </Link>
          </>
        )}
        {(row.state === "queued" || row.state === "uploading") && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={`Cancel ${row.name}`}
            className="grid size-11 place-items-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground sm:size-7"
          >
            <XIcon size={14} aria-hidden />
          </button>
        )}
      </div>
    </li>
  )
}
