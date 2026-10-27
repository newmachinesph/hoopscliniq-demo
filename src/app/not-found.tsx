import type { Metadata } from "next"

import { NotFoundState } from "@/components/shell/status-screen"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-svh items-center justify-center bg-background">
      <NotFoundState brand />
    </main>
  )
}
