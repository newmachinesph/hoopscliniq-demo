import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { ReviewQueue } from "@/components/review/review-queue"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { currentTeam } from "@/data/org"
import { proposedTags, reviewGame } from "@/data/review"

export const metadata: Metadata = { title: "Review tags" }

export default function FilmReviewPage() {
  return (
    <PageBody>
      <Link
        href="/film"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:min-h-0"
      >
        <ArrowLeftIcon size={14} aria-hidden /> Film
      </Link>
      <PageHeader
        eyebrow={`${currentTeam.name} · ${reviewGame.opponent}`}
        title="Review tags"
        description="Beta. Your staff tagged this game by hand. On a minority of possessions, ClinIQ suggested a tag instead: each one is Suggested · needs review, and you confirm, fix or reject it before it counts in reports."
      />
      <ReviewQueue tags={proposedTags} />
      <p className="text-sm text-muted-foreground text-pretty">
        Not sure what ClinIQ can tag?{" "}
        <Link href="/cliniq/limits" className="text-foreground underline-offset-4 hover:underline">
          See what it can and can't do yet
        </Link>
        .
      </p>
    </PageBody>
  )
}
