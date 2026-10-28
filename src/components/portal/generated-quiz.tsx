"use client"

import { CircleNotchIcon, SparkleIcon } from "@phosphor-icons/react"
import * as React from "react"

import { QuizFlow } from "@/components/portal/quiz-flow"
import { Button } from "@/components/ui/button"
import type { GeneratedQuizResponse } from "@/data/generated-quiz"
import type { Play } from "@/lib/play-engine/types"

/** Muse Spark can take most of a minute; the proxy stops at 55 s. */
const CLIENT_TIMEOUT_MS = 60_000
const FAILED = "ClinIQ could not write a quiz for this play. Try again."

type State = { kind: "pending" } | { kind: "error"; message: string } | { kind: "done"; result: GeneratedQuizResponse }

/**
 * Posts the play to /api/study/quiz, shows the wait with the elapsed seconds, then runs the quiz ClinIQ wrote. The quiz
 * is a draft: the line above it says so.
 */
export function GeneratedQuiz({
  play,
  spot,
  streak,
  reviewHref,
}: {
  play: Play
  spot: number
  streak: number
  reviewHref: string
}) {
  const [attempt, setAttempt] = React.useState(0)
  const [state, setState] = React.useState<State>({ kind: "pending" })
  const [secs, setSecs] = React.useState(0)
  // The play comes from a server component, so its identity changes on every refresh: post only when the id changes.
  const playRef = React.useRef(play)
  playRef.current = play

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` marks a retry
  React.useEffect(() => {
    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, CLIENT_TIMEOUT_MS)
    const started = Date.now()
    setState({ kind: "pending" })
    setSecs(0)
    const tick = setInterval(() => setSecs(Math.round((Date.now() - started) / 1000)), 1000)

    ;(async () => {
      try {
        const res = await fetch("/api/study/quiz", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            play: { id: playRef.current.id, title: playRef.current.title, frames: playRef.current.frames },
            spot,
          }),
          signal: controller.signal,
        })
        const body = (await res.json().catch(() => null)) as
          | (Partial<GeneratedQuizResponse> & { error?: string })
          | null
        if (!res.ok || !body?.quiz?.questions?.length) {
          setState({ kind: "error", message: body?.error || FAILED })
          return
        }
        setState({ kind: "done", result: body as GeneratedQuizResponse })
      } catch {
        // Aborted by the cleanup (the page closed or a retry started): nothing to show.
        if (controller.signal.aborted && !timedOut) return
        setState({ kind: "error", message: timedOut ? "ClinIQ took longer than a minute. Try again." : FAILED })
      } finally {
        clearTimeout(timer)
        clearInterval(tick)
      }
    })()

    return () => {
      controller.abort()
      clearTimeout(timer)
      clearInterval(tick)
    }
  }, [play.id, spot, attempt])

  if (state.kind === "pending")
    return (
      <section aria-live="polite" className="rounded-md border border-border bg-surface-1 p-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-mark">
          <SparkleIcon size={13} weight="fill" aria-hidden /> ClinIQ
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm text-pretty">
          <CircleNotchIcon size={16} weight="bold" className="mt-0.5 shrink-0 motion-safe:animate-spin" aria-hidden />
          <span>
            ClinIQ is writing questions from the {play.frames.length} frames of {play.title}…
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">{secs} s. This can take up to a minute.</p>
      </section>
    )

  if (state.kind === "error")
    return (
      <section role="alert" className="rounded-md border border-border bg-surface-1 p-4 text-sm">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-mark">
          <SparkleIcon size={13} weight="fill" aria-hidden /> ClinIQ
        </p>
        <p className="mt-2 text-pretty">{state.message}</p>
        <Button className="mt-3 h-11 sm:h-8" onClick={() => setAttempt((n) => n + 1)}>
          Try again
        </Button>
      </section>
    )

  const { quiz, model } = state.result
  return (
    <>
      <p className="mb-3 flex items-start gap-1.5 text-xs text-muted-foreground text-pretty">
        <SparkleIcon size={13} weight="fill" className="mt-0.5 shrink-0 text-ai-mark" aria-hidden />
        <span>
          {model === "mock"
            ? `Sample quiz built from the frames of ${play.title}. Nothing was written by ClinIQ.`
            : `Draft quiz written by ClinIQ (Muse Spark) from the frames of ${play.title}. Your coach checks it before assigning.`}
        </span>
      </p>
      <QuizFlow quiz={quiz} plays={{ [play.id]: play }} streak={streak} doneHref="/demo" reviewHref={reviewHref} />
    </>
  )
}
