"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { activeHref, allNavItems, mobileTabs, type NavItem } from "@/lib/nav"
import { cn } from "@/lib/utils"

/** Phone bottom tabs: five, labeled, filled icon + label when active (DIRECTION "Mobile tabs"). The core loop. */
const tabs = mobileTabs
  .map((href) => allNavItems.find((i) => i.href === href))
  .filter((i): i is NavItem => i !== undefined)

export function MobileTabs() {
  const pathname = usePathname()
  const current = activeHref(
    pathname,
    tabs.map((t) => t.href),
  )
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {tabs.map(({ href, label, Icon }) => {
        const active = href === current
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-sm px-0.5 text-[0.6875rem] transition-colors focus-visible:outline-offset-[-2px]",
              active ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={22} weight={active ? "fill" : "regular"} aria-hidden />
            <span className="max-w-full truncate">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
