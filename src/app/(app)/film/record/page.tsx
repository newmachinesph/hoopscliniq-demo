import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { RecordScreen } from "@/components/film/record-screen"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { Chip } from "@/components/ui/chip"
import { formatDate, formatTime } from "@/data/clock"
import { currentTeam } from "@/data/org"
import { nextGame, opponentById } from "@/data/season"

export const metadata: Metadata = { title: "Record a game" }

/** Mock phone recording: what a coach sees at the game. Nothing is recorded; the camera never turns on. */
export default function RecordPage() {
  const opp = opponentById(nextGame.opponentId)
  return (
    <PageBody wide>
      <Link
        href="/film"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:min-h-0"
      >
        <ArrowLeftIcon size={14} aria-hidden /> Film
      </Link>
      <PageHeader
        eyebrow={`${currentTeam.name} · ${nextGame.home ? "vs" : "at"} ${opp?.name}, ${formatDate(nextGame.date, { weekday: "short", month: "short", day: "numeric" })} ${formatTime(nextGame.date)}`}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Record a game <Chip tone="outline">In preview</Chip>
          </span>
        }
        description="Your phone is the camera. Tag your own plays as they happen, and the game lands in Film linked to your playbook and your players' study."
      />
      <RecordScreen />
    </PageBody>
  )
}
