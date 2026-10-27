import { HeaderSkeleton, LoadingFrame, PanelSkeleton } from "@/components/shell/page-skeleton"

export default function Loading() {
  return (
    <LoadingFrame label="the record screen" wide>
      <HeaderSkeleton actions={0} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <PanelSkeleton className="aspect-video" />
        <PanelSkeleton className="h-72" />
      </div>
    </LoadingFrame>
  )
}
