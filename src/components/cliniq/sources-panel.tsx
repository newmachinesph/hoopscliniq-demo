"use client"

import {
  BasketballIcon,
  ChartBarIcon,
  CheckCircleIcon,
  FilmStripIcon,
  ShieldCheckIcon,
  SparkleIcon,
} from "@phosphor-icons/react"
import Link from "next/link"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CliniqAnswer, SourceCitation } from "@/data/cliniq-answers"
import { modeLabels } from "@/data/cliniq-answers"
import { formatDate, relative } from "@/data/clock"
import { me } from "@/data/org"
import { getPlay } from "@/data/plays"
import { inDemo } from "@/lib/nav"
import { CourtPlay } from "@/lib/play-engine/court-play"
import { cn } from "@/lib/utils"

export type SourcesTab = "activity" | "sources"

const kindLabels = { play: "Play", clip: "Film", stat: "Stat" }
const tierWords = {
  Small: "Fast, light model",
  Mid: "Balanced model for writing and analysis",
  Top: "Most capable model, reads film",
}

function Thumbnail({ source }: { source: SourceCitation }) {
  const play = source.kind === "play" ? getPlay(source.href.replace("/plays/", "")) : undefined
  if (play) {
    return (
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-court-wrapper">
        <CourtPlay play={play} tags={false} className="size-full" title={`${play.title} diagram`} />
      </div>
    )
  }
  const Icon = source.kind === "clip" ? FilmStripIcon : source.kind === "play" ? BasketballIcon : ChartBarIcon
  return (
    <div
      className={cn(
        "relative grid h-14 w-20 shrink-0 place-items-center rounded-sm border border-border",
        source.kind === "clip" ? "bg-surface-3" : "bg-surface-2",
      )}
    >
      <Icon size={20} className="text-muted-foreground" aria-hidden />
      {source.meta && (
        <span className="absolute right-1 bottom-1 rounded-xs bg-background/90 px-1 text-[0.625rem] text-foreground-secondary tabular-nums">
          {source.meta}
        </span>
      )}
    </div>
  )
}

function SourceList({ citations }: { citations: SourceCitation[] }) {
  if (citations.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground">
        This answer has no sources. ClinIQ said so instead of guessing.
      </p>
    )
  }
  return (
    <ol className="divide-y divide-border">
      {citations.map((c, i) => (
        <li key={`${c.href}-${i}`}>
          <SourceRow href={c.href}>
            <Thumbnail source={c} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
                <span className="tabular-nums">{i + 1}</span>
                <span aria-hidden>·</span>
                {kindLabels[c.kind]}
                {c.date && (
                  <>
                    <span aria-hidden>·</span>
                    <time
                      dateTime={c.date}
                      title={formatDate(c.date, { month: "short", day: "numeric", year: "numeric" })}
                    >
                      {relative(c.date)}
                    </time>
                  </>
                )}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">{c.label}</p>
              {c.excerpt && <p className="mt-0.5 line-clamp-2 text-xs text-foreground-secondary">{c.excerpt}</p>}
            </div>
          </SourceRow>
        </li>
      ))}
    </ol>
  )
}

/** A source on a core screen links to it; one on a screen the demo leaves out (scouting, roster, stats) is plain. */
function SourceRow({ href, children }: { href: string; children: React.ReactNode }) {
  if (!inDemo(href)) {
    return (
      <div className="flex gap-3 px-4 py-3" title="Source screen not included in this demo">
        {children}
      </div>
    )
  }
  return (
    <Link href={href} className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
      {children}
    </Link>
  )
}

function Activity({ answer }: { answer: CliniqAnswer }) {
  const steps = answer.steps ?? []
  return (
    <div className="space-y-4 px-4 py-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <SparkleIcon size={14} weight="fill" aria-hidden />
          {answer.agent ? `${answer.agent} agent` : "ClinIQ"}
          <span className="font-normal text-muted-foreground">· {modeLabels[answer.mode ?? "ask"].label}</span>
        </p>
        {answer.tier && <p className="mt-0.5 text-xs text-muted-foreground">{tierWords[answer.tier]}</p>}
      </div>
      {steps.length > 0 && (
        <ol className="space-y-2">
          {steps.map((s) => (
            <li key={s} className="flex gap-2 text-sm text-foreground-secondary">
              <CheckCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0 text-success" aria-hidden />
              {s}
            </li>
          ))}
        </ol>
      )}
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-sm bg-surface-2 p-2.5">
          <dt className="text-muted-foreground">Sources</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{answer.citations.length}</dd>
        </div>
        <div className="rounded-sm bg-surface-2 p-2.5">
          <dt className="text-muted-foreground">Credits</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{answer.credits}</dd>
        </div>
      </dl>
      <p className="flex gap-2 text-xs text-muted-foreground">
        <ShieldCheckIcon size={14} className="mt-px shrink-0" aria-hidden />
        Started by {me.name}. The agent ran with your permissions and saw nothing you can't.
      </p>
    </div>
  )
}

/** Right rail for the current answer: Activity (the run) and Sources (thumbnail, title, excerpt, date). */
export function SourcesPanel({
  answer,
  tab,
  onTabChange,
  className,
}: {
  answer: CliniqAnswer | null
  tab: SourcesTab
  onTabChange: (tab: SourcesTab) => void
  className?: string
}) {
  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as SourcesTab)} className={cn("min-h-0 gap-0", className)}>
      <div className="border-b border-border px-3 pt-2 pb-1.5">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="activity" className="flex-none px-2">
            Activity
          </TabsTrigger>
          <TabsTrigger value="sources" className="flex-none px-2">
            Sources
            {answer && answer.citations.length > 0 && (
              <span className="text-muted-foreground tabular-nums">{answer.citations.length}</span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {answer ? (
          <>
            <TabsContent value="activity">
              <Activity answer={answer} />
            </TabsContent>
            <TabsContent value="sources">
              <SourceList citations={answer.citations} />
            </TabsContent>
          </>
        ) : (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Ask a question. The plays, clips and stats behind each answer show up here.
          </p>
        )}
      </div>
    </Tabs>
  )
}
