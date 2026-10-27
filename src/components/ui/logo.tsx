import { cn } from "@/lib/utils"

/**
 * The Hoops ClinIQ mark, "Rise": one swoosh rising to the ball (decided 2026-10-23).
 * 48-unit grid. `currentColor` is the ink (navy / near-white); the ball is `--brand-orange`.
 * Keep in sync with apps/web/app/icon.svg.
 */
export const RISE_SWOOSH = "M4 32C12 42 30 39.5 43.5 15.5C31.5 27.5 18 31 9.5 28.5C7 27.8 4.6 29.3 4 32Z"
export const RISE_BALL = { cx: 38.5, cy: 8, r: 5.25 }

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    // No className = ink color; pass one (even "") to inherit the color from the parent instead.
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      className={cn("shrink-0", className ?? "text-foreground")}
    >
      <path d={RISE_SWOOSH} fill="currentColor" />
      <circle {...RISE_BALL} fill="var(--brand-orange)" />
    </svg>
  )
}

/** Mark + name. The name is one weight and one color; the mark carries the brand. */
export function Logo({
  size = 28,
  showName = true,
  className,
}: {
  size?: number
  showName?: boolean
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {showName && (
        <span className="font-semibold tracking-tight" style={{ fontSize: size * 0.6 }}>
          Hoops ClinIQ
        </span>
      )}
    </span>
  )
}
