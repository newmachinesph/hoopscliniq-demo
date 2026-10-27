import { cn } from "@/lib/utils"

/** Page title block used by every app page: eyebrow, title, description, actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-foreground-secondary text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Standard page body width and padding inside the shell. */
export function PageBody({ className, wide = false, ...props }: React.ComponentProps<"div"> & { wide?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-6 px-4 py-6 sm:px-6",
        wide ? "max-w-[1440px]" : "max-w-[1200px]",
        className,
      )}
      {...props}
    />
  )
}
