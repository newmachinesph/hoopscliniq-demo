import type { Metadata } from "next"

import { FeaturedStrip } from "@/components/playbook/featured-strip"
import { PlaybookActions } from "@/components/playbook/playbook-actions"
import { PlaybookView } from "@/components/playbook/playbook-view"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { currentTeam } from "@/data/org"
import { plays } from "@/data/plays"

export const metadata: Metadata = { title: "Playbook" }

export default function PlaybookPage() {
  const published = plays.filter((p) => p.assignedTo > 0)
  const studyRate = Math.round(
    (published.reduce((n, p) => n + p.studied, 0) / published.reduce((n, p) => n + p.assignedTo, 0)) * 100,
  )
  return (
    <PageBody wide>
      <PageHeader
        eyebrow={currentTeam.name}
        title="Playbook"
        description={
          <span className="tabular-nums">
            {plays.length} plays · {published.length} published · players have studied {studyRate}% of what&apos;s
            assigned
          </span>
        }
        actions={<PlaybookActions />}
      />
      <FeaturedStrip />
      <PlaybookView />
    </PageBody>
  )
}
