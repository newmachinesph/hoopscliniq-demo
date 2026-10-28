"use client"

import {
  ArrowUpIcon,
  CaretDownIcon,
  CheckIcon,
  CircleNotchIcon,
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

type Phase = "pending" | "done"

/** Where an answer came from: the backend (x-demo: live), the sample data, or nowhere (the request failed). */
type Source = "live" | "mock"

interface Turn {
  id: number
  question: string
  answer: CliniqAnswer
  mode: CliniqMode
  phase: Phase
  source: Source
  /** The backend found nothing in the coach's film, plays or stats to answer from. */
  noSource?: boolean
  /** Friendly message when the request failed or was rejected. */
  error?: string
}

const EMPTY_ANSWER: CliniqAnswer = { match: [], body: [], citations: [], credits: 0 }
const LIVE_LOW_CONFIDENCE = "The sources are thin. Treat this as a lean, not a pattern."
const ASK_ERROR = "ClinIQ could not answer just now. Your question is still in the box. Try again in a moment."

function makeTurn(id: number, question: string, mode: CliniqMode, phase: Phase): Turn {
  const done = phase === "done"
  const answer = done ? answerFor(question) : EMPTY_ANSWER
  return {
    id,
    question,
    answer,
    // An explicit Analyze or Plan pick wins; in Ask mode the answer reports what it actually did.
    mode: mode !== "ask" ? mode : (answer.mode ?? "ask"),
    phase,
    source: "mock",
  }
}

interface AskResponse {
  answer?: { body?: unknown; citations?: unknown; confidence?: unknown; credits?: unknown }
  noSource?: unknown
}

/** POST /api/cliniq/ask. Throws a friendly Error on a 4xx/5xx or an unreadable body. */
async function fetchAnswer(question: string, signal: AbortSignal): Promise<Partial<Turn>> {
  const res = await fetch("/api/cliniq/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  })
  const live = res.headers.get("x-demo") === "live"
  let data: AskResponse & { error?: unknown } = {}
  try {
    data = await res.json()
  } catch {}
  if (!res.ok) {
    throw new Error(res.status === 400 && typeof data.error === "string" ? data.error : ASK_ERROR)
  }
  const body = Array.isArray(data.answer?.body)
    ? data.answer.body.filter((p): p is string => typeof p === "string")
    : []
  if (body.length === 0) throw new Error(ASK_ERROR)
  const noSource = data.noSource === true
  const citations = noSource
    ? []
    : ((Array.isArray(data.answer?.citations) ? data.answer.citations : []) as CliniqAnswer["citations"])
  const credits = typeof data.answer?.credits === "number" ? data.answer.credits : 1
  const confidence = typeof data.answer?.confidence === "string" ? data.answer.confidence : undefined
  // The sample answer keeps its steps, suggestions and proposal; the live answer has none of those fields.
  const base = live ? EMPTY_ANSWER : answerFor(question)
  return {
    source: live ? "live" : "mock",
    noSource,
    answer: {
      ...base,
      body,
      citations,
      credits,
      confidence: live ? (confidence === "low" ? LIVE_LOW_CONFIDENCE : undefined) : (confidence ?? base.confidence),
    },
  }
}

function PendingAnswer() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-3 text-sm text-foreground-secondary">
      <CircleNotchIcon size={16} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
      <div>
        <p className="font-medium">ClinIQ is checking your film</p>
        <p className="text-xs text-muted-foreground">
          Reading your plays, film tags and stats. This can take up to 30 seconds.
        </p>
      </div>
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
  if (phase === "pending") return <PendingAnswer />
  if (turn.error) {
    return (
      <p
        role="alert"
        className="flex gap-2 rounded-sm border border-border px-3 py-2 text-sm text-foreground-secondary"
      >
        <InfoIcon size={16} className="mt-px shrink-0" aria-hidden />
        {turn.error}
      </p>
    )
  }
  const sourceCount = answer.citations.length

  return (
    <div className="space-y-3">
      {answer.steps && answer.steps.length > 0 && (
        <AgentRun steps={answer.steps} current={answer.steps.length} running={false} agent={answer.agent} />
      )}
      <div
        className={cn(
          "space-y-2.5 text-[0.9375rem] leading-relaxed text-foreground-secondary",
          turn.noSource && "rounded-md border border-dashed border-border-strong px-3 py-2.5",
        )}
      >
        {turn.noSource && (
          <p className="text-xs font-semibold text-foreground">No source in your film, plays or stats</p>
        )}
        {answer.body.map((text, i) => (
          <Paragraph key={i} text={text} citations={answer.citations} />
        ))}
      </div>

      {answer.confidence && (
        <p className="flex gap-2 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground">
          <InfoIcon size={14} className="mt-px shrink-0" aria-hidden />
          <span>
            <span className="font-semibold text-foreground-secondary">Low confidence. </span>
            {answer.confidence}
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground tabular-nums">
          <span>{turn.source === "live" ? "Answered by Muse Spark from your film" : "Sample answer"}</span>
          <span aria-hidden>·</span>
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
        {!turn.noSource && <AnswerFeedback citations={answer.citations} />}
      </div>

      {answer.proposal &&
        (canChange ? (
          <ProposalCard proposal={answer.proposal} />
        ) : (
          <LockedProposal proposal={answer.proposal} onAllow={onAllowChanges} />
        ))}

      {answer.suggestions && (
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
  const controller = React.useRef<AbortController | null>(null)

  const last = turns.at(-1)
  const busy = last?.phase === "pending"

  const ask = React.useCallback(
    (question: string) => {
      const q = question.trim()
      // One question at a time: resending is disabled while an answer is pending.
      if (!q || controller.current) return
      pinned.current = true
      const id = nextId.current++
      const abort = new AbortController()
      controller.current = abort
      setTurns((t) => [...t, makeTurn(id, q, mode, "pending")])
      setDraft("")
      fetchAnswer(q, abort.signal)
        .then((result) => {
          setTurns((t) =>
            t.map((turn) =>
              turn.id === id
                ? {
                    ...turn,
                    ...result,
                    phase: "done" as const,
                    mode: mode !== "ask" ? mode : (result.answer?.mode ?? "ask"),
                  }
                : turn,
            ),
          )
        })
        .catch((err: unknown) => {
          if (abort.signal.aborted) {
            // Stopped or unmounted: drop the turn so it never stays pending.
            setTurns((t) => t.filter((turn) => turn.id !== id))
            return
          }
          const error = err instanceof Error ? err.message : ASK_ERROR
          setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, phase: "done" as const, error } : turn)))
          setDraft((d) => d || q)
        })
        .finally(() => {
          if (controller.current === abort) controller.current = null
        })
    },
    [mode],
  )

  const stop = () => {
    controller.current?.abort()
    controller.current = null
    setTurns((t) => t.filter((turn) => turn.phase !== "pending"))
  }

  React.useEffect(() => {
    if (initialPrompt && asked.current !== initialPrompt) {
      asked.current = initialPrompt
      ask(initialPrompt)
    }
  }, [initialPrompt, ask])

  // Leaving the page cancels a pending question. Resetting `asked` lets a StrictMode remount ask again.
  React.useEffect(
    () => () => {
      controller.current?.abort()
      controller.current = null
      asked.current = null
    },
    [],
  )

  // Tell the parent about the latest finished answer.
  const onAnswerRef = React.useRef(onAnswer)
  React.useEffect(() => {
    onAnswerRef.current = onAnswer
  })
  const lastDone = [...turns].reverse().find((t) => t.phase === "done" && !t.error)
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
                    disabled={busy}
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
            {busy ? "ClinIQ is checking your film" : last ? "ClinIQ answered" : ""}
          </p>
        </div>
      </div>

      <form
        className={cn("border-t border-border bg-background", compact ? "p-3" : "py-3")}
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy) ask(draft)
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
                  if (!busy) ask(draft)
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
            ClinIQ cites its sources and never sends anything to players or parents without your approval.
          </p>
        </div>
      </form>
    </div>
  )
}
