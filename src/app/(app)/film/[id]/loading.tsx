import { HeaderSkeleton, ListSkeleton, LoadingFrame } from "@/components/shell/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <LoadingFrame label="the film room" wide>
      <HeaderSkeleton actions={2} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {/* The player frame stays dark in both themes, like the real video. */}
          <div className="aspect-video w-full animate-pulse rounded-md bg-brand-navy/90" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <ListSkeleton rows={7} />
      </div>
    </LoadingFrame>
  )
}
