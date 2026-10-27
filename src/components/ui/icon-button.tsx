import { cn } from "@/lib/utils"

/** Square icon-only button. `label` is required: it becomes the accessible name. */
export function IconButton({
  label,
  size = "md",
  active = false,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-label"> & {
  label: string
  size?: "sm" | "md" | "lg"
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid shrink-0 place-items-center rounded-sm transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" && "size-7",
        size === "md" && "size-8",
        size === "lg" && "size-9",
        active ? "bg-surface-2 text-foreground" : "text-foreground-secondary hover:bg-accent hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
