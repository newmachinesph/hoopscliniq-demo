"use client"

import { cn } from "@/lib/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
}

/**
 * Single-choice segmented control (theme picker, ranges, playback speed).
 * `iconOnly` hides labels visually but keeps them as accessible names.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  iconOnly = false,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T | undefined
  onChange: (value: T) => void
  label: string
  iconOnly?: boolean
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5 rounded-sm border border-border bg-surface-1 p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? o.label : undefined}
            title={iconOnly ? o.label : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-7 items-center justify-center gap-1.5 rounded-xs text-xs transition-colors duration-[var(--duration-fast)]",
              iconOnly ? "w-7" : "px-2",
              active ? "bg-surface-2 font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.icon}
            {!iconOnly && o.label}
          </button>
        )
      })}
    </div>
  )
}
