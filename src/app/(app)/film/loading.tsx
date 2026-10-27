import { CardGridSkeleton, HeaderSkeleton, LoadingFrame, TabsSkeleton } from "@/components/shell/page-skeleton"

export default function Loading() {
  return (
    <LoadingFrame label="film" wide>
      <HeaderSkeleton actions={2} />
      <TabsSkeleton count={4} />
      <CardGridSkeleton count={6} media />
    </LoadingFrame>
  )
}
