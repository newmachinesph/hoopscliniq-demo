"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/cliniq", label: "Chat" },
  { href: "/cliniq/limits", label: "What it can do" },
]

/** Section nav for the ClinIQ pages. The hackathon demo keeps Chat and What it can do. */
export function CliniqTabs({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="ClinIQ" className={cn("-mx-1 flex overflow-x-auto", className)}>
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-11 shrink-0 items-center gap-1.5 px-2.5 text-sm transition-colors md:min-h-9",
              active
                ? "font-semibold text-foreground after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
