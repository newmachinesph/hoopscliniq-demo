import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { JobView } from "@/components/film/job-view"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { isSampleId, JOB_ID } from "@/lib/film-job"

export const metadata: Metadata = { title: "Clip analysis · Film" }

/** One pipeline job: live steps while it runs, then the clip with SAM 3.1 boxes, the court and the suggested name. */
export default async function FilmJobPage({ params, searchParams }: PageProps<"/film/jobs/[jobId]">) {
  const { jobId } = await params
  if (!JOB_ID.test(jobId)) notFound()
  // ?sample=boys|girls: the clip came from public/samples/, so the page shows its attribution line.
  const { sample } = await searchParams
  return (
    <PageBody wide>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-x-1.5">
            <Link href="/film" className="inline-flex min-h-11 items-center gap-1 hover:text-foreground md:min-h-7">
              <ArrowLeftIcon size={14} aria-hidden /> Film
            </Link>
            <span aria-hidden>·</span>
            <span className="truncate">Job {jobId}</span>
          </span>
        }
        title="Clip analysis"
        description="Modal pulls the frames, SAM 3.1 tracks the players and Muse Spark suggests the play name. You confirm it."
      />
      <JobView jobId={jobId} sample={isSampleId(sample) ? sample : null} />
    </PageBody>
  )
}
