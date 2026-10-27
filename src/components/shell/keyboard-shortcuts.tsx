"use client"

import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useShell } from "./shell-context"

// "?" opens the list; "G then <key>" jumps to a section of the core loop (Linear-style chords).
// They stay out of the way while the person types in a field, and chords are off in the play designer, where
// letters and digits are tools.

const GO_TO: Record<string, { href: string; label: string }> = {
  h: { href: "/demo", label: "Demo home" },
  p: { href: "/playbook", label: "Playbook" },
  f: { href: "/film", label: "Film" },
  c: { href: "/cliniq", label: "ClinIQ" },
  s: { href: "/study", label: "Study" },
}

const CHORD_MS = 1200

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === "TEXTAREA" || tag === "SELECT") return true
  if (tag !== "INPUT") return false
  const type = (target as HTMLInputElement).type
  return !["checkbox", "radio", "button", "submit", "range"].includes(type)
}

// Letters belong to an open menu, dialog or listbox (typeahead), not to the chords.
const WIDGET = '[role="menu"], [role="dialog"], [role="listbox"], [role="menuitem"]'

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k, i) =>
        k === "then" ? (
          <span key={i} className="text-xs text-muted-foreground">
            then
          </span>
        ) : (
          <kbd
            key={i}
            className="inline-flex h-6 min-w-6 items-center justify-center rounded-xs border border-border bg-surface-2 px-1.5 font-sans text-xs font-medium tabular-nums"
          >
            {k}
          </kbd>
        ),
      )}
    </span>
  )
}

interface Row {
  label: string
  keys: string[]
}

function Group({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section aria-label={title}>
      <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex min-h-10 items-center justify-between gap-4 py-1.5">
            <dt className="text-sm">{r.label}</dt>
            <dd>
              <Keys keys={r.keys} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function KeyboardShortcuts({ editor = false }: { editor?: boolean }) {
  const { shortcutsOpen, setShortcutsOpen, setPaletteOpen, paletteOpen, mobileNavOpen } = useShell()
  const router = useRouter()
  const pathname = usePathname()
  const chordAt = React.useRef(0)
  const [mod, setMod] = React.useState("Ctrl")

  React.useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod("⌘")
  }, [])

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.key === "?") {
        e.preventDefault()
        setShortcutsOpen(true)
        return
      }
      if (editor || e.repeat || e.defaultPrevented) return
      if (paletteOpen || shortcutsOpen || mobileNavOpen) return
      if (e.target instanceof Element && e.target.closest(WIDGET)) return
      const key = e.key.toLowerCase()
      if (key === "/") {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (key === "g" && !e.shiftKey) {
        chordAt.current = Date.now()
        return
      }
      const target = GO_TO[key]
      if (target && Date.now() - chordAt.current < CHORD_MS) {
        chordAt.current = 0
        e.preventDefault()
        if (pathname !== target.href) router.push(target.href)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [editor, mobileNavOpen, paletteOpen, pathname, router, setPaletteOpen, shortcutsOpen, setShortcutsOpen])

  const general: Row[] = [
    { label: "Search and commands", keys: [mod, "K"] },
    ...(editor ? [] : [{ label: "Search (quick)", keys: ["/"] }]),
    { label: "Keyboard shortcuts", keys: ["?"] },
    { label: "Close a dialog or panel", keys: ["Esc"] },
  ]
  const goTo: Row[] = Object.entries(GO_TO).map(([key, t]) => ({
    label: t.label,
    keys: ["G", "then", key.toUpperCase()],
  }))
  const film: Row[] = [
    { label: "Play or pause", keys: ["Space"] },
    { label: "Back or forward 5 seconds", keys: ["←", "→"] },
    { label: "Previous or next frame", keys: [",", "."] },
    { label: "Fullscreen", keys: ["F"] },
  ]
  const designer: Row[] = [
    { label: "Pick a drawing tool", keys: ["1", "–", "8"] },
    { label: "Play or pause", keys: ["Space"] },
    { label: "Previous or next frame", keys: ["←", "→"] },
    { label: "Undo", keys: [mod, "Z"] },
    { label: "Redo", keys: [mod, "Y"] },
  ]

  return (
    <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press ? anywhere to open this list.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <Group title="General" rows={general} />
          {!editor && <Group title="Go to" rows={goTo} />}
          {!editor && <Group title="Film room" rows={film} />}
          <Group title="Play designer" rows={designer} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
