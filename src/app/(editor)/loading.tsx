import { Skeleton } from "@/components/ui/skeleton"

/** Play designer fallback: toolbar, court and side panel, matching the editor frame. */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex min-h-svh flex-col bg-background">
      <p className="sr-only" role="status">
        Loading the play designer…
      </p>
      <div aria-hidden className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="ml-auto h-9 w-24" />
      </div>
      <div aria-hidden className="flex flex-1 flex-col gap-4 p-4 lg:flex-row">
        <Skeleton className="aspect-[50/47] w-full lg:flex-1" />
        <Skeleton className="h-64 w-full lg:h-auto lg:w-80" />
      </div>
    </div>
  )
}
