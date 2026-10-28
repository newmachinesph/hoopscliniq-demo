import { CaretRightIcon, SparkleIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"

import { pipelineSteps, statusAsOf } from "@/data/hackathon"
import { cn } from "@/lib/utils"
import { BuildStatusChip } from "./status-chip"

/**
 * The hackathon AI pipeline, step by step, with each step's build status from `mocks/hackathon.ts`.
 * AI gets no hue: the sparkle and the word "ClinIQ" mark it.
 */
export function PipelineStrip({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <section aria-labelledby="ai-pipeline" className={cn("rounded-md border border-border bg-surface-1", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
        <h2 id="ai-pipeline" className="flex items-center gap-1.5 text-sm font-semibold">
          <SparkleIcon size={14} weight="fill" aria-hidden /> AI pipeline
          <span className="font-normal text-muted-foreground">· ClinIQ hackathon build</span>
        </h2>
        <span className="text-xs text-muted-foreground">
          Status as of {statusAsOf} ·{" "}
          <Link href="/#models" className="underline underline-offset-4 hover:text-foreground">
            What runs where
          </Link>
        </span>
      </div>
      <ol
        className={cn("grid divide-y divide-border sm:grid-cols-3 sm:gap-px sm:divide-y-0 sm:bg-border xl:grid-cols-6")}
      >
        {pipelineSteps.map((s, i) => (
          <li key={s.id} className="relative bg-surface-1">
            <Link
              href={s.href}
              className={cn(
                "flex h-full min-h-11 flex-wrap items-center gap-x-2 gap-y-1 px-4 outline-none sm:flex-col sm:flex-nowrap sm:items-stretch sm:px-3 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                compact ? "py-2" : "py-2 sm:py-3",
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span className="text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                {s.label}
                {i < pipelineSteps.length - 1 && (
                  <CaretRightIcon size={12} className="ml-auto hidden text-muted-foreground xl:block" aria-hidden />
                )}
              </span>
              <span className="text-xs text-muted-foreground">{s.engine}</span>
              <BuildStatusChip status={s.status} className="ml-auto sm:mt-0.5 sm:ml-0 sm:self-start" />
            </Link>
          </li>
        ))}
      </ol>
      {!compact && (
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground text-pretty">
          Upload sends one clip through Modal, SAM 3.1 and Muse Spark. Record shows &ldquo;Preview&rdquo; and stores
          nothing, the library&rsquo;s tags are the demo team&rsquo;s, and ClinIQ answers are canned with real citations
          into this app.
        </p>
      )}
    </section>
  )
}
