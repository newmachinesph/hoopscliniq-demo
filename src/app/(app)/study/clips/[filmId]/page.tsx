import type { Metadata } from "next"

import { ClipView } from "@/components/portal/clip-view"
import { PageBody } from "@/components/shell/page-header"

export const metadata: Metadata = { title: "Clip · Study" }

/** A clip of an assigned play, as the player sees it, inside the demo's Study step. */
export default async function StudyClipPage({ params, searchParams }: PageProps<"/study/clips/[filmId]">) {
  const { filmId } = await params
  const { t, play } = await searchParams
  return (
    <PageBody>
      <div className="max-w-2xl">
        <ClipView
          filmId={filmId}
          t={Number(t)}
          playParam={typeof play === "string" ? play : undefined}
          playHref={(id) => `/study?play=${id}`}
        />
      </div>
    </PageBody>
  )
}
