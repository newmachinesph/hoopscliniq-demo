"use client"

import {
  ArrowUpRightIcon,
  CursorIcon,
  HandshakeIcon,
  type Icon,
  LineSegmentIcon,
  PaperPlaneTiltIcon,
  TextTIcon,
  UserCircleIcon,
  WaveSineIcon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

export type ToolKey = "select" | "player" | "cut" | "dribble" | "pass" | "screen" | "handoff" | "text"

export interface ToolDef {
  key: ToolKey
  label: string
  Icon: Icon
  shortcut: string
  hint: string
}

export const tools: ToolDef[] = [
  {
    key: "select",
    label: "Select",
    Icon: CursorIcon,
    shortcut: "1",
    hint: "Click a player to select him, drag to move.",
  },
  {
    key: "player",
    label: "Player",
    Icon: UserCircleIcon,
    shortcut: "2",
    hint: "Click the court to place the next player.",
  },
  { key: "cut", label: "Cut", Icon: ArrowUpRightIcon, shortcut: "3", hint: "Drag from a player to where he cuts." },
  {
    key: "dribble",
    label: "Dribble",
    Icon: WaveSineIcon,
    shortcut: "4",
    hint: "Drag from the ball handler along the drive.",
  },
  {
    key: "pass",
    label: "Pass",
    Icon: PaperPlaneTiltIcon,
    shortcut: "5",
    hint: "Drag from the ball handler to a teammate.",
  },
  {
    key: "screen",
    label: "Screen",
    Icon: LineSegmentIcon,
    shortcut: "6",
    hint: "Drag from the screener to the screen spot.",
  },
  {
    key: "handoff",
    label: "Handoff",
    Icon: HandshakeIcon,
    shortcut: "7",
    hint: "Drag from the ball handler to the teammate.",
  },
  { key: "text", label: "Text", Icon: TextTIcon, shortcut: "8", hint: "Click the court to write this frame's note." },
]

/** Floating vertical pill on desktop (DIRECTION "Tool rail"); a horizontal tray on phone. */
export function ToolRail({
  tool,
  onTool,
  orientation = "vertical",
  className,
}: {
  tool: ToolKey
  onTool: (tool: ToolKey) => void
  orientation?: "vertical" | "horizontal"
  className?: string
}) {
  const vertical = orientation === "vertical"
  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      aria-orientation={orientation}
      className={cn(
        "flex gap-1",
        vertical ? "w-11 flex-col items-center rounded-lg border border-border bg-surface-1 p-0.5 shadow-2" : "",
        className,
      )}
    >
      {tools.map(({ key, label, Icon, shortcut }) => {
        const active = tool === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={`${label} (${shortcut})`}
            title={`${label} · ${shortcut}`}
            aria-keyshortcuts={shortcut}
            onClick={() => onTool(key)}
            className={cn(
              "relative grid shrink-0 place-items-center rounded-sm transition-colors duration-[var(--duration-fast)]",
              vertical ? "size-10" : "size-11",
              active
                ? "bg-brand-navy text-white dark:bg-surface-3 dark:text-foreground dark:ring-1 dark:ring-border-strong"
                : "text-foreground-secondary hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon size={19} weight={active ? "bold" : "regular"} aria-hidden />
            <span
              className="absolute right-1 bottom-0.5 text-[0.5625rem] leading-none tabular-nums opacity-60"
              aria-hidden
            >
              {shortcut}
            </span>
          </button>
        )
      })}
    </div>
  )
}
