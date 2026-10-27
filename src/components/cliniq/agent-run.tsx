"use client"

import { CaretDownIcon, CheckCircleIcon, CircleNotchIcon, SparkleIcon } from "@phosphor-icons/react"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * An agent run inside the thread: live step list while it works, then collapsed to "Ran N steps" (DIRECTION "Agent
 * run step list"). With reduced motion the steps simply appear done; nothing ticks.
 */
export function AgentRun({
  steps,
  current,
  running,
  agent,
}: {
  steps: string[]
  /** Index of the step in progress; steps before it are done. */
  current: number
  running: boolean
  agent?: string
}) {
  const [open, setOpen] = React.useState(false)
  const expanded = running || open
  const listId = React.useId()

  if (steps.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-background text-sm">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        disabled={running}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full items-center gap-2 px-3 py-2 text-left disabled:cursor-default max-md:min-h-11"
      >
        {running ? (
          <CircleNotchIcon
            size={14}
            className="animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <SparkleIcon size={14} weight="fill" aria-hidden />
        )}
        <span className="font-medium">
          {running ? `${agent ? `${agent} agent` : "ClinIQ"} is working` : `Ran ${steps.length} steps`}
        </span>
        <span className="truncate text-muted-foreground tabular-nums">
          {running
            ? `· step ${Math.min(current + 1, steps.length)} of ${steps.length}`
            : agent
              ? `· ${agent} agent`
              : ""}
        </span>
        {!running && (
          <CaretDownIcon
            size={14}
            className={cn("ml-auto shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
            aria-hidden
          />
        )}
      </button>
      {expanded && (
        <ol id={listId} className="border-t border-border px-3 py-2.5">
          {steps.map((label, i) => {
            const state = !running || i < current ? "done" : i === current ? "running" : "pending"
            return (
              <li key={label} className="relative flex gap-2.5 pb-2 last:pb-0">
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute top-5 bottom-0 left-[7.5px] w-px bg-border" />
                )}
                <span className="relative mt-0.5 bg-background">
                  {state === "done" && <CheckCircleIcon size={16} weight="fill" className="text-success" aria-hidden />}
                  {state === "running" && (
                    <CircleNotchIcon
                      size={16}
                      className="animate-spin text-muted-foreground motion-reduce:animate-none"
                      aria-hidden
                    />
                  )}
                  {state === "pending" && (
                    <span aria-hidden className="block size-4 rounded-full border-2 border-border" />
                  )}
                </span>
                <span className={cn(state === "pending" ? "text-muted-foreground" : "text-foreground-secondary")}>
                  {label}
                  <span className="sr-only">
                    {state === "done" ? ", done" : state === "running" ? ", in progress" : ", not started"}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
