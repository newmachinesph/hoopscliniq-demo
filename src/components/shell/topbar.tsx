"use client"

import { KeyboardIcon, ListIcon, MagnifyingGlassIcon, SparkleIcon } from "@phosphor-icons/react"
import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/ui/logo"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useShell } from "./shell-context"
import { AccountMenu, CreditMeter, SidebarNav, TeamSwitcher } from "./sidebar"

export function Topbar() {
  const { setPaletteOpen, openCliniq, mobileNavOpen, setMobileNavOpen, setShortcutsOpen } = useShell()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md md:bg-surface-1/85 md:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="size-11 md:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
      >
        <ListIcon size={20} aria-hidden />
      </Button>
      <Link
        href="/demo"
        className="flex size-11 shrink-0 items-center justify-center rounded-sm md:hidden"
        aria-label="Demo home"
      >
        <LogoMark size={24} />
      </Link>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="ml-auto flex h-11 w-full max-w-sm min-w-0 items-center gap-2 rounded-sm border border-border bg-surface-1 px-2.5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground-secondary md:ml-0 md:h-9"
      >
        <MagnifyingGlassIcon size={16} aria-hidden />
        <span className="flex-1 truncate text-left">Search plays and film…</span>
        <kbd className="hidden rounded-xs border border-border bg-surface-2 px-1.5 font-sans text-[0.6875rem] sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="flex items-center gap-1 md:ml-auto">
        <Button variant="outline" size="default" className="hidden gap-1.5 sm:inline-flex" onClick={() => openCliniq()}>
          <SparkleIcon weight="fill" aria-hidden /> Ask ClinIQ
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 sm:hidden"
          aria-label="Ask ClinIQ"
          onClick={() => openCliniq()}
        >
          <SparkleIcon size={18} weight="fill" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="Shift+?"
          title="Keyboard shortcuts (?)"
          onClick={() => setShortcutsOpen(true)}
        >
          <KeyboardIcon size={18} aria-hidden />
        </Button>
        <div className="hidden xl:block">
          <ThemeToggle />
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[18rem] gap-0 p-3">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col gap-4 overflow-y-auto">
            {/* Right padding keeps the team switcher's caret clear of the sheet's close button. */}
            <div className="pr-9">
              <TeamSwitcher rail={false} />
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            <div className="mt-auto flex flex-col gap-2">
              <CreditMeter />
              <ThemeToggle />
              <AccountMenu />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
