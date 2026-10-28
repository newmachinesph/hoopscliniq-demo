"use client"

import { CheckCircleIcon, FlameIcon, XCircleIcon } from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import type { Quiz } from "@/data/portal"
import { CourtPlay } from "@/lib/play-engine/court-play"
import type { Play } from "@/lib/play-engine/types"
import { cn } from "@/lib/utils"

/** One decision per screen. Picking an answer locks it and shows the result with the frame; Continue waits for an answer. */
export function QuizFlow({
  quiz,
  plays,
  streak,
  doneHref = "/demo",
  reviewHref = "/study",
}: {
  quiz: Quiz
  plays: Record<string, Play>
  streak: number
  /** Where Done and Review go: the player app, or the demo study screen. */
  doneHref?: string
  reviewHref?: string
}) {
  const [index, setIndex] = React.useState(0)
  const [picked, setPicked] = React.useState<string>()
  const [score, setScore] = React.useState(0)
  const total = quiz.questions.length
  const q = quiz.questions[index]
  const spot = quiz.spot ?? 2

  if (!q) {
    return (
      <section aria-live="polite" className="pt-6 text-center">
        <p className="text-sm text-muted-foreground">{quiz.title}</p>
        <p className="mt-2 text-7xl font-semibold tracking-tight tabular-nums">
          {score}
          <span className="text-muted-foreground">/{total}</span>
        </p>
        <p className="mt-2 text-lg font-medium">
          {score === total
            ? "Clean sweep."
            : score >= total - 1
              ? "Solid. One to review."
              : "Worth another look at the play."}
        </p>
        <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold tabular-nums">
          <FlameIcon size={18} weight="fill" aria-hidden />
          Streak {streak + 1} days (+1)
        </p>
        <p className="mt-4 text-sm text-muted-foreground text-pretty">
          Your coach sees this score with the team&apos;s study results.
        </p>
        <div className="mt-6 grid gap-2">
          <Link href={doneHref} className={cn(buttonVariants(), "h-12 w-full text-base")}>
            Done
          </Link>
          <Link href={reviewHref} className={cn(buttonVariants({ variant: "outline" }), "h-12 w-full text-base")}>
            Review the plays
          </Link>
        </div>
      </section>
    )
  }

  const play = plays[q.playId]
  const answered = picked !== undefined
  const correct = picked === q.correctId
  const shownFrame = answered ? q.answerFrame : q.frame

  function next() {
    if (picked === q?.correctId) setScore((s) => s + 1)
    setPicked(undefined)
    setIndex((i) => i + 1)
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div
          role="progressbar"
          aria-label="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={index}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-foreground transition-all"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {index + 1} of {total}
        </span>
      </div>

      {play && (
        <div className="overflow-hidden rounded-md border border-border">
          <CourtPlay
            play={play}
            frame={shownFrame}
            showDefense
            selected={spot - 1}
            className="block w-full"
            title={`${play.title}, frame ${shownFrame + 1}. You are number ${spot}.`}
          />
        </div>
      )}

      <h1 className="mt-4 text-lg leading-snug font-semibold">{q.prompt}</h1>

      <div role="radiogroup" aria-label="Answers" className="mt-3 grid gap-2">
        {q.options.map((o) => {
          const isPicked = picked === o.id
          const isRight = o.id === q.correctId
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => setPicked(o.id)}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-md border-2 px-4 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                !answered && "border-border-strong bg-surface-1 hover:bg-surface-2",
                answered && isRight && "border-success bg-success/14",
                answered && isPicked && !isRight && "border-danger bg-danger/14",
                answered && !isRight && !isPicked && "border-border opacity-60",
              )}
            >
              <span className="flex-1">{o.text}</span>
              {answered && isRight && (
                <CheckCircleIcon
                  size={22}
                  weight="fill"
                  className="shrink-0 text-success"
                  aria-label="Correct answer"
                />
              )}
              {answered && isPicked && !isRight && (
                <XCircleIcon
                  size={22}
                  weight="fill"
                  className="shrink-0 text-danger"
                  aria-label="Your answer, incorrect"
                />
              )}
            </button>
          )
        })}
      </div>

      <div aria-live="polite" className="mt-3 min-h-6">
        {answered && (
          <p className={cn("text-sm", correct ? "text-success" : "text-danger")}>
            <strong>{correct ? "Right." : "Not quite."}</strong>{" "}
            <span className="text-foreground-secondary">{q.why}</span>
          </p>
        )}
      </div>

      <Button type="button" className="mt-4 h-12 w-full text-base" disabled={!answered} onClick={next}>
        {index === total - 1 ? "See result" : "Continue"}
      </Button>
    </section>
  )
}
