import type { Metadata } from "next"

import { CliniqWorkspace } from "@/components/cliniq/workspace"

export const metadata: Metadata = { title: "ClinIQ" }

export default async function CliniqPage({ searchParams }: PageProps<"/cliniq">) {
  const { q } = await searchParams
  const prompt = typeof q === "string" && q.trim() ? q.trim() : null
  return <CliniqWorkspace initialPrompt={prompt} key={prompt ?? "home"} />
}
