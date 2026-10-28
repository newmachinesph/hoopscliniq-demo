"use client"

import { CheckCircleIcon, CheckIcon, PencilSimpleIcon, SparkleIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import type { SuggestedName } from "@/lib/film-job"

const CONFIDENCE = { high: "High", medium: "Medium", low: "Low" } as const

/**
 * Muse Spark's suggested play name. Confirm and Rename stay in this page's state: nothing is saved anywhere.
 * `primary` false turns Confirm grey while another control on the page holds the one orange button.
 */
export function SuggestedNameCard({
  name,
  mock,
  primary = true,
}: {
  name: SuggestedName | null
  mock: boolean
  primary?: boolean
}) {
  const [title, setTitle] = React.useState(name?.title ?? "")
  const [confirmed, setConfirmed] = React.useState(false)
  const [renaming, setRenaming] = React.useState(false)
  const [draft, setDraft] = React.useState("")

  const saved = (description: string) => toast("Saved in this preview", { description })

  return (
    <section aria-labelledby="suggested-name" className="rounded-md border border-border bg-surface-1 p-4">
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ai-mark">
        <SparkleIcon size={13} weight="fill" aria-hidden /> ClinIQ
        {confirmed ? (
          <Chip tone="success">
            <CheckCircleIcon size={11} weight="bold" aria-hidden /> Confirmed by you
          </Chip>
        ) : (
          <Chip tone="outline">Needs your review</Chip>
        )}
      </p>
      {!name ? (
        <p className="mt-2 text-sm text-muted-foreground">Muse Spark did not suggest a name for this clip.</p>
      ) : (
        <>
          <h2 id="suggested-name" className="mt-2 text-lg font-semibold text-balance">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {name.confidence ? `${CONFIDENCE[name.confidence]} confidence · ` : ""}
            {mock ? "Sample suggestion, not from your clip" : "Suggested by Muse Spark from the player tracks below"}
          </p>
          {name.why && <p className="mt-2 text-sm text-foreground-secondary text-pretty">{name.why}</p>}

          {renaming ? (
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                const next = draft.trim()
                if (!next) return
                setTitle(next)
                setRenaming(false)
                setConfirmed(true)
                saved(next)
              }}
            >
              <input
                // biome-ignore lint/a11y/noAutofocus: the field opens on the coach's own click
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={80}
                aria-label="Play name"
                className="h-11 min-w-0 flex-1 rounded-sm border border-input bg-surface-1 px-3 text-md outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:text-sm"
              />
              <Button type="submit" variant="secondary" className="h-11 sm:h-8" disabled={!draft.trim()}>
                Save
              </Button>
              <Button type="button" variant="ghost" className="h-11 sm:h-8" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant={primary ? "default" : "secondary"}
                className="h-11 sm:h-8"
                disabled={confirmed}
                onClick={() => {
                  setConfirmed(true)
                  saved(title)
                }}
              >
                <CheckIcon weight="bold" aria-hidden /> Confirm
              </Button>
              <Button
                variant="outline"
                className="h-11 sm:h-8"
                onClick={() => {
                  setDraft(title)
                  setRenaming(true)
                }}
              >
                <PencilSimpleIcon aria-hidden /> Rename
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
