import type { Icon } from "@phosphor-icons/react"
import {
  BookOpenTextIcon,
  CaretRightIcon,
  ChartLineUpIcon,
  DeviceMobileCameraIcon,
  GraduationCapIcon,
  SparkleIcon,
} from "@phosphor-icons/react/ssr"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { getPlay, studiedLabel } from "@/data/plays"
import { playStudyRows } from "@/data/study"
import { cn } from "@/lib/utils"

const PLAY_ID = "horns-flare"
const STUDY_QUESTION = "Who hasn't studied the game plan yet?"

interface Step {
  n: 1 | 2 | 3 | 4
  label: string
  detail: string
  href: string
  Icon: Icon
  ai?: boolean
}

/**
 * The product in one strip: assign a play, players study it, ClinIQ answers with the play as its source, results
 * from your own film. Each step links to the screen that does it. `current` marks the step the page belongs to.
 */
export function StudyLoop({ current, className }: { current?: Step["n"]; className?: string }) {
  const play = getPlay(PLAY_ID)
  const row = playStudyRows.find((r) => r.playId === PLAY_ID)
  if (!play) return null

  const steps: Step[] = [
    {
      n: 1,
      label: "Assign a play",
      detail: `${play.title} to ${play.assignedTo} eligible players`,
      href: `/plays/${PLAY_ID}`,
      Icon: BookOpenTextIcon,
    },
    {
      n: 2,
      label: "Players study it",
      detail: `Animated play and quiz · ${studiedLabel(play)} studied`,
      href: `/study?play=${PLAY_ID}`,
      Icon: GraduationCapIcon,
    },
    {
      n: 3,
      label: "ClinIQ answers",
      detail: `“${STUDY_QUESTION}” Cites ${play.title}`,
      href: `/cliniq?q=${encodeURIComponent(STUDY_QUESTION)}`,
      Icon: SparkleIcon,
      ai: true,
    },
    {
      n: 4,
      label: "Results on your film",
      detail: row
        ? `${row.studied.ppp.toFixed(2)} PPP when studied, ${row.notStudied.ppp.toFixed(2)} when not · sample data`
        : "",
      href: "/study/results",
      Icon: ChartLineUpIcon,
    },
  ]

  return (
    <section
      aria-labelledby="study-loop-title"
      className={cn("min-w-0 rounded-lg border border-border bg-surface-1 p-4", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id="study-loop-title" className="text-[0.9375rem] font-semibold text-balance">
            Your playbook, player study and cited answers
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            On film you record. This week&apos;s loop for {play.title}.
          </p>
        </div>
        <Link href="/film/record" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
          <DeviceMobileCameraIcon aria-hidden /> Record a game
        </Link>
      </div>

      <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s) => {
          const here = s.n === current
          return (
            <li key={s.n} className="relative min-w-0">
              <Link
                href={s.href}
                aria-current={here ? "step" : undefined}
                className={cn(
                  "group flex h-full min-h-16 items-start gap-3 rounded-md border bg-background p-3 transition-colors duration-[var(--duration-fast)] outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring",
                  here ? "border-foreground" : "border-border",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-foreground-secondary">
                  <s.Icon
                    size={16}
                    aria-hidden
                    weight={s.ai ? "fill" : "regular"}
                    className={s.ai ? "text-ai-mark" : undefined}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <span className="text-muted-foreground tabular-nums">{s.n}.</span> {s.label}
                    <CaretRightIcon
                      size={12}
                      aria-hidden
                      className="ml-auto shrink-0 text-muted-foreground transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums text-pretty">
                    {s.detail}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
