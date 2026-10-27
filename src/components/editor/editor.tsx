"use client"

import { CaretRightIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { IconButton } from "@/components/ui/icon-button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { PlaybookPlay } from "@/data/plays"
import { studiedLabel } from "@/data/plays"
import { usePlayback } from "@/lib/play-engine/court-play"
import type { Action, Point } from "@/lib/play-engine/types"
import { CourtCanvas } from "./canvas"
import { FrameStrip, FramesPane } from "./frames"
import { Inspector, type InspectorTab } from "./inspector"
import {
  addAction,
  addPlayer,
  deleteFrame,
  duplicateFrame,
  insertFrame,
  isPhone,
  movePlayer,
  removeAction,
  setNote,
} from "./play-edits"
import { PublishDialog } from "./publish-dialog"
import { Timeline } from "./timeline"
import { type ToolKey, ToolRail, tools } from "./tools"
import { TopBar } from "./top-bar"
import { type Speed, Transport } from "./transport"
import { useHistory } from "./use-history"

const HINT_ID = "editor-hint"
const WIDE = "(min-width: 1024px)"

/** True when a key event should be left to the focused control instead of the editor shortcuts. */
function ownsKey(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return true
  // Space on a focused button already clicks it; handling it here too would toggle twice.
  if (key === " ")
    return !!target.closest(
      "button, a, [role='button'], [role='slider'], [role='radio'], [role='tab'], [role='switch'], [role='separator']",
    )
  if (key === "ArrowLeft" || key === "ArrowRight") {
    return !!target.closest("[role='slider'], [role='radiogroup'], [role='tablist'], [role='separator']")
  }
  return false
}

/** The play designer: top bar, frames, floating tool rail, court, inspector, docked timeline (DIRECTION "Editor"). */
export function Editor({ initialPlay, isNew = false }: { initialPlay: PlaybookPlay; isNew?: boolean }) {
  const history = useHistory(initialPlay)
  const play = history.value
  const [title, setTitle] = React.useState(initialPlay.title)
  const [speed, setSpeed] = React.useState<Speed>(1)
  const [loop, setLoop] = React.useState(false)
  const playback = usePlayback(play, { speed, loop })
  const [tool, setTool] = React.useState<ToolKey>(isNew ? "player" : "select")
  const [selected, setSelected] = React.useState<number | null>(null)
  const [showDefense, setShowDefense] = React.useState(!isNew)
  const [tab, setTab] = React.useState<InspectorTab>("design")
  const [zoom, setZoom] = React.useState(1)
  const [framesOpen, setFramesOpen] = React.useState(true)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [published, setPublished] = React.useState(initialPlay.assignedTo > 0)
  const panelNote = React.useRef<HTMLTextAreaElement>(null)
  const sheetNote = React.useRef<HTMLTextAreaElement>(null)

  const last = play.frames.length - 1
  const { frame, position, playing } = playback
  const note = play.frames[frame]?.note

  const hint = (message: string) => toast(message, { id: HINT_ID })

  const toggle = () => {
    if (playing) playback.pause()
    else if (last > 0) playback.play()
  }
  const step = (dir: 1 | -1) => {
    playback.pause()
    playback.seek(dir > 0 ? Math.floor(position) + 1 : Math.ceil(position) - 1)
  }
  const goTo = (f: number) => {
    playback.pause()
    playback.seek(f)
  }
  // Seek after the next render, once a just-added frame exists (seek clamps to the frames it knows about).
  const [pendingSeek, setPendingSeek] = React.useState<number | null>(null)
  const seekRef = React.useRef(playback.seek)
  React.useEffect(() => {
    seekRef.current = playback.seek
  })
  React.useEffect(() => {
    if (pendingSeek === null) return
    seekRef.current(pendingSeek)
    setPendingSeek(null)
  }, [pendingSeek])
  const goToSoon = (f: number) => {
    playback.pause()
    setPendingSeek(f)
  }
  const ensureEditable = () => {
    if (playing || playback.t > 0) goTo(frame)
  }

  const pickTool = (key: ToolKey) => {
    setTool(key)
    const def = tools.find((t) => t.key === key)
    if (def && key !== "select") hint(`${def.label}: ${def.hint}`)
  }

  const focusNote = () => {
    setTab("design")
    const wide = window.matchMedia(WIDE).matches
    if (!wide) setDetailsOpen(true)
    // Wait for the tab (and on phone, the sheet) to render before focusing.
    window.setTimeout(() => (wide ? panelNote : sheetNote).current?.focus(), wide ? 0 : 250)
  }

  const onPlace = (at: Point) => {
    const next = addPlayer(play, at)
    if (!next) {
      hint(`All five players are on the court. ${isPhone() ? "Tap the select tool" : "Press 1"} to move them.`)
      return
    }
    history.apply(() => next)
    const count = next.frames[0]?.offense.length ?? 0
    if (count === 5) {
      setTool("select")
      hint(
        isPhone()
          ? "Five on the court. Draw the first action: tap Cut or Pass."
          : "Five on the court. Draw the first action: 3 for a cut, 5 for a pass.",
      )
    }
  }

  const onDraw = (action: Action, mover: number, receiver?: number) => {
    history.apply((p) => addAction(p, frame, action, mover, receiver))
  }

  // Shortcuts read the latest handlers through a ref, so the listener is bound once instead of on every frame.
  const keys = React.useRef({ toggle, step, pickTool, undo: history.undo, redo: history.redo })
  React.useEffect(() => {
    keys.current = { toggle, step, pickTool, undo: history.undo, redo: history.redo }
  })
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (ownsKey(e.target, e.key)) return
        const key = e.key.toLowerCase()
        if (key === "z") {
          e.preventDefault()
          if (e.shiftKey) k.redo()
          else k.undo()
        } else if (key === "y") {
          e.preventDefault()
          k.redo()
        }
        return
      }
      if (e.altKey || ownsKey(e.target, e.key)) return
      if (e.key === " ") {
        e.preventDefault()
        k.toggle()
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        k.step(e.key === "ArrowRight" ? 1 : -1)
      } else {
        const t = tools.find((x) => x.shortcut === e.key)
        if (t) k.pickTool(t.key)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const status = `${published ? `Published · ${studiedLabel(play)} studied` : "Draft"} · ${
    history.canUndo ? "Saved just now" : `Edited ${initialPlay.edited}`
  }`

  const inspectorProps = {
    play,
    frame,
    selected,
    onSelect: setSelected,
    showDefense,
    onShowDefense: setShowDefense,
    onNote: (text: string) => history.apply((p) => setNote(p, frame, text)),
    onMove: (p: number, to: Point) => history.apply((pl) => movePlayer(pl, frame, p, to)),
    onRemoveAction: (i: number) => history.apply((p) => removeAction(p, frame, i)),
    speed,
    onSpeed: setSpeed,
    loop,
    onLoop: setLoop,
    tab,
    onTab: setTab,
  }

  const addFrame = () => {
    history.apply((p) => insertFrame(p, frame))
    goToSoon(frame + 1)
  }

  return (
    <div className="flex h-[calc(100svh-2rem)] flex-col overflow-hidden bg-background">
      <TopBar
        title={title}
        onTitle={setTitle}
        status={status}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        zoom={zoom}
        onZoom={setZoom}
        onPublish={() => setPublishOpen(true)}
        onDetails={() => setDetailsOpen(true)}
      />

      <div className="flex min-h-0 flex-1">
        {framesOpen && (
          <FramesPane
            play={play}
            frame={frame}
            onSeek={goTo}
            onAdd={addFrame}
            onCollapse={() => setFramesOpen(false)}
          />
        )}

        <div className="relative min-w-0 flex-1">
          <main id="main" className="absolute inset-0 overflow-auto bg-court-wrapper">
            <div className="flex min-h-full items-center justify-center px-3 pt-4 pb-24 md:pt-6 md:pr-6 md:pl-20">
              <div className="w-full">
                <CourtCanvas
                  play={play}
                  frame={frame}
                  t={playback.t}
                  showDefense={showDefense}
                  selected={selected}
                  tool={tool}
                  zoom={zoom}
                  onEdit={ensureEditable}
                  onSelect={setSelected}
                  onDragStart={history.checkpoint}
                  onDrag={(p, to) => history.preview((pl) => movePlayer(pl, frame, p, to))}
                  onPlace={onPlace}
                  onDraw={onDraw}
                  onNote={focusNote}
                  onBlocked={hint}
                />
                <p
                  className="mx-auto mt-3 min-h-10 max-w-[560px] text-center text-sm text-foreground-secondary"
                  aria-live="polite"
                >
                  <span className="font-semibold text-foreground tabular-nums">
                    Frame {frame + 1} of {play.frames.length}.
                  </span>{" "}
                  {note || (
                    <span className="text-muted-foreground">
                      No note yet. <span className="md:hidden">Tap the text tool to write one.</span>
                      <span className="max-md:hidden">Press 8 to write one.</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </main>

          {!framesOpen && (
            <IconButton
              label="Show frames"
              onClick={() => setFramesOpen(true)}
              className="absolute top-3 left-3 z-10 hidden border border-border bg-surface-1 shadow-1 lg:grid"
            >
              <CaretRightIcon size={15} aria-hidden />
            </IconButton>
          )}
          <ToolRail
            tool={tool}
            onTool={pickTool}
            className="absolute top-1/2 left-3 z-10 hidden -translate-y-1/2 md:flex"
          />
          <Transport
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2"
            playing={playing}
            canPlay={last > 0}
            atStart={position <= 0}
            atEnd={position >= last}
            speed={speed}
            loop={loop}
            onToggle={toggle}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
            onSpeed={setSpeed}
            onLoop={() => setLoop((l) => !l)}
          />
        </div>

        <aside
          aria-label="Inspector"
          className="hidden w-[var(--inspector-width)] shrink-0 flex-col border-l border-border bg-surface-1 lg:flex min-[1440px]:w-80"
        >
          <Inspector {...inspectorProps} noteId="frame-note" noteRef={panelNote} />
        </aside>
      </div>

      <Timeline
        play={play}
        position={position}
        frame={frame}
        selected={selected}
        onSeek={playback.seek}
        onScrubStart={playback.pause}
        onAddFrame={addFrame}
        onDuplicateFrame={() => {
          history.apply((p) => duplicateFrame(p, frame))
          goToSoon(frame + 1)
        }}
        onDeleteFrame={() => {
          history.apply((p) => deleteFrame(p, frame))
          goTo(Math.max(0, frame - 1))
        }}
      />

      <FrameStrip play={play} frame={frame} onSeek={goTo} onAdd={addFrame} />
      <div className="shrink-0 overflow-x-auto border-t border-border bg-surface-1 px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
        <ToolRail tool={tool} onTool={pickTool} orientation="horizontal" />
      </div>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="bottom" className="h-[82svh] gap-0 rounded-t-xl p-0 lg:hidden">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm">{title}</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <Inspector {...inspectorProps} noteId="frame-note-sheet" noteRef={sheetNote} />
          </div>
        </SheetContent>
      </Sheet>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={title}
        playId={initialPlay.id}
        onPublished={() => setPublished(true)}
      />
    </div>
  )
}
