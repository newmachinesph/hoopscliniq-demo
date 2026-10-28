import { HeaderSkeleton, LoadingFrame } from "@/components/shell/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <LoadingFrame label="the clip analysis" wide>
      <HeaderSkeleton actions={0} />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="aspect-video w-full animate-pulse rounded-md bg-brand-navy/90" />
        <Skeleton className="aspect-[50/47] w-full" />
      </div>
    </LoadingFrame>
  )
}
