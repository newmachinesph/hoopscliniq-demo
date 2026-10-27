import type { Metadata } from "next"

import { Editor } from "@/components/editor/editor"
import { blankPlay } from "@/data/plays"

export const metadata: Metadata = { title: "New play" }

export default function NewPlayPage() {
  return <Editor initialPlay={blankPlay()} isNew />
}
