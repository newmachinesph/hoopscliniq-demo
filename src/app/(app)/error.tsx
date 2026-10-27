"use client"

import { PageBody } from "@/components/shell/page-header"
import { ErrorState } from "@/components/shell/status-screen"

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <PageBody>
      <ErrorState error={error} retry={retry} homeHref="/demo" homeLabel="Go to the demo" />
    </PageBody>
  )
}
