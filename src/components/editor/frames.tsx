"use client"

import { CaretLeftIcon, PlusIcon } from "@phosphor-icons/react"

import { IconButton } from "@/components/ui/icon-button"
import type { PlaybookPlay } from "@/data/plays"
import { CourtPlay } from "@/lib/play-engine/court-play"
import { cn } from "@/lib/utils"

/** Left pane (240px, collapsible): every frame as a thumbnail with its note. */
export function FramesPane({
  play,
  frame,
  onSeek,
  onAdd,
  onCollapse,
}: {
  play: PlaybookPlay
  frame: number
  onSeek: (frame: number) => void
  onAdd: () => void
  onCollapse: () => void
}) {
  return (
    <aside
      aria-label="Frames"
      className="hidden w-[var(--editor-left)] shrink-0 flex-col border-r border-border bg-surface-1 lg:flex"
    >
      <div className="flex items-center gap-1 px-3 pt-3 pb-2">
        <h2 className="text-xs font-semibold text-muted-foreground">Frames</h2>
        <span className="text-xs text-muted-foreground tabular-nums">{play.frames.length}</span>
        <IconButton label="Add frame" size="sm" className="ml-auto" onClick={onAdd}>
          <PlusIcon size={15} aria-hidden />
        </IconButton>
        <IconButton label="Hide frames" size="sm" onClick={onCollapse}>
          <CaretLeftIcon size={15} aria-hidden />
        </IconButton>
      </div>
      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {play.frames.map((f, i) => {
          const active = frame === i
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSeek(i)}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "w-full rounded-md border p-1.5 text-left transition-colors",
                  active ? "border-brand-orange bg-selection-tint" : "border-border hover:border-border-strong",
                )}
              >
                <div className="flex gap-2">
                  <span
                    className={cn(
                      "w-3 text-xs font-semibold tabular-nums",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {i + 1}
                  </span>
                  <Thumb play={play} frame={i} />
                </div>
                {f.note && (
                  <p className="mt-1.5 line-clamp-2 pl-5 text-[0.6875rem] leading-snug text-muted-foreground">
                    {f.note}
                  </p>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

function Thumb({ play, frame, className }: { play: PlaybookPlay; frame: number; className?: string }) {
  return (
    <CourtPlay
      play={play}
      frame={frame}
      tags={false}
      title={`Frame ${frame + 1}`}
      className={cn("block h-auto w-full rounded-xs", className)}
    />
  )
}

/** Phone: an 88px strip of frames above the tool tray (DIRECTION "Editor", phone). */
export function FrameStrip({
  play,
  frame,
  onSeek,
  onAdd,
}: {
  play: PlaybookPlay
  frame: number
  onSeek: (frame: number) => void
  onAdd: () => void
}) {
  return (
    <nav
      aria-label="Frames"
      className="flex h-[88px] shrink-0 items-center gap-2 overflow-x-auto border-t border-border bg-surface-1 px-3 md:hidden"
    >
      {play.frames.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSeek(i)}
          aria-current={frame === i ? "step" : undefined}
          aria-label={`Frame ${i + 1}`}
          className={cn(
            "relative w-[68px] shrink-0 rounded-sm border p-0.5",
            frame === i ? "border-brand-orange bg-selection-tint" : "border-border",
          )}
        >
          <Thumb play={play} frame={i} />
          <span className="absolute top-1 left-1 rounded-xs bg-surface-1/90 px-1 text-[0.625rem] font-semibold tabular-nums">
            {i + 1}
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add frame"
        className="grid size-11 shrink-0 place-items-center rounded-sm border border-dashed border-border-strong text-foreground-secondary"
      >
        <PlusIcon size={18} aria-hidden />
      </button>
    </nav>
  )
}
