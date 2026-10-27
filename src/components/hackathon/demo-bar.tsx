import { ArrowRightIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"

import { cn } from "@/lib/utils"

/** Thin hackathon strip above every demo screen (2rem tall; full-height views subtract it). */
export function DemoBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-8 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 text-xs text-foreground-secondary",
        className,
      )}
    >
      <p className="min-w-0 truncate">
        <span className="sm:hidden">Sample team data, nothing is saved</span>
        <span className="hidden sm:inline">
          <span className="hidden lg:inline">Meta Global AI Developer Hackathon 2026 · Hoops ClinIQ · </span>
          <span className="lg:hidden">Hackathon demo · </span>
          sample team data, nothing is saved
        </span>
      </p>
      <Link
        href="/"
        className="inline-flex min-h-8 shrink-0 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
      >
        <span className="sm:hidden">Hackathon demo</span>
        <span className="hidden sm:inline">About this demo</span>
        <ArrowRightIcon size={12} aria-hidden />
      </Link>
    </div>
  )
}
