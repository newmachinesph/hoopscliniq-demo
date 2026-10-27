import { LoadingFrame, PanelSkeleton } from "@/components/shell/page-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <LoadingFrame label="ClinIQ">
      <div className="mx-auto max-w-2xl space-y-6 pt-6">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-7 w-64 max-w-[70vw]" />
          <Skeleton className="mx-auto h-4 w-80 max-w-[80vw]" />
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          <PanelSkeleton />
          <PanelSkeleton />
        </div>
      </div>
    </LoadingFrame>
  )
}
