"use client"

import { CaretRightIcon, SparkleIcon } from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { formatJobTime, type RecentJob } from "@/lib/film-job"

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; jobs: RecentJob[] }

/** Finished pipeline jobs, newest first, from GET /api/film/jobs (the mock job without a backend). */
export function RecentAnalyses() {
  const [state, setState] = React.useState<State>({ kind: "loading" })

  React.useEffect(() => {
    let alive = true
    fetch("/api/film/jobs", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((data: { jobs?: RecentJob[] }) => {
        if (alive) setState({ kind: "ready", jobs: Array.isArray(data.jobs) ? data.jobs : [] })
      })
      .catch(() => {
        if (alive) setState({ kind: "error" })
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <section aria-labelledby="recent-analyses" className="rounded-md border border-border bg-surface-1">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
        <h2 id="recent-analyses" className="flex items-center gap-1.5 text-sm font-semibold">
          <SparkleIcon size={14} weight="fill" aria-hidden /> Recent analyses
        </h2>
        <Link
          href="/film?upload=1"
          className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground sm:min-h-7"
        >
          Analyze a clip
        </Link>
      </div>
      {state.kind === "loading" && (
        <div className="space-y-2 p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      )}
      {state.kind === "error" && (
        <p className="px-4 py-4 text-sm text-muted-foreground">Recent analyses did not load. Refresh to try again.</p>
      )}
      {state.kind === "ready" && state.jobs.length === 0 && (
        <p className="px-4 py-4 text-sm text-muted-foreground">No finished analyses yet. Send a clip to start one.</p>
      )}
      {state.kind === "ready" && state.jobs.length > 0 && (
        <ul className="divide-y divide-border">
          {state.jobs.map((j) => {
            const when = formatJobTime(j.finishedAt)
            return (
              <li key={j.jobId}>
                <Link
                  href={`/film/jobs/${encodeURIComponent(j.jobId)}`}
                  className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{j.title || "Unnamed play"}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {typeof j.playersFound === "number" &&
                        `${j.playersFound} ${j.playersFound === 1 ? "player" : "players"} found`}
                      {typeof j.playersFound === "number" && when && " · "}
                      {when && `Finished ${when}`}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">Needs your review</span>
                  <CaretRightIcon size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
