"use client"

import {
  ArrowArcLeftIcon,
  ArrowArcRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ShareNetworkIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { toast } from "sonner"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { IconButton } from "@/components/ui/icon-button"

export const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** Editor top bar, 48px: back, name, undo/redo, zoom, theme, Share, Publish (DIRECTION "Editor"). */
export function TopBar({
  title,
  onTitle,
  status,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoom,
  onPublish,
  onDetails,
}: {
  title: string
  onTitle: (title: string) => void
  status: string
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  zoom: number
  onZoom: (zoom: number) => void
  onPublish: () => void
  onDetails: () => void
}) {
  const zi = ZOOMS.indexOf(zoom)
  return (
    <header className="flex h-[var(--topbar-height)] shrink-0 items-center gap-1 border-b border-border bg-surface-1 px-2 sm:gap-2">
      <Link
        href="/playbook"
        aria-label="Back to playbook"
        title="Back to playbook"
        className="grid size-11 shrink-0 place-items-center rounded-sm text-foreground-secondary hover:bg-accent hover:text-foreground md:size-8"
      >
        <ArrowLeftIcon size={18} aria-hidden />
      </Link>
      <div className="min-w-0 flex-1 md:flex-none">
        <label htmlFor="play-name" className="sr-only">
          Play name
        </label>
        <input
          id="play-name"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur()
          }}
          className="-mx-1 block w-full rounded-xs bg-transparent px-1 text-sm font-semibold outline-none hover:bg-accent focus-visible:bg-surface-2 md:w-56"
        />
        <p className="truncate text-[0.6875rem] text-muted-foreground">Varsity Boys · {status}</p>
      </div>

      <div className="flex items-center gap-0.5 md:ml-3">
        <IconButton label="Undo (Ctrl+Z)" onClick={onUndo} disabled={!canUndo} className="max-md:size-11">
          <ArrowArcLeftIcon size={17} aria-hidden />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={onRedo} disabled={!canRedo} className="max-md:hidden">
          <ArrowArcRightIcon size={17} aria-hidden />
        </IconButton>
      </div>

      <div className="hidden items-center gap-0.5 md:flex" role="group" aria-label="Zoom">
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <IconButton label="Zoom out" onClick={() => onZoom(ZOOMS[zi - 1] ?? zoom)} disabled={zi <= 0}>
          <MagnifyingGlassMinusIcon size={17} aria-hidden />
        </IconButton>
        <button
          type="button"
          onClick={() => onZoom(1)}
          title="Reset zoom"
          className="h-7 min-w-12 rounded-xs border border-border px-1.5 text-xs tabular-nums text-foreground-secondary hover:border-border-strong"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label="Zoom in" onClick={() => onZoom(ZOOMS[zi + 1] ?? zoom)} disabled={zi >= ZOOMS.length - 1}>
          <MagnifyingGlassPlusIcon size={17} aria-hidden />
        </IconButton>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
        <Chip tone="outline" size="md" className="hidden xl:inline-flex">
          Staff only until published
        </Chip>
        <Button
          variant="outline"
          className="hidden sm:inline-flex"
          onClick={() =>
            toast("Share link copied", {
              description: "Staff with the link can view and comment. Players can't open it.",
            })
          }
        >
          <ShareNetworkIcon aria-hidden /> Share
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 lg:hidden"
          aria-label="Details and ClinIQ"
          onClick={onDetails}
        >
          <SlidersHorizontalIcon aria-hidden />
        </Button>
        <Button onClick={onPublish} className="max-md:h-11">
          Publish
        </Button>
      </div>
    </header>
  )
}
