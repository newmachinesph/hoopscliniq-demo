"use client"

import { CheckIcon, FilmStripIcon, KeyboardIcon, PencilSimpleIcon, SparkleIcon, XIcon } from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { BetaChip } from "@/components/ui/beta-chip"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { timecode } from "@/data/film"
import { getPlay } from "@/data/plays"
import { type Confidence, type ProposedTag, reviewGame } from "@/data/review"
import { CourtPlay } from "@/lib/play-engine/court-play"
import { cn } from "@/lib/utils"

type Decision = "confirmed" | "rejected" | "fix"

const confidenceMeta: Record<Confidence, { label: string; tone: "success" | "warning" | "danger" }> = {
  high: { label: "High", tone: "success" },
  medium: { label: "Medium", tone: "warning" },
  low: { label: "Low", tone: "danger" },
}

const decisionLabel: Record<Decision, string> = {
  confirmed: "Confirmed",
  rejected: "Rejected",
  fix: "Needs a fix",
}

/** Proposed tags from the latest game. ClinIQ proposes; nothing counts until a coach confirms it. */
export function ReviewQueue({ tags }: { tags: ProposedTag[] }) {
  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({})
  const [focusId, setFocusId] = React.useState(tags[0]?.id)

  const decide = React.useCallback((id: string, d: Decision) => {
    setDecisions((prev) => ({ ...prev, [id]: d }))
  }, [])

  const highPending = tags.filter((t) => t.confidence === "high" && !decisions[t.id])
  const decided = Object.keys(decisions).length
  const reviewed = reviewGame.reviewed + decided
  const pct = Math.round((reviewed / reviewGame.total) * 100)

  const confirmHigh = () => {
    setDecisions((prev) => {
      const next = { ...prev }
      for (const t of highPending) next[t.id] = "confirmed"
      return next
    })
    toast(`${highPending.length} high-confidence tags confirmed. Medium and low are still waiting for you.`)
  }

  // J/K move, Y confirm, N reject. Ignored while typing or when a modifier is held.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return
      const i = tags.findIndex((t) => t.id === focusId)
      const key = e.key.toLowerCase()
      if (key === "j" || key === "k") {
        e.preventDefault()
        const next = tags[Math.min(tags.length - 1, Math.max(0, i + (key === "j" ? 1 : -1)))]
        if (next) {
          setFocusId(next.id)
          document.getElementById(`tag-${next.id}`)?.scrollIntoView({ block: "nearest" })
        }
      } else if ((key === "y" || key === "n") && focusId) {
        e.preventDefault()
        decide(focusId, key === "y" ? "confirmed" : "rejected")
        const next = tags.slice(i + 1).find((t) => !decisions[t.id])
        if (next) setFocusId(next.id)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tags, focusId, decisions, decide])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <SparkleIcon size={14} weight="fill" aria-hidden /> ClinIQ
              <Chip tone="outline">Suggested · needs review</Chip>
              <BetaChip />
            </p>
            <p className="mt-1 text-sm text-foreground-secondary text-pretty">
              Nothing counts until a coach confirms it. Confirm all only touches High. Confidence levels are
              illustrative sample values.
            </p>
          </div>
          <Button className="min-h-11 md:min-h-8" disabled={highPending.length === 0} onClick={confirmHigh}>
            <CheckIcon weight="bold" aria-hidden /> Confirm all high-confidence ({highPending.length})
          </Button>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="tabular-nums">
              <span className="font-semibold">{reviewed}</span> of {reviewGame.total} reviewed
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Tags reviewed"
            aria-valuenow={reviewed}
            aria-valuemin={0}
            aria-valuemax={reviewGame.total}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <p className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <KeyboardIcon size={14} aria-hidden />
        <kbd className="rounded-xs border border-border bg-surface-2 px-1 font-mono">J</kbd>
        <kbd className="rounded-xs border border-border bg-surface-2 px-1 font-mono">K</kbd> move
        <kbd className="rounded-xs border border-border bg-surface-2 px-1 font-mono">Y</kbd> confirm
        <kbd className="rounded-xs border border-border bg-surface-2 px-1 font-mono">N</kbd> reject
      </p>

      <ul className="space-y-2">
        {tags.map((t) => {
          const meta = confidenceMeta[t.confidence]
          const decision = decisions[t.id]
          const focused = focusId === t.id
          const play = t.playId ? getPlay(t.playId) : undefined
          return (
            <li
              key={t.id}
              id={`tag-${t.id}`}
              aria-current={focused ? "true" : undefined}
              className={cn(
                "grid gap-3 rounded-lg border bg-surface-1 p-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center",
                focused ? "border-foreground" : "border-border",
                decision && "opacity-70",
              )}
            >
              <button
                type="button"
                onClick={() => setFocusId(t.id)}
                aria-label={`Select tag at ${timecode(t.at)}`}
                className="relative grid aspect-video max-h-[120px] min-h-11 w-full place-items-center overflow-hidden rounded-sm bg-court-wrapper text-muted-foreground sm:aspect-auto sm:h-[60px] sm:w-28"
              >
                {play ? (
                  <CourtPlay
                    play={play}
                    mode="summary"
                    tags={false}
                    title={`${play.title} diagram`}
                    className="block h-full w-full"
                  />
                ) : (
                  <FilmStripIcon size={22} aria-hidden />
                )}
                <span className="absolute right-1 bottom-1 rounded-xs bg-background/80 px-1 text-[0.6875rem] tabular-nums text-foreground">
                  {timecode(t.at)}
                </span>
              </button>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold">{t.action}</span>
                  <Chip tone={meta.tone} dot>
                    {meta.label} <span className="sr-only">confidence (illustrative)</span>
                  </Chip>
                  <span className="text-xs text-muted-foreground tabular-nums">{t.clock}</span>
                </p>
                <p className="mt-0.5 text-sm text-foreground-secondary">{t.players.join(", ")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{t.reason}</p>
              </div>
              {decision ? (
                <div className="flex items-center gap-2">
                  <Chip tone={decision === "confirmed" ? "success" : decision === "fix" ? "warning" : "neutral"}>
                    {decisionLabel[decision]}
                  </Chip>
                  <button
                    type="button"
                    onClick={() =>
                      setDecisions((prev) => {
                        const { [t.id]: _removed, ...rest } = prev
                        return rest
                      })
                    }
                    className="min-h-11 px-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-8"
                  >
                    Undo
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="min-h-11 md:min-h-7"
                    onClick={() => decide(t.id, "confirmed")}
                  >
                    <CheckIcon weight="bold" className="text-success" aria-hidden /> Confirm
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 md:min-h-7"
                    nativeButton={false}
                    render={<Link href={`/film/${reviewGame.filmId}`} onClick={() => decide(t.id, "fix")} />}
                  >
                    <PencilSimpleIcon aria-hidden /> Fix
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 text-muted-foreground md:min-h-7"
                    onClick={() => decide(t.id, "rejected")}
                  >
                    <XIcon aria-hidden /> Reject
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
