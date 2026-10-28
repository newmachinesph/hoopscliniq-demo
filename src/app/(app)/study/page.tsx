import { SparkleIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { PlayViewer } from "@/components/portal/play-viewer"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { mePlayer } from "@/data/org"
import { getPlay } from "@/data/plays"
import { assignments, playCoachNotes, quizzes } from "@/data/portal"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Study" }

const DEFAULT_PLAY = "horns-flare"

/**
 * Study, the last step of the demo loop: what one player sees for an assigned play (frames with his role highlighted,
 * the coach's note, clips), then the quiz. `?play=` picks another of his assigned plays.
 */
export default async function StudyPage({ searchParams }: PageProps<"/study">) {
  const { play: playParam } = await searchParams
  const assignment =
    assignments.find((a) => a.playId === playParam) ?? assignments.find((a) => a.playId === DEFAULT_PLAY)
  const play = assignment ? getPlay(assignment.playId) : undefined
  const quiz = play ? quizzes.find((q) => q.questions.some((x) => x.playId === play.id)) : undefined

  return (
    <PageBody>
      <PageHeader
        eyebrow={`Player view · what ${mePlayer.name} sees`}
        title={play ? `Study: ${play.title}` : "Study"}
        description="The player studies the play you assigned, with his own role highlighted and the clips that show it, then takes a short quiz. Sample team data; answers are not saved."
        actions={
          <>
            {play && (
              <Link
                href={`/study/quiz?play=${encodeURIComponent(play.id)}`}
                className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}
              >
                <SparkleIcon weight="fill" aria-hidden /> Write a quiz with ClinIQ
              </Link>
            )}
            <Link href="/study/results" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
              <UsersThreeIcon aria-hidden /> Team results
            </Link>
          </>
        }
      />
      {play && assignment ? (
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Chip tone="outline" size="md">
              {play.category}
            </Chip>
            <span className="text-sm text-muted-foreground">{play.summary}</span>
          </div>
          <PlayViewer
            play={play}
            role={assignment.role}
            initialStudied={assignment.studied}
            coachLine={playCoachNotes[play.id]}
            quiz={quiz ? { href: `/study/quiz?id=${quiz.id}`, title: quiz.title } : undefined}
            clipBase="/study/clips"
          />
        </div>
      ) : (
        <p className="text-foreground-secondary">No play is assigned to this player yet.</p>
      )}
    </PageBody>
  )
}
