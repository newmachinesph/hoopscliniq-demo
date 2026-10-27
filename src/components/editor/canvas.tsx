"use client"

import * as React from "react"
import type { PlaybookPlay } from "@/data/plays"
import { CourtPlay } from "@/lib/play-engine/court-play"
import type { Action, Point } from "@/lib/play-engine/types"
import { cn } from "@/lib/utils"
import { isPhone, nearestPlayer, spotName, toCourt, VIEW } from "./play-edits"
import { type ToolKey, tools } from "./tools"

type DrawKind = "cut" | "dribble" | "pass" | "screen" | "handoff"

interface Draft {
  kind: DrawKind
  p: number
  from: Point
  to: Point
}

export interface CanvasProps {
  play: PlaybookPlay
  frame: number
  t: number
  showDefense: boolean
  selected: number | null
  tool: ToolKey
  zoom: number
  /** Pause playback and snap to the current frame so it can be edited. */
  onEdit: () => void
  onSelect: (p: number | null) => void
  onDragStart: () => void
  onDrag: (p: number, to: Point) => void
  onPlace: (at: Point) => void
  onDraw: (action: Action, mover: number, receiver?: number) => void
  onNote: () => void
  onBlocked: (message: string) => void
}

const label = (kind: DrawKind) => tools.find((t) => t.key === kind)?.label.toLowerCase() ?? kind

/**
 * The court canvas: the clipboard court large, on a plain wrapper (DIRECTION "Court canvas"), with pointer editing.
 * The court itself never changes with the theme; only the wrapper does.
 */
export function CourtCanvas({
  play,
  frame,
  t,
  showDefense,
  selected,
  tool,
  zoom,
  onEdit,
  onSelect,
  onDragStart,
  onDrag,
  onPlace,
  onDraw,
  onNote,
  onBlocked,
}: CanvasProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [draft, setDraft] = React.useState<Draft | null>(null)
  const drag = React.useRef<{ p: number; moved: boolean } | null>(null)
  const current = play.frames[frame]
  const points = current?.offense ?? []

  const courtPoint = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? toCourt(e.clientX, e.clientY, rect) : null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !current) return
    const at = courtPoint(e)
    if (!at) return
    onEdit()
    const hit = nearestPlayer(points, at)
    if (tool === "select") {
      onSelect(hit)
      if (hit !== null) {
        drag.current = { p: hit, moved: false }
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      return
    }
    if (tool === "player") {
      onPlace(at)
      return
    }
    if (tool === "text") {
      onNote()
      return
    }
    if (hit === null) {
      onBlocked(
        points.length === 0
          ? `Place players first: ${isPhone() ? "tap the player tool" : "press 2"}.`
          : `Start the ${label(tool)} on a player.`,
      )
      return
    }
    if ((tool === "pass" || tool === "handoff" || tool === "dribble") && hit !== current.ball) {
      onBlocked(`Only ${current.ball + 1} has the ball in frame ${frame + 1}. Start the ${label(tool)} there.`)
      return
    }
    onSelect(hit)
    setDraft({ kind: tool, p: hit, from: points[hit] as Point, to: at })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current && !draft) return
    const at = courtPoint(e)
    if (!at) return
    if (drag.current) {
      if (!drag.current.moved) {
        drag.current.moved = true
        onDragStart()
      }
      onDrag(drag.current.p, at)
      return
    }
    setDraft((d) => (d ? { ...d, to: at } : d))
  }

  const finish = () => {
    drag.current = null
    if (!draft) return
    setDraft(null)
    const { kind, p, from, to } = draft
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 12) return
    if (kind === "pass" || kind === "handoff") {
      const receiver = nearestPlayer(
        points.map((q, i) => (i === p ? ([-999, -999] as Point) : q)),
        to,
        44,
      )
      if (receiver === null) {
        onBlocked(`End the ${label(kind)} on a teammate.`)
        return
      }
      onDraw({ kind, from, to: points[receiver] as Point }, p, receiver)
      return
    }
    onDraw({ kind, from, to }, p)
  }

  const hint = tools.find((x) => x.key === tool)?.hint ?? ""
  const cursor = tool === "select" ? "cursor-default" : tool === "text" ? "cursor-text" : "cursor-crosshair"

  return (
    <div className="mx-auto w-full" style={{ maxWidth: `${Math.round(680 * zoom)}px` }}>
      <div
        ref={ref}
        role="application"
        aria-label={`Court, frame ${frame + 1} of ${play.frames.length}. ${hint}`}
        aria-describedby="court-description"
        className={cn("relative touch-none select-none", cursor)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={() => {
          drag.current = null
          setDraft(null)
        }}
      >
        <CourtPlay
          play={play}
          frame={frame}
          t={t}
          showDefense={showDefense}
          selected={selected}
          className="block h-auto w-full rounded-md shadow-2"
        />
        {draft && (
          <svg
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden
          >
            <line
              x1={draft.from[0]}
              y1={draft.from[1]}
              x2={draft.to[0]}
              y2={draft.to[1]}
              stroke="var(--court-lines)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray={
                draft.kind === "pass" || draft.kind === "handoff"
                  ? "10 9"
                  : draft.kind === "dribble"
                    ? "3 6"
                    : undefined
              }
              opacity={0.75}
            />
            <circle cx={draft.to[0]} cy={draft.to[1]} r={5} fill="var(--court-lines)" opacity={0.75} />
          </svg>
        )}
        {points.length === 0 && (
          <p className="pointer-events-none absolute inset-x-4 top-[58%] text-center text-sm font-semibold text-court-lines">
            <span className="md:hidden">
              Blank half court. Tap the player tool, then tap the court to place 1 to 5.
            </span>
            <span className="max-md:hidden">Blank half court. Press 2, then click to place players 1 to 5.</span>
          </p>
        )}
      </div>
      <CourtDescription play={play} frame={frame} />
    </div>
  )
}

/** Text list of players and actions for screen readers (DIRECTION "Court canvas"). */
function CourtDescription({ play, frame }: { play: PlaybookPlay; frame: number }) {
  const f = play.frames[frame]
  if (!f) return null
  return (
    <div id="court-description" className="sr-only">
      <p>{f.note}</p>
      <ul>
        {f.offense.map((p, i) => (
          <li key={i}>
            Player {i + 1} at the {spotName(p)}
            {f.ball === i ? ", with the ball" : ""}
          </li>
        ))}
        {f.actions.map((a, i) => (
          <li key={`a${i}`}>
            {a.kind} from the {spotName(a.from)} to the {spotName(a.to)}
          </li>
        ))}
      </ul>
    </div>
  )
}
