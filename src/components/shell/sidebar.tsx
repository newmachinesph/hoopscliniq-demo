"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

import { Chip } from "@/components/ui/chip"
import { LogoMark } from "@/components/ui/logo"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDate } from "@/data/clock"
import { currentTeam, org, staffById } from "@/data/org"
import { creditBalance } from "@/data/settings"
import { activeHref, isActive, type NavItem, navGroups } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { PersonAvatar } from "./avatar"
import { HydrateOnView } from "./hydrate-on-view"

const planLabel = { free: "Free", coach: "Coach", team: "Team", program: "Program" } as const

function NavLink({
  item,
  rail,
  active,
  sub = false,
  onNavigate,
}: {
  item: NavItem
  rail: boolean
  active: boolean
  sub?: boolean
  onNavigate?: () => void
}) {
  const { Icon } = item
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center gap-2.5 rounded-sm px-2.5 text-[0.875rem] transition-colors lg:h-9",
        rail && "justify-center px-0",
        sub && "ml-4 h-11 text-[0.8125rem] lg:h-8",
        active
          ? "bg-selection-tint font-medium text-foreground"
          : "text-foreground-secondary hover:bg-accent hover:text-foreground",
      )}
    >
      {active && (
        <span aria-hidden className="absolute top-1.5 bottom-1.5 -left-3 w-0.5 rounded-full bg-brand-orange" />
      )}
      <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden />
      {rail ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge ? (
            <Chip shape="pill" className="ml-auto" aria-label={`${item.badge} new`}>
              {item.badge}
            </Chip>
          ) : null}
        </>
      )}
      {rail && item.badge ? (
        <span aria-hidden className="absolute top-1.5 right-2 size-1.5 rounded-full bg-brand-orange" />
      ) : null}
    </Link>
  )
  if (!rail) return link
  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

/** The demo team. One team, one coach: no team or role switching in the hackathon demo. */
function TeamSwitcher({ rail }: { rail: boolean }) {
  return (
    <div className={cn("flex w-full items-center gap-2.5 rounded-md p-1.5", rail && "justify-center")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-border bg-surface-1">
        <LogoMark size={22} />
      </span>
      {rail ? (
        <span className="sr-only">
          {org.short} Lions, {currentTeam.name}
        </span>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{org.short} Lions</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{currentTeam.name}</span>
            <Chip tone="outline">{planLabel[org.plan]}</Chip>
          </span>
        </span>
      )}
    </div>
  )
}

function CreditMeter() {
  const { used, total, left, split } = creditBalance()
  const ratio = used / total
  const fill = ratio >= 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-brand-orange"
  return (
    <div className="block rounded-md border border-border bg-surface-1 p-2.5">
      <span className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">ClinIQ credits</span>
        <span className="text-muted-foreground tabular-nums">{left.toLocaleString()} left</span>
      </span>
      <span
        role="meter"
        aria-label="ClinIQ credits used"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={used}
        className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <span className={cn("block h-full rounded-full", fill)} style={{ width: `${Math.min(1, ratio) * 100}%` }} />
      </span>
      <span className="mt-1.5 block text-[0.6875rem] text-muted-foreground">
        <span className="tabular-nums">{split}</span> · resets {formatDate(org.credits.resetsOn)} · sample data
      </span>
    </div>
  )
}

/** Who is signed in to the demo: the head coach. No menu, no sign-out (the demo has no auth). */
const headCoach = staffById("staff-reyes")
const coach = {
  name: headCoach?.name ?? "Head coach",
  label: "Head coach",
  initials: headCoach?.initials ?? "HC",
  hue: headCoach?.avatarHue ?? 24,
}

export function AccountMenu({ rail = false }: { rail?: boolean }) {
  return (
    <div
      className={cn("flex w-full items-center gap-2.5 rounded-md p-1.5", rail && "justify-center")}
      title={rail ? `${coach.name}, ${coach.label}` : undefined}
    >
      <PersonAvatar initials={coach.initials} hue={coach.hue} size={30} />
      {rail ? (
        <span className="sr-only">
          {coach.name}, {coach.label}
        </span>
      ) : (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{coach.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{coach.label}</span>
        </span>
      )}
    </div>
  )
}

/** Navigation body, shared by the desktop sidebar, the tablet rail and the phone drawer. */
export function SidebarNav({ rail = false, onNavigate }: { rail?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const current = activeHref(
    pathname,
    navGroups.flatMap((g) => g.items.flatMap((i) => [i.href, ...(i.sub ?? []).map((s) => s.href)])),
  )
  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {navGroups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-0.5">
          {group.label && !rail && (
            <p className="px-2.5 pb-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const open = isActive(pathname, item.href) || item.sub?.some((s) => s.href === current)
            return (
              <React.Fragment key={item.href}>
                <NavLink item={item} rail={rail} active={item.href === current} onNavigate={onNavigate} />
                {/* Sub pages show while their parent is open, so the rail stays short. */}
                {!rail &&
                  open &&
                  item.sub?.map((sub) => (
                    <NavLink
                      key={sub.href}
                      item={sub}
                      rail={false}
                      sub
                      active={sub.href === current}
                      onNavigate={onNavigate}
                    />
                  ))}
              </React.Fragment>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <>
      {/* Desktop: 240px. Phones never show either sidebar, so each hydrates only once it is on screen. */}
      <aside className="sticky top-0 hidden h-svh w-[var(--sidebar-width)] shrink-0 flex-col overflow-y-auto px-3 py-3 lg:flex">
        <HydrateOnView rootMargin="0px" className="flex flex-1 flex-col gap-4">
          <TeamSwitcher rail={false} />
          <SidebarNav />
          <div className="mt-auto flex flex-col gap-2">
            <CreditMeter />
            <AccountMenu />
          </div>
        </HydrateOnView>
      </aside>
      {/* Tablet: 56px rail */}
      <aside className="sticky top-0 hidden h-svh w-[var(--sidebar-rail)] shrink-0 flex-col overflow-y-auto px-1.5 py-3 md:flex lg:hidden">
        <HydrateOnView rootMargin="0px" className="flex flex-1 flex-col items-stretch gap-4">
          <TeamSwitcher rail />
          <SidebarNav rail />
          <div className="mt-auto">
            <AccountMenu rail />
          </div>
        </HydrateOnView>
      </aside>
    </>
  )
}

export { CreditMeter, TeamSwitcher }
