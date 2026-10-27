"use client"

import { CheckCircleIcon, ExamIcon, ShieldIcon, SparkleIcon, WarningIcon } from "@phosphor-icons/react"
import * as React from "react"

import { ProposalCard } from "@/components/cliniq/conversation"
import { Button } from "@/components/ui/button"
import { players } from "@/data/org"
import type { PlaybookPlay } from "@/data/plays"
import type { Citation } from "@/data/types"
import { cn } from "@/lib/utils"
import { analyzePlay, type PlayAnalysis } from "./analysis"
import { CitedText } from "./cited-text"
import { spotName } from "./play-edits"

const THINK_MS = 1100

type Job = "analyze" | "counter" | "quiz"

interface Proposal {
  rationale: string
  citations: Citation[]
  preview?: string[]
  proposal: { title: string; to: string; impact: string }
}

const westviewScouting: Citation = { kind: "stat", label: "Westview scouting report", href: "/scouting/westview" }
const westviewFilm: Citation = { kind: "clip", label: "Westview vs Ridgeline", href: "/film/westview-ridgeline" }

function counterFor(play: PlaybookPlay): Proposal {
  if (play.vs === "zone") {
    return {
      rationale: `Westview switches from the 2-3 to a 1-3-1 after timeouts [1]. Against the 1-3-1 the short corner is still open, but the high-post catch is not [2], so ClinIQ keeps **${play.title}** and moves the flash to the opposite short corner.`,
      citations: [westviewScouting, westviewFilm],
      proposal: {
        title: `${play.title} vs 1-3-1: flash to the opposite short corner`,
        to: "Playbook · Game plan: Westview",
        impact: "Creates a draft play · nothing goes to players",
      },
    }
  }
  const firstScreen = play.frames.findIndex((f) => f.actions.some((a) => a.kind === "screen"))
  return {
    rationale: `Westview plays a 2-3 on 61% of half-court possessions [1]. Against a zone, the ${firstScreen >= 0 ? `screen in frame ${firstScreen + 1}` : "first cut"} of **${play.title}** has nobody to screen [2], so ClinIQ keeps your entry and turns the screener into a short-corner threat, the way Short Corner Flood does [3].`,
    citations: [
      westviewScouting,
      { kind: "play", label: `${play.title}, frame ${Math.max(firstScreen, 0) + 1}`, href: `/plays/${play.id}` },
      { kind: "play", label: "Short Corner Flood", href: "/plays/short-corner-flood" },
    ],
    proposal: {
      title: `Draft "${play.title} · Zone": same entry, screener to the short corner`,
      to: "Playbook · Game plan: Westview",
      impact: "Creates a draft play · nothing goes to players",
    },
  }
}

function quizFor(play: PlaybookPlay): Proposal {
  const pending = players.filter((p) => p.consent === "pending")
  const questions: string[] = []
  play.frames.forEach((f, i) => {
    for (const a of f.actions) {
      if (questions.length >= 3) return
      const mover = f.offense.findIndex((p) => Math.hypot(p[0] - a.from[0], p[1] - a.from[1]) < 1)
      if (mover < 0) continue
      questions.push(
        a.kind === "pass" || a.kind === "handoff"
          ? `Frame ${i + 1}: who gets the ${a.kind === "pass" ? "pass" : "handoff"} from ${mover + 1}?`
          : `Frame ${i + 1}: where does ${mover + 1} ${a.kind === "screen" ? "set the screen" : "go"}? (${spotName(a.to)})`,
      )
    }
  })
  const to =
    play.assignedTo > 0
      ? `${play.assignedTo} eligible players${pending.length ? ` · ${pending.map((p) => p.name).join(", ")}: consent pending` : ""}`
      : "Assigned players, once you publish"
  return {
    rationale: `Built from the frames of **${play.title}** [1]. ${play.assignedTo ? `${play.assignedTo - play.studied} assigned players haven't studied it yet [2].` : ""}`,
    citations: [
      { kind: "play", label: play.title, href: `/plays/${play.id}` },
      { kind: "stat", label: "Player IQ: study rates", href: "/insights" },
    ],
    preview: questions,
    proposal: {
      title: `${questions.length || 3}-question quiz: ${play.title}`,
      to,
      impact: "Due Thursday, before Westview · players see it only after you approve",
    },
  }
}

const toneIcon = { success: CheckCircleIcon, warning: WarningIcon, neutral: null }

/** ClinIQ on this play: a cited analysis and two proposals that wait for approval. */
export function CliniqTab({ play }: { play: PlaybookPlay }) {
  const [busy, setBusy] = React.useState<Job | null>(null)
  const [analysis, setAnalysis] = React.useState<PlayAnalysis | null>(null)
  const [counter, setCounter] = React.useState<Proposal | null>(null)
  const [quiz, setQuiz] = React.useState<Proposal | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const run = (job: Job) => {
    if (timer.current) clearTimeout(timer.current)
    setBusy(job)
    // Snapshot the play as it is now; later edits don't silently rewrite an answer the coach already read.
    const snapshot = play
    timer.current = setTimeout(() => {
      if (job === "analyze") setAnalysis(analyzePlay(snapshot))
      if (job === "counter") setCounter(counterFor(snapshot))
      if (job === "quiz") setQuiz(quizFor(snapshot))
      setBusy(null)
    }, THINK_MS)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-ai-mark">
          <SparkleIcon size={14} weight="fill" aria-hidden /> ClinIQ
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Reads this play&apos;s frames, film and stats, and cites every claim. Nothing changes until you approve.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Button variant="secondary" className="justify-between" onClick={() => run("analyze")} disabled={busy !== null}>
          <span className="inline-flex items-center gap-1.5">
            <SparkleIcon weight="fill" aria-hidden /> {analysis ? "Analyze again" : "Analyze"}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">5 credits</span>
        </Button>
        <Button variant="outline" className="justify-between" onClick={() => run("counter")} disabled={busy !== null}>
          <span className="inline-flex items-center gap-1.5">
            <ShieldIcon aria-hidden /> Counter vs Westview 2-3
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">5 credits</span>
        </Button>
        <Button variant="outline" className="justify-between" onClick={() => run("quiz")} disabled={busy !== null}>
          <span className="inline-flex items-center gap-1.5">
            <ExamIcon aria-hidden /> Make a quiz
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">1 credit</span>
        </Button>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <SparkleIcon size={14} weight="fill" className="animate-pulse motion-reduce:animate-none" aria-hidden />
          Reading {play.title}: frames, film and stats…
        </p>
      )}

      {analysis && (
        <section aria-label="Analysis" className="space-y-3 border-t border-border pt-4">
          {analysis.checks.length > 0 && (
            <ul className="space-y-1.5 rounded-sm bg-ai-surface p-2.5 text-xs">
              {analysis.checks.map((c) => {
                const Icon = toneIcon[c.tone]
                return (
                  <li key={c.label} className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-medium tabular-nums",
                        c.tone === "success" && "text-success",
                        c.tone === "warning" && "text-warning",
                        c.tone === "neutral" && "text-foreground-secondary",
                      )}
                    >
                      {Icon && <Icon size={12} weight="fill" aria-hidden />}
                      {c.value}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="space-y-2.5 text-sm leading-relaxed text-foreground-secondary">
            {analysis.body.map((text, i) => (
              <CitedText key={i} text={text} citations={analysis.citations} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {analysis.citations.length} {analysis.citations.length === 1 ? "source" : "sources"} · {analysis.credits}{" "}
            {analysis.credits === 1 ? "credit" : "credits"}
          </p>
        </section>
      )}

      {counter && <ProposalBlock label="Counter" proposal={counter} />}
      {quiz && <ProposalBlock label="Quiz" proposal={quiz} />}
    </div>
  )
}

function ProposalBlock({ label, proposal }: { label: string; proposal: Proposal }) {
  return (
    <section aria-label={label} className="space-y-2.5 border-t border-border pt-4">
      <div className="text-sm leading-relaxed text-foreground-secondary">
        <CitedText text={proposal.rationale} citations={proposal.citations} />
      </div>
      {proposal.preview && proposal.preview.length > 0 && (
        <ol className="list-decimal space-y-1 rounded-sm bg-ai-surface py-2 pr-2.5 pl-7 text-xs text-foreground-secondary">
          {proposal.preview.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      )}
      <ProposalCard proposal={proposal.proposal} />
    </section>
  )
}
