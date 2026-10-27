import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"
import Link from "next/link"

import { cn } from "@/lib/utils"

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 mb-2 inline-flex h-12 items-center gap-1.5 rounded-sm px-2 text-sm text-foreground-secondary transition-colors hover:text-foreground"
    >
      <ArrowLeftIcon size={16} aria-hidden />
      {children}
    </Link>
  )
}

/** Bordered surface used for every grouped block in the portals. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-md border border-border bg-surface-1", className)} {...props} />
}
