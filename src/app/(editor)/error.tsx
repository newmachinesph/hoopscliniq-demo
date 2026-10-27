"use client"

import { ErrorState } from "@/components/shell/status-screen"

export default function EditorError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
      <ErrorState error={error} retry={retry} homeHref="/playbook" homeLabel="Back to Playbook" />
    </div>
  )
}
