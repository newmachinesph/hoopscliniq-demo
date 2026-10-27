"use client"

import * as React from "react"

// Client-side shell state: the ClinIQ side panel, the command palette, the phone nav drawer and the keyboard
// shortcuts dialog. The hackathon demo has one persona (the head coach), so there is no view switcher.

interface ShellState {
  cliniqOpen: boolean
  /** Open the ClinIQ panel, optionally with a question already asked. */
  openCliniq: (prompt?: string) => void
  closeCliniq: () => void
  cliniqPrompt: string | null
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
}

const ShellContext = React.createContext<ShellState | null>(null)

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [cliniqOpen, setCliniqOpen] = React.useState(false)
  const [cliniqPrompt, setCliniqPrompt] = React.useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false)

  const openCliniq = React.useCallback((prompt?: string) => {
    setCliniqPrompt(prompt ?? null)
    setCliniqOpen(true)
  }, [])
  const closeCliniq = React.useCallback(() => setCliniqOpen(false), [])

  // Ctrl/Cmd+K opens the palette everywhere.
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const value = React.useMemo<ShellState>(
    () => ({
      cliniqOpen,
      openCliniq,
      closeCliniq,
      cliniqPrompt,
      paletteOpen,
      setPaletteOpen,
      mobileNavOpen,
      setMobileNavOpen,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [cliniqOpen, openCliniq, closeCliniq, cliniqPrompt, paletteOpen, mobileNavOpen, shortcutsOpen],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell() {
  const ctx = React.useContext(ShellContext)
  if (!ctx) throw new Error("useShell must be used inside <ShellProvider>")
  return ctx
}
