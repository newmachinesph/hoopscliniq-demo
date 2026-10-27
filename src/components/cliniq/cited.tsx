import { BasketballIcon, ChartBarIcon, FilmStripIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"
import * as React from "react"

import type { Citation } from "@/data/types"
import { inDemo } from "@/lib/nav"

// No "use client": server components (scouting, study) render citations too.

const citationIcons = { play: BasketballIcon, clip: FilmStripIcon, stat: ChartBarIcon }

export function CitationLink({ citation, n }: { citation: Citation; n?: number }) {
  const Icon = citationIcons[citation.kind]
  const body = (
    <>
      <Icon size={12} aria-hidden />
      {n !== undefined && <span className="tabular-nums text-muted-foreground">{n}</span>}
      <span className="max-w-[14rem] truncate">{citation.label}</span>
    </>
  )
  const chip =
    "mx-0.5 inline-flex items-center gap-1 rounded-xs border border-border bg-surface-2 px-1.5 py-px align-baseline text-xs text-foreground-secondary"
  // The demo keeps the core screens only: a source on another screen (scouting, roster, stats) is a plain label.
  if (!inDemo(citation.href)) {
    return (
      <span className={chip} title="Source screen not included in this demo">
        {body}
      </span>
    )
  }
  return (
    <Link href={citation.href} className={`${chip} transition-colors hover:border-border-strong hover:text-foreground`}>
      {body}
    </Link>
  )
}

/** Parses **bold** and [n] citation markers (pointing at `citations[n - 1]`) into nodes. Shared by every ClinIQ paragraph. */
export function renderCited(text: string, citations: Citation[]): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g)
  return parts.map((part, i) => {
    const cite = part.match(/^\[(\d+)\]$/)
    if (cite) {
      const n = Number(cite[1])
      const citation = citations[n - 1]
      return citation ? <CitationLink key={i} citation={citation} n={n} /> : null
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}
