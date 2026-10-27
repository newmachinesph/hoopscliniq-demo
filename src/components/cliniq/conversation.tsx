"use client"

import {
  ArrowUpIcon,
  CaretDownIcon,
  CheckIcon,
  InfoIcon,
  LockSimpleIcon,
  MicrophoneIcon,
  SparkleIcon,
  StopIcon,
} from "@phosphor-icons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { creditPool } from "@/data/agents"
import {
  answerFor,
  type CliniqAnswer,
  type CliniqMode,
  type CliniqProposal,
  modeLabels,
  morePrompts,
  suggestedPrompts,
} from "@/data/cliniq-answers"
import type { Citation } from "@/data/types"
import { cn } from "@/lib/utils"
import { AgentRun } from "./agent-run"
import { renderCited } from "./cited"

// Shared with gameday, practice, messages and the other proposal cards.
export { CitationLink } from "./cited"

import { AnswerFeedback } from "./answer-feedback"
import { ApprovalFlow, type DecisionState } from "./approval-flow"

function Paragraph({ text, citations }: { text: string; citations: Citation[] }) {
  return <p>{renderCited(text, citations)}</p>
}

/** Split a paragraph into streamable words, keeping a **bold run** in one piece so markup never renders half-open. */
function tokenize(text: string): string[] {
  const out: string[] = []
  let buf = ""
  for (const word of text.split(/(?<=\s)/)) {
    buf += word
    if ((buf.match(/\*\*/g)?.length ?? 0) % 2 === 0) {
      out.push(buf)
      buf = ""
    }
  }
  if (buf) out.push(buf)
  return out
}

export function ProposalCard({ proposal }: { proposal: CliniqProposal }) {
  const [state, setState] = React.useState<DecisionState>("waiting")
  return (
    <article className="rounded-md border border-border bg-surface-1 p-3 shadow-1">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <SparkleIcon size={14} weight="fill" aria-hidden /> Suggested
          {proposal.agent && <Chip tone="outline">{proposal.agent} agent</Chip>}
        </span>
        {state === "waiting" && (
          <Chip tone="warning" dot>
            Waiting for you
          </Chip>
        )}
        {state === "approved" && (
          <Chip tone="success">
            <CheckIcon size={11} weight="bold" aria-hidden /> {proposal.confirm ? "Sent" : "Approved"}
          </Chip>
        )}
        {state === "rejected" && <Chip tone="neutral">Rejected</Chip>}
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug">{proposal.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        To <span className="text-foreground-secondary">{proposal.to}</span> · {proposal.impact}
      </p>
      <ApprovalFlow
        className="mt-3"
        title={proposal.title}
        to={proposal.to}
        preview={proposal.preview}
        confirm={proposal.confirm}
        status={state}
        onDecide={setState}
      />
    </article>
  )
}

/** Read-only mode: the proposal exists, but the coach has to allow changes before it becomes an approval card. */
function LockedProposal({ proposal, onAllow }: { proposal: CliniqProposal; onAllow: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border-strong px-3 py-2.5">
      <LockSimpleIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">ClinIQ drafted: {proposal.title}</p>
        <p className="text-xs text-muted-foreground">
          You're in read-only mode. Allow changes to review it for approval.
        </p>
      </div>
      <Button size="sm" variant="outline" className="max-md:min-h-11" onClick={onAllow}>
        Allow changes
      </Button>
    </div>
  )
}

type Phase = "running" | "streaming" | "done"

interface Turn {
  id: number
  question: string
  answer: CliniqAnswer
  mode: CliniqMode
  phase: Phase
  /** Run step in progress while `running`. */
  step: number
  /** Words shown while `streaming`. */
  words: number
  total: number
  stopped?: boolean
}

const STEP_MS = 520
const WORD_MS = 40
const WORDS_PER_TICK = 2
const REDUCED_MS = 600

function makeTurn(id: number, question: string, mode: CliniqMode, phase: Phase): Turn {
  const answer = answerFor(question)
  const total = answer.body.reduce((sum, p) => sum + tokenize(p).length, 0)
  const done = phase === "done"
  return {
    id,
    question,
    answer,
    // An explicit Analyze or Plan pick wins; in Ask mode the answer reports what it actually did.
    mode: mode !== "ask" ? mode : (answer.mode ?? "ask"),
    phase,
    step: done ? (answer.steps?.length ?? 0) : 0,
    words: done ? total : 0,
    total,
  }
}

function advance(turn: Turn, reduced: boolean): Turn {
  const steps = turn.answer.steps?.length ?? 0
  // Reduced motion: no ticking steps, no streaming; the answer appends in one go.
  if (reduced) return { ...turn, phase: "done", step: steps, words: turn.total }
  if (turn.phase === "running") {
    const step = turn.step + 1
    return step >= steps ? { ...turn, step, phase: "streaming" } : { ...turn, step }
  }
  const words = turn.words + WORDS_PER_TICK
  return words >= turn.total ? { ...turn, words: turn.total, phase: "done" } : { ...turn, words }
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)"

function useReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(REDUCED_QUERY)
      media.addEventListener("change", onChange)
      return () => media.removeEventListener("change", onChange)
    },
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  )
}

function StreamedBody({ turn }: { turn: Turn }) {
  const tokens = React.useMemo(() => turn.answer.body.map(tokenize), [turn.answer])
  let offset = 0
  return (
    <div className="space-y-2.5 text-[0.9375rem] leading-relaxed text-foreground-secondary">
      {tokens.map((words, i) => {
        const shown = Math.max(0, Math.min(words.length, turn.words - offset))
        offset += words.length
        if (shown === 0) return null
        return <Paragraph key={i} text={words.slice(0, shown).join("")} citations={turn.answer.citations} />
      })}
    </div>
  )
}

function AnswerView({
  turn,
  onAsk,
  onShowSources,
  canChange,
  onAllowChanges,
}: {
  turn: Turn
  onAsk: (q: string) => void
  onShowSources?: (answer: CliniqAnswer) => void
  canChange: boolean
  onAllowChanges: () => void
}) {
  const { answer, phase } = turn
  const done = phase === "done"
  const finished = done && !turn.stopped
  const sourceCount = answer.citations.length

  return (
    <div className="space-y-3" aria-busy={!done}>
      <AgentRun steps={answer.steps ?? []} current={turn.step} running={phase === "running"} agent={answer.agent} />
      {phase !== "running" && <StreamedBody turn={turn} />}
      {turn.stopped && <p className="text-xs text-muted-foreground">Stopped before the answer finished.</p>}

      {finished && answer.confidence && (
        <p className="flex gap-2 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground">
          <InfoIcon size={14} className="mt-px shrink-0" aria-hidden />
          <span>
            <span className="font-semibold text-foreground-secondary">Low confidence. </span>
            {answer.confidence}
          </span>
        </p>
      )}

      {done && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
            {sourceCount > 0 && onShowSources ? (
              <button
                type="button"
                onClick={() => onShowSources(answer)}
                className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border px-2 transition-colors hover:border-border-strong hover:text-foreground max-md:min-h-11"
              >
                {sourceCount} {sourceCount === 1 ? "source" : "sources"}
              </button>
            ) : (
              <span>
                {sourceCount > 0 ? `${sourceCount} ${sourceCount === 1 ? "source" : "sources"}` : "No sources found"}
              </span>
            )}
            <span aria-hidden>·</span>
            <span>
              {answer.credits} {answer.credits === 1 ? "credit" : "credits"}
            </span>
            {answer.tier && (
              <>
                <span aria-hidden>·</span>
                <span>{answer.tier} model</span>
              </>
            )}
          </p>
          {finished && <AnswerFeedback citations={answer.citations} />}
        </div>
      )}

      {finished &&
        answer.proposal &&
        (canChange ? (
          <ProposalCard proposal={answer.proposal} />
        ) : (
          <LockedProposal proposal={answer.proposal} onAllow={onAllowChanges} />
        ))}

      {finished && answer.suggestions && (
        <div className="flex flex-wrap gap-1.5">
          {answer.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onAsk(s)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground max-md:min-h-11"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ModePicker({ mode, onChange }: { mode: CliniqMode; onChange: (mode: CliniqMode) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="gap-1 rounded-full max-md:min-h-9"
            aria-label={`Mode: ${modeLabels[mode].label}`}
          />
        }
      >
        <SparkleIcon weight="fill" aria-hidden />
        {modeLabels[mode].label}
        <CaretDownIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="top">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mode</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={mode} onValueChange={(value) => onChange(value as CliniqMode)}>
            {(Object.keys(modeLabels) as CliniqMode[]).map((m) => (
              <DropdownMenuRadioItem key={m} value={m} className="items-start py-1.5">
                <span>
                  <span className="block font-medium">{modeLabels[m].label}</span>
                  <span className="block text-xs text-muted-foreground">{modeLabels[m].hint}</span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * A ClinIQ conversation: questions, agent runs, streamed cited answers, proposals that wait for approval. Used by the
 * side panel and the /cliniq page. `initialPrompt` asks a question on mount (the command palette and "Ask ClinIQ"
 * buttons use it). `initialTurns` replays a saved thread without re-running it.
 */
export function Conversation({
  initialPrompt,
  initialTurns,
  compact = false,
  className,
  onAnswer,
  onShowSources,
}: {
  initialPrompt?: string | null
  initialTurns?: string[]
  compact?: boolean
  className?: string
  /** Called when an answer finishes (and for the last replayed turn), so a Sources panel can follow along. */
  onAnswer?: (answer: CliniqAnswer) => void
  /** Makes the "N sources" pill open the Sources panel. */
  onShowSources?: (answer: CliniqAnswer) => void
}) {
  const [turns, setTurns] = React.useState<Turn[]>(() =>
    (initialTurns ?? []).map((q, i) => makeTurn(i + 1, q, "ask", "done")),
  )
  const [draft, setDraft] = React.useState("")
  const [canChange, setCanChange] = React.useState(false)
  const [mode, setMode] = React.useState<CliniqMode>("ask")
  const nextId = React.useRef((initialTurns?.length ?? 0) + 1)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const pinned = React.useRef(true)
  const asked = React.useRef<string | null>(null)
  const reduced = useReducedMotion()

  const last = turns.at(-1)
  const busy = last !== undefined && last.phase !== "done"

  const ask = React.useCallback(
    (question: string) => {
      const q = question.trim()
      if (!q) return
      pinned.current = true
      setTurns((t) => {
        // One run at a time: a new question finishes whatever was still streaming.
        const settled = t.map((turn) =>
          turn.phase === "done" ? turn : { ...turn, phase: "done" as const, words: turn.total },
        )
        return [...settled, makeTurn(nextId.current++, q, mode, "running")]
      })
      setDraft("")
    },
    [mode],
  )

  const stop = () => {
    setTurns((t) =>
      t.flatMap((turn) => {
        if (turn.phase === "running") return []
        if (turn.phase === "streaming") return [{ ...turn, phase: "done" as const, stopped: true }]
        return [turn]
      }),
    )
  }

  // Drive the active run: tick steps, then stream words. Re-arms on every change, so one timer is live at most.
  React.useEffect(() => {
    const active = turns.at(-1)
    if (!active || active.phase === "done") return
    const delay = reduced ? REDUCED_MS : active.phase === "running" ? STEP_MS : WORD_MS
    const timer = setTimeout(() => {
      setTurns((ts) => ts.map((t) => (t.id === active.id ? advance(t, reduced) : t)))
    }, delay)
    return () => clearTimeout(timer)
  }, [turns, reduced])

  React.useEffect(() => {
    if (initialPrompt && asked.current !== initialPrompt) {
      asked.current = initialPrompt
      ask(initialPrompt)
    }
  }, [initialPrompt, ask])

  // Tell the parent about the latest finished answer.
  const onAnswerRef = React.useRef(onAnswer)
  React.useEffect(() => {
    onAnswerRef.current = onAnswer
  })
  const lastDone = [...turns].reverse().find((t) => t.phase === "done")
  const lastDoneId = lastDone?.id
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once per finished turn, not on every render
  React.useEffect(() => {
    if (lastDone) onAnswerRef.current?.(lastDone.answer)
  }, [lastDoneId])

  // Keep the newest text in view while it streams, unless the coach scrolled up to read.
  // biome-ignore lint/correctness/useExhaustiveDependencies: follow every turn update
  React.useEffect(() => {
    const el = scrollRef.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [turns])

  const creditsLeft = creditPool.total - creditPool.used
  const lowCredits = creditsLeft / creditPool.total <= 0.2
  const column = compact ? "px-4" : "mx-auto w-full max-w-[720px] px-4"

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className={cn("space-y-6", column, compact ? "py-4" : "py-6")}>
          {turns.length === 0 ? (
            <div className="space-y-4">
              <div>
                <p className={cn("font-semibold", compact ? "text-lg" : "text-2xl tracking-tight")}>
                  What do you want to know?
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ClinIQ answers from your playbook, film, stats and schedule, and shows every source.
                </p>
              </div>
              <div className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
                {(compact ? suggestedPrompts : [...suggestedPrompts, ...morePrompts]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => ask(p)}
                    className="min-h-11 rounded-md border border-border bg-surface-1 px-3 py-2.5 text-left text-sm transition-colors hover:border-border-strong"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <p className="ml-auto w-fit max-w-[85%] rounded-md bg-surface-2 px-3 py-2 text-sm">{turn.question}</p>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <SparkleIcon size={14} weight="fill" aria-hidden /> ClinIQ
                  <Chip tone="outline">{modeLabels[turn.mode].label}</Chip>
                </div>
                <AnswerView
                  turn={turn}
                  onAsk={ask}
                  onShowSources={onShowSources}
                  canChange={canChange}
                  onAllowChanges={() => setCanChange(true)}
                />
              </div>
            ))
          )}
          <p className="sr-only" role="status">
            {busy ? "ClinIQ is answering" : last ? "ClinIQ answered" : ""}
          </p>
        </div>
      </div>

      <form
        className={cn("border-t border-border bg-background", compact ? "p-3" : "py-3")}
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
        }}
      >
        <div className={cn(!compact && column)}>
          {lowCredits && (
            <p className="mb-2 text-xs text-warning tabular-nums">
              {creditsLeft.toLocaleString()} ClinIQ credits left this month
            </p>
          )}
          <div className="rounded-md border border-border-strong bg-surface-1 focus-within:ring-2 focus-within:ring-ring">
            <label htmlFor={compact ? "cliniq-panel-input" : "cliniq-input"} className="sr-only">
              Ask ClinIQ
            </label>
            <textarea
              id={compact ? "cliniq-panel-input" : "cliniq-input"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  ask(draft)
                }
              }}
              rows={2}
              placeholder="Ask about a play, a player, an opponent…"
              className="block w-full resize-none bg-transparent px-3 pt-2.5 text-md outline-none placeholder:text-muted-foreground sm:text-base"
            />
            <div className="flex items-center gap-2 px-2 pb-2">
              <ModePicker mode={mode} onChange={setMode} />
              <span className="flex min-h-9 items-center gap-1.5 text-xs text-muted-foreground">
                <Switch
                  id={compact ? "cliniq-panel-changes" : "cliniq-changes"}
                  checked={canChange}
                  onCheckedChange={setCanChange}
                  size="sm"
                />
                <label htmlFor={compact ? "cliniq-panel-changes" : "cliniq-changes"}>
                  {canChange ? "Can propose changes" : "Read only"}
                </label>
              </span>
              <span className="ml-auto" />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Dictate" className="max-md:size-11">
                <MicrophoneIcon aria-hidden />
              </Button>
              {busy ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Stop"
                  onClick={stop}
                  className="max-md:size-11"
                >
                  <StopIcon weight="fill" aria-hidden />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-sm"
                  aria-label="Send"
                  disabled={!draft.trim()}
                  className="max-md:size-11"
                >
                  <ArrowUpIcon weight="bold" aria-hidden />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[0.6875rem] text-muted-foreground">
            Demo answers are prewritten. ClinIQ cites its sources and never sends anything to players or parents without
            your approval.
          </p>
        </div>
      </form>
    </div>
  )
}
