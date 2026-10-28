import type { Icon } from "@phosphor-icons/react"
import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  DeviceMobileCameraIcon,
  EyeSlashIcon,
  GraduationCapIcon,
  ListChecksIcon,
} from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { BuildStatusChip } from "@/components/hackathon/status-chip"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { buttonVariants } from "@/components/ui/button"
import { consentStep, type DemoStep, demoFlow, demoScript, statusAsOf } from "@/data/hackathon"
import { currentTeam } from "@/data/org"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Demo flow" }

const ICONS: Record<DemoStep["id"], Icon> = {
  record: DeviceMobileCameraIcon,
  tag: ListChecksIcon,
  ask: ChatCircleTextIcon,
  study: GraduationCapIcon,
  consent: EyeSlashIcon,
}

function StatusStrip({ step }: { step: DemoStep }) {
  return (
    <ul className="grid gap-1.5" aria-label={`${step.title}: build status`}>
      {step.strip.map((s) => (
        <li key={s.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-foreground-secondary">{s.label}</span>
          <BuildStatusChip status={s.status} />
        </li>
      ))}
    </ul>
  )
}

function MoreLink({ step }: { step: DemoStep }) {
  if (!step.more) return null
  return (
    <Link
      href={step.more.href}
      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline md:min-h-8"
    >
      {step.more.label} <ArrowRightIcon size={14} aria-hidden />
    </Link>
  )
}

/** Demo home: the core loop as four steps in order, each with what runs today, plus the consent card. */
export default function DemoPage() {
  return (
    <PageBody>
      <PageHeader
        eyebrow={`Hackathon demo · ${currentTeam.name}, sample team`}
        title="Demo flow"
        description="Record a game, tag it, ask about it, and have players study it. Each step says what runs on Meta's models today. The team is sample data."
        actions={
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
            About the submission
          </Link>
        }
      />

      <ol className="grid gap-4 md:grid-cols-2">
        {demoFlow.map((step, i) => {
          const StepIcon = ICONS[step.id]
          return (
            <li key={step.id} className="flex flex-col rounded-md border border-border bg-surface-1 p-5">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-sm font-semibold tabular-nums text-foreground">
                  {i + 1}
                </span>
                <StepIcon size={20} aria-hidden />
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{step.title}</h2>
              <p className="mt-1 text-foreground-secondary text-pretty">{step.sentence}</p>
              <div className="mt-4 flex-1 border-t border-border pt-3">
                <StatusStrip step={step} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
                {/* One orange action per view: the first step. */}
                <Link
                  href={step.href}
                  className={cn(buttonVariants({ variant: i === 0 ? "default" : "outline", size: "lg" }), "h-11")}
                >
                  {step.cta} <ArrowRightIcon aria-hidden />
                </Link>
                <MoreLink step={step} />
              </div>
            </li>
          )
        })}
      </ol>

      <section
        aria-labelledby="consent-card"
        className="grid gap-4 rounded-md border border-border bg-surface-1 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-center"
      >
        <div>
          <h2 id="consent-card" className="flex items-center gap-2 font-semibold">
            <EyeSlashIcon size={18} aria-hidden /> {consentStep.title}
          </h2>
          <p className="mt-1 text-sm text-foreground-secondary text-pretty">{consentStep.sentence}</p>
          <Link
            href={consentStep.href}
            className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline md:min-h-8"
          >
            {consentStep.cta} <ArrowRightIcon size={14} aria-hidden />
          </Link>
        </div>
        <StatusStrip step={consentStep} />
      </section>

      <section aria-labelledby="path-title" className="rounded-md border border-border bg-surface-1 p-4 sm:p-5">
        <h2 id="path-title" className="font-semibold">
          Watch the 90-second path
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">The demo video follows these screens in this order.</p>
        <ol className="mt-3 grid gap-2">
          {demoScript.map((beat, i) => (
            <li key={beat.at} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 text-sm">
              <span className="pt-0.5 text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}.</span>
              <span>
                <Link href={beat.href} className="font-medium underline-offset-4 hover:underline">
                  {beat.title}
                </Link>{" "}
                <span className="text-xs text-muted-foreground tabular-nums">{beat.at}</span>
                <span className="block text-foreground-secondary text-pretty">{beat.shows}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">
        Status as of {statusAsOf}.{" "}
        <Link href="/#models" className="underline underline-offset-4 hover:text-foreground">
          What runs where
        </Link>
      </p>
    </PageBody>
  )
}
