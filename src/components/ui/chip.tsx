import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Small label. Color carries state, never category; every state chip has a dot, icon or word (DIRECTION principle 4). */
const chipVariants = cva("inline-flex items-center gap-1 rounded-xs font-medium whitespace-nowrap tabular-nums", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-foreground-secondary",
      outline: "border border-border text-muted-foreground",
      success: "bg-success/14 font-semibold text-success",
      warning: "bg-warning/14 font-semibold text-warning",
      danger: "bg-danger/14 font-semibold text-danger",
      info: "bg-info/14 font-semibold text-info",
      brand: "bg-primary font-semibold text-primary-foreground",
    },
    size: {
      sm: "px-1.5 py-0.5 text-[0.6875rem]",
      md: "px-2 py-0.5 text-xs",
    },
    shape: {
      square: "",
      pill: "rounded-full",
    },
  },
  defaultVariants: { tone: "neutral", size: "sm", shape: "square" },
})

export interface ChipProps extends React.ComponentProps<"span">, VariantProps<typeof chipVariants> {
  dot?: boolean
}

export function Chip({ className, tone, size, shape, dot = false, children, ...props }: ChipProps) {
  return (
    <span className={cn(chipVariants({ tone, size, shape }), className)} {...props}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
