"use client"

import { renderCited } from "@/components/cliniq/cited"
import type { Citation } from "@/data/types"

/** One paragraph of ClinIQ prose: **bold** and [n] markers that point at `citations[n - 1]`. */
export function CitedText({ text, citations }: { text: string; citations: Citation[] }) {
  return <p>{renderCited(text, citations)}</p>
}
