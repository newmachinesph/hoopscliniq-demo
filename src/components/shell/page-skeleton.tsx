import { PageBody } from "@/components/shell/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Loading scaffolds for the heavier segments. They keep the real page's frame (header, strip, grid) so content lands
// where the eye already is, and they announce themselves once to screen readers.

export function LoadingFrame({
  label,
  wide = false,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <PageBody wide={wide} aria-busy="true">
      <p className="sr-only" role="status">
        Loading {label}…
      </p>
      <div aria-hidden className="space-y-6">
        {children}
      </div>
    </PageBody>
  )
}

export function HeaderSkeleton({ actions = 1, eyebrow = true }: { actions?: number; eyebrow?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && <Skeleton className="h-4 w-28" />}
        <Skeleton className="h-7 w-56 max-w-[70vw]" />
        <Skeleton className="h-4 w-80 max-w-[80vw]" />
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      )}
    </div>
  )
}

export function KpiStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-md border border-border bg-surface-1 p-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-4 border-b border-border pb-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-5 w-20" />
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6, media = false }: { count?: number; media?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-md border border-border bg-surface-1">
          {media && <Skeleton className="aspect-video w-full rounded-none" />}
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border rounded-md border border-border bg-surface-1", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-14" />
        </div>
      ))}
    </div>
  )
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-md border border-border bg-surface-1 p-4", className)}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-5/6" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  )
}
