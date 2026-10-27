import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Editor } from "@/components/editor/editor"
import { getPlay, plays } from "@/data/plays"

export function generateStaticParams() {
  return plays.map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: PageProps<"/plays/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: getPlay(id)?.title ?? "Play not found" }
}

export default async function PlayEditorPage({ params }: PageProps<"/plays/[id]">) {
  const { id } = await params
  const play = getPlay(id)
  if (!play) notFound()
  return <Editor key={play.id} initialPlay={play} />
}
