import type { Metadata } from "next"

import { FilmLibrary } from "@/components/film/library"
import { PageBody } from "@/components/shell/page-header"

export const metadata: Metadata = { title: "Film" }

/** Film library. `?upload=1` (command palette "Upload film") opens the upload dialog. */
export default async function FilmLibraryPage({ searchParams }: PageProps<"/film">) {
  const { upload } = await searchParams
  return (
    <PageBody wide>
      <FilmLibrary openUpload={upload === "1"} />
    </PageBody>
  )
}
