import { CardGridSkeleton, HeaderSkeleton, KpiStripSkeleton, LoadingFrame } from "@/components/shell/page-skeleton"

/** Fallback for any app route without its own skeleton. */
export default function Loading() {
  return (
    <LoadingFrame label="page">
      <HeaderSkeleton />
      <KpiStripSkeleton />
      <CardGridSkeleton count={6} />
    </LoadingFrame>
  )
}
