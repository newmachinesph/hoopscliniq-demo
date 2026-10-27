import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { QuizFlow } from "@/components/portal/quiz-flow"
import { PageBody } from "@/components/shell/page-header"
import { getPlay } from "@/data/plays"
import { quizById, quizzes, streak } from "@/data/portal"
import type { Play } from "@/lib/play-engine/types"

export const metadata: Metadata = { title: "Quiz · Study" }

/** The quiz step of Study, in the player's words. `?id=` picks the quiz; the Horns Flare quiz by default. */
export default async function StudyQuizPage({ searchParams }: PageProps<"/study/quiz">) {
  const { id } = await searchParams
  const quiz = (typeof id === "string" ? quizById(id) : undefined) ?? quizzes[0]

  const plays: Record<string, Play> = {}
  for (const q of quiz?.questions ?? []) {
    const play = getPlay(q.playId)
    if (play) plays[q.playId] = play
  }
  const playId = quiz?.questions[0]?.playId

  return (
    <PageBody>
      <Link
        href={playId ? `/study?play=${playId}` : "/study"}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:min-h-0"
      >
        <ArrowLeftIcon size={14} aria-hidden /> Study
      </Link>
      <div className="max-w-2xl">
        {quiz ? (
          <QuizFlow
            quiz={quiz}
            plays={plays}
            streak={streak.days}
            doneHref="/demo"
            reviewHref={playId ? `/study?play=${playId}` : "/study"}
          />
        ) : (
          <p className="text-foreground-secondary">No quiz yet.</p>
        )}
      </div>
    </PageBody>
  )
}
