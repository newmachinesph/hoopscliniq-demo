import { cn } from "@/lib/utils"

// Shared building blocks for home, /insights and /org: one panel frame and one delta chip, so every dashboard
// card reads the same.

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-lg border border-border bg-surface-1", className)} {...props} />
}

export function PanelHeader({
  title,
  description,
  action,
  className,
  id,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-4 pt-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[0.9375rem] leading-snug font-semibold">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
    </header>
  )
}
