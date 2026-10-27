import { cn } from "@/lib/utils"

/** Initials avatar with a stable hue per person (mock data has no photos). Tinted in light, deep in dark. */
export function PersonAvatar({
  initials,
  hue,
  size = 32,
  className,
}: {
  initials: string
  hue: number
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold select-none",
        "bg-[var(--av-bg)] text-[var(--av-fg)] dark:bg-[var(--av-bg-dark)] dark:text-[var(--av-fg-dark)]",
        className,
      )}
      style={
        {
          width: size,
          height: size,
          fontSize: Math.max(10, Math.round(size * 0.38)),
          "--av-bg": `hsl(${hue} 55% 88%)`,
          "--av-fg": `hsl(${hue} 60% 24%)`,
          "--av-bg-dark": `hsl(${hue} 35% 26%)`,
          "--av-fg-dark": `hsl(${hue} 70% 86%)`,
        } as React.CSSProperties
      }
    >
      {initials}
    </span>
  )
}
