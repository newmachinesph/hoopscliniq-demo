"use client"

import {
  BasketballIcon,
  ClockCounterClockwiseIcon,
  FilmStripIcon,
  type Icon,
  KeyboardIcon,
  PlusIcon,
  SparkleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import * as React from "react"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { formatDate } from "@/data/clock"
import { films } from "@/data/film"
import { plays } from "@/data/plays"
import { allNavItems } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { useShell } from "./shell-context"

// Ctrl/Cmd+K (DIRECTION "Command palette"): Recent, Actions, Navigate, then every searchable thing in the mocks.
// With an empty query it stays short (recent, actions, navigate); typing reveals plays and film (the demo core).

type Kind = "play" | "film" | "page"

interface Entry {
  href: string
  label: string
  kind: Kind
  hint?: string
  keywords?: string
}

const KIND_ICON: Partial<Record<string, Icon>> = {
  play: BasketballIcon,
  film: FilmStripIcon,
  page: ClockCounterClockwiseIcon,
}

const GO_KEYS: Record<string, string> = {
  "/demo": "G H",
  "/playbook": "G P",
  "/film": "G F",
  "/cliniq": "G C",
  "/study": "G S",
}

const RECENT_KEY = "hc.recent"
const RECENT_MAX = 5

const groups: { heading: string; entries: Entry[] }[] = [
  {
    heading: "Plays",
    entries: plays.map((p) => ({
      href: `/plays/${p.id}`,
      label: p.title,
      kind: "play",
      hint: p.category,
      keywords: `${p.category} ${p.vs} ${p.summary}`,
    })),
  },
  {
    heading: "Film",
    entries: films.map((f) => ({
      href: `/film/${f.id}`,
      label: f.kind === "game" ? `Game ${f.title}` : f.title,
      kind: "film",
      hint: formatDate(f.date, { month: "short", day: "numeric" }),
      keywords: `${f.kind} ${f.them.name} video`,
    })),
  },
]

function readRecent(): Entry[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Entry[]).filter((e) => e && typeof e.href === "string") : []
  } catch {
    return []
  }
}

function writeRecent(list: Entry[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // Storage can be blocked; recents just won't persist.
  }
}

/** Palette row with a 44px touch target on phone. */
function Row({ className, ...props }: React.ComponentProps<typeof CommandItem>) {
  return <CommandItem className={cn("min-h-11 sm:min-h-9", className)} {...props} />
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, openCliniq, setShortcutsOpen } = useShell()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [recent, setRecent] = React.useState<Entry[]>([])
  const searching = query.trim().length > 0

  React.useEffect(() => {
    if (paletteOpen) setRecent(readRecent())
  }, [paletteOpen])

  const close = () => {
    setPaletteOpen(false)
    setQuery("")
  }

  const go = (href: string, entry?: Entry) => {
    if (entry) {
      const next = [entry, ...readRecent().filter((e) => e.href !== entry.href)].slice(0, RECENT_MAX)
      writeRecent(next)
    }
    close()
    router.push(href)
  }

  const ask = () => {
    const q = query.trim()
    close()
    openCliniq(q || undefined)
  }

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(open) => {
        setPaletteOpen(open)
        if (!open) setQuery("")
      }}
      title="Search"
      description="Search plays and film, or ask ClinIQ"
      className="sm:max-w-[560px]"
    >
      {/* CommandDialog is only the dialog frame; cmdk needs its own root for search and keyboard selection. */}
      <Command loop>
        <CommandInput placeholder="Search or ask ClinIQ…" value={query} onValueChange={setQuery} />
        <CommandList className="max-h-[min(60svh,26rem)]">
          {/* The Ask ClinIQ row always matches, so this only shows if that row is ever filtered out. */}
          <CommandEmpty>No matches. Try fewer words.</CommandEmpty>

          {!searching && recent.length > 0 && (
            <CommandGroup heading="Recent">
              {recent.map((e) => {
                const Icon = KIND_ICON[e.kind] ?? ClockCounterClockwiseIcon
                return (
                  <Row key={e.href} value={`recent ${e.label} ${e.href}`} onSelect={() => go(e.href, e)}>
                    <Icon aria-hidden /> <span className="truncate">{e.label}</span>
                    {e.hint && <CommandShortcut className="tracking-normal">{e.hint}</CommandShortcut>}
                  </Row>
                )
              })}
            </CommandGroup>
          )}

          <CommandGroup heading="Actions">
            <Row value={`ask cliniq ${query}`} onSelect={ask}>
              <SparkleIcon weight="fill" aria-hidden />
              <span className="truncate">{searching ? `Ask ClinIQ: “${query.trim()}”` : "Ask ClinIQ"}</span>
            </Row>
            <Row value="new play create design" onSelect={() => go("/plays/new")}>
              <PlusIcon aria-hidden /> New play
            </Row>
            <Row value="upload film video" onSelect={() => go("/film?upload=1")}>
              <UploadSimpleIcon aria-hidden /> Upload video
            </Row>
            <Row
              value="keyboard shortcuts help"
              onSelect={() => {
                close()
                setShortcutsOpen(true)
              }}
            >
              <KeyboardIcon aria-hidden /> Keyboard shortcuts <CommandShortcut>?</CommandShortcut>
            </Row>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navigate">
            {allNavItems.map(({ href, label, Icon, keywords, parent }) => (
              <Row key={href} value={`go ${parent ?? ""} ${label} ${keywords ?? ""}`} onSelect={() => go(href)}>
                <Icon aria-hidden />
                <span className="truncate">
                  {parent && <span className="text-muted-foreground">{parent} · </span>}
                  {label}
                </span>
                {GO_KEYS[href] && <CommandShortcut>{GO_KEYS[href]}</CommandShortcut>}
              </Row>
            ))}
          </CommandGroup>

          {searching &&
            groups.map(({ heading, entries }) => (
              <CommandGroup key={heading} heading={heading}>
                {entries.map((e) => {
                  const Icon = KIND_ICON[e.kind] ?? ClockCounterClockwiseIcon
                  return (
                    <Row
                      key={e.href}
                      value={`${e.kind} ${e.label} ${e.href}`}
                      keywords={e.keywords ? [e.keywords] : undefined}
                      onSelect={() => go(e.href, e)}
                    >
                      <Icon aria-hidden /> <span className="truncate">{e.label}</span>
                      {e.hint && <CommandShortcut className="tracking-normal tabular-nums">{e.hint}</CommandShortcut>}
                    </Row>
                  )
                })}
              </CommandGroup>
            ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
