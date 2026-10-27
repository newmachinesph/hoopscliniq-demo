"use client"

import { ListBulletsIcon, MagnifyingGlassIcon, SquaresFourIcon, XIcon } from "@phosphor-icons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Segmented } from "@/components/ui/segmented"
import { formatDate } from "@/data/clock"
import { type PlaybookPlay, type PlayCategory, plays } from "@/data/plays"
import { nextGame } from "@/data/season"
import { cn } from "@/lib/utils"
import { PlayCard, PlayRow } from "./play-card"

type SectionKey = "gameplan" | "half" | "zone" | "press" | "oob" | "transition"
type Assigned = "all" | "assigned" | "drafts"
type View = "grid" | "list"

interface Section {
  key: SectionKey
  title: string
  match: (p: PlaybookPlay) => boolean
}

const sections: Section[] = [
  { key: "gameplan", title: "Game plan: Westview", match: (p) => p.gamePlan === "westview" },
  { key: "half", title: "Half court", match: (p) => p.category === "Half court" },
  { key: "zone", title: "Zone offense", match: (p) => p.category === "Zone offense" },
  { key: "press", title: "Press break", match: (p) => p.category === "Press break" },
  { key: "oob", title: "BLOB/SLOB", match: (p) => (["BLOB", "SLOB"] as PlayCategory[]).includes(p.category) },
  { key: "transition", title: "Transition", match: (p) => p.category === "Transition" },
]

const topTags = (() => {
  const counts = new Map<string, number>()
  for (const p of plays) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([t]) => t)
})()

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-1 rounded-full border px-3 text-sm whitespace-nowrap transition-colors sm:h-7 sm:px-2.5 sm:text-xs",
        pressed
          ? "border-foreground bg-foreground font-medium text-background"
          : "border-border text-foreground-secondary hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

/** Playbook: search, filters, sections, grid or list. Every card opens the editor. */
export function PlaybookView() {
  const [query, setQuery] = React.useState("")
  const [section, setSection] = React.useState<SectionKey | "all">("all")
  const [tags, setTags] = React.useState<string[]>([])
  const [assigned, setAssigned] = React.useState<Assigned>("all")
  const [view, setView] = React.useState<View>("grid")

  const q = query.trim().toLowerCase()
  const filtered = plays.filter((p) => {
    if (q) {
      const haystack = [p.title, p.summary, p.category, ...p.tags].join(" ").toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (tags.length && !tags.every((t) => p.tags.includes(t))) return false
    if (assigned === "assigned" && p.assignedTo === 0) return false
    if (assigned === "drafts" && p.assignedTo > 0) return false
    return true
  })
  const filtering = q !== "" || tags.length > 0 || assigned !== "all"
  // While filtering "All", skip the game plan section so a play doesn't show up twice.
  const visible = sections
    .filter((s) => (section === "all" ? !(filtering && s.key === "gameplan") : s.key === section))
    .map((s) => ({ ...s, plays: filtered.filter(s.match) }))
    .filter((s) => s.plays.length > 0)

  const clear = () => {
    setQuery("")
    setSection("all")
    setTags([])
    setAssigned("all")
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <MagnifyingGlassIcon
              size={16}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor="playbook-search" className="sr-only">
              Search plays
            </label>
            <input
              id="playbook-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plays, tags, actions…"
              className="h-11 w-full rounded-sm border border-input bg-surface-1 pr-8 pl-8 text-md outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-xs text-muted-foreground hover:text-foreground sm:size-6"
              >
                <XIcon size={14} aria-hidden />
              </button>
            )}
          </div>
          <Segmented<View>
            label="Layout"
            iconOnly
            value={view}
            onChange={setView}
            className="ml-auto"
            options={[
              { value: "grid", label: "Grid", icon: <SquaresFourIcon size={15} aria-hidden /> },
              { value: "list", label: "List", icon: <ListBulletsIcon size={15} aria-hidden /> },
            ]}
          />
        </div>

        <div
          role="group"
          aria-label="Category"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <FilterChip pressed={section === "all"} onClick={() => setSection("all")}>
            All <span className="tabular-nums opacity-70">{plays.length}</span>
          </FilterChip>
          {sections.map((s) => (
            <FilterChip
              key={s.key}
              pressed={section === s.key}
              onClick={() => setSection(section === s.key ? "all" : s.key)}
            >
              {s.title} <span className="tabular-nums opacity-70">{plays.filter(s.match).length}</span>
            </FilterChip>
          ))}
        </div>
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="mr-1 shrink-0 text-xs text-muted-foreground">Tags</span>
          {topTags.map((t) => (
            <FilterChip
              key={t}
              pressed={tags.includes(t)}
              onClick={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
            >
              {t}
            </FilterChip>
          ))}
          <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden />
          <FilterChip
            pressed={assigned === "assigned"}
            onClick={() => setAssigned(assigned === "assigned" ? "all" : "assigned")}
          >
            Assigned
          </FilterChip>
          <FilterChip
            pressed={assigned === "drafts"}
            onClick={() => setAssigned(assigned === "drafts" ? "all" : "drafts")}
          >
            Drafts
          </FilterChip>
          {(filtering || section !== "all") && (
            <Button variant="ghost" size="sm" onClick={clear} className="shrink-0 text-muted-foreground">
              Clear
            </Button>
          )}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {filtered.length} plays shown
      </p>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
          <MagnifyingGlassIcon size={48} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-3 text-lg font-semibold">
            {q ? <>No plays match &ldquo;{query.trim()}&rdquo;</> : "No plays match these filters"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Try another name or tag, or draw it: a new play starts on a blank half court.
          </p>
          <Button variant="outline" className="mt-4" onClick={clear}>
            Clear search and filters
          </Button>
        </div>
      ) : (
        visible.map((s) => (
          <section key={s.key} aria-labelledby={`section-${s.key}`} className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id={`section-${s.key}`} className="text-lg font-semibold">
                {s.title}
              </h2>
              <span className="text-sm text-muted-foreground tabular-nums">
                {s.plays.length} {s.plays.length === 1 ? "play" : "plays"}
              </span>
              {s.key === "gameplan" && (
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <Chip tone="outline">
                    Next game ·{" "}
                    <span className="tabular-nums">
                      {formatDate(nextGame.date, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                  </Chip>
                  <span className="text-muted-foreground">2-3 zone, 1-3-1 after timeouts</span>
                </span>
              )}
            </div>
            {view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {s.plays.map((p) => (
                  <PlayCard key={p.id} play={p} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {s.plays.map((p) => (
                  <PlayRow key={p.id} play={p} />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
