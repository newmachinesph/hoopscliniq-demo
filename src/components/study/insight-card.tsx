"use client"

import { CheckIcon, SparkleIcon, XIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { renderCited } from "@/components/cliniq/cited"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import type { StudyInsight } from "@/data/study"

/** ClinIQ proposes the study assignment; a coach assigns or dismisses it. */
export function StudyInsightCard({ insight }: { insight: StudyInsight }) {
  const [state, setState] = React.useState<"open" | "assigned" | "dismissed">("open")

  return (
    <section aria-labelledby="study-insight" className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="study-insight" className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <SparkleIcon size={14} weight="fill" aria-hidden /> ClinIQ
          <Chip tone="outline">Suggested</Chip>
        </h2>
        {state === "assigned" && (
          <Chip tone="success" dot>
            Assigned
          </Chip>
        )}
        {state === "dismissed" && <Chip tone="neutral">Dismissed</Chip>}
      </div>
      <p className="mt-2 max-w-prose text-[0.9375rem] leading-relaxed text-foreground-secondary text-pretty">
        {renderCited(insight.text, insight.citations)}
      </p>
      {state === "open" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="min-h-11 font-semibold md:min-h-8"
            onClick={() => {
              setState("assigned")
              toast("Preview: assigned")
            }}
          >
            <CheckIcon weight="bold" className="text-success" aria-hidden /> {insight.assignLabel}
          </Button>
          <Button
            variant="ghost"
            className="min-h-11 text-muted-foreground md:min-h-8"
            onClick={() => setState("dismissed")}
          >
            <XIcon aria-hidden /> Dismiss
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setState("open")}
          className="mt-3 min-h-11 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline md:min-h-8"
        >
          Undo
        </button>
      )}
    </section>
  )
}
