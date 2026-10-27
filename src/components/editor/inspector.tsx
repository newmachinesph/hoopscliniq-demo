"use client"

import { TrashIcon } from "@phosphor-icons/react"
import * as React from "react"

import { IconButton } from "@/components/ui/icon-button"
import { Segmented } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { PlaybookPlay } from "@/data/plays"
import type { Action, Point } from "@/lib/play-engine/types"
import { cn } from "@/lib/utils"
import { CliniqTab } from "./cliniq-tab"
import { FilmTab } from "./film-tab"
import { FRAME_SECONDS, ROLE_NAMES, spotName } from "./play-edits"
import { tools } from "./tools"
import { SPEEDS, type Speed } from "./transport"

export type InspectorTab = "design" | "animate" | "cliniq" | "film"

export interface InspectorProps {
  play: PlaybookPlay
  frame: number
  selected: number | null
  onSelect: (p: number | null) => void
  showDefense: boolean
  onShowDefense: (show: boolean) => void
  onNote: (note: string) => void
  onMove: (p: number, to: Point) => void
  onRemoveAction: (index: number) => void
  speed: Speed
  onSpeed: (speed: Speed) => void
  loop: boolean
  onLoop: (loop: boolean) => void
  tab: InspectorTab
  onTab: (tab: InspectorTab) => void
  noteId: string
  noteRef: React.RefObject<HTMLTextAreaElement | null>
}

const sectionTitle = "text-xs font-semibold text-muted-foreground"
const near = (a: Point | undefined, b: Point) => !!a && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1

function describe(action: Action, play: PlaybookPlay, frame: number): string {
  const f = play.frames[frame]
  const mover = f ? f.offense.findIndex((p) => near(p, action.from)) : -1
  const who = mover >= 0 ? String(mover + 1) : "Player"
  const spot = spotName(action.to)
  if (action.kind === "pass" || action.kind === "handoff") {
    const next = play.frames[frame + 1]
    const receiver = next ? next.offense.findIndex((p) => near(p, action.to)) : -1
    const verb = action.kind === "pass" ? "passes" : "hands off"
    return receiver >= 0 ? `${who} ${verb} to ${receiver + 1}` : `${who} ${verb} to the ${spot}`
  }
  if (action.kind === "screen") return `${who} screens at the ${spot}`
  if (action.kind === "dribble") return `${who} drives to the ${spot}`
  return `${who} cuts to the ${spot}`
}

/** Inspector, 280px (320px at 1440+): Design / Animate, plus ClinIQ and Film for this play. */
export function Inspector(props: InspectorProps) {
  const { play, tab, onTab } = props
  return (
    <Tabs value={tab} onValueChange={(v) => onTab(v as InspectorTab)} className="flex min-h-0 flex-1 flex-col gap-0">
      <TabsList
        variant="line"
        className="h-10 w-full shrink-0 justify-start gap-0 rounded-none border-b border-border px-2"
      >
        <TabsTrigger value="design">Design</TabsTrigger>
        <TabsTrigger value="animate">Animate</TabsTrigger>
        <TabsTrigger value="cliniq">ClinIQ</TabsTrigger>
        <TabsTrigger value="film">
          Film
          {play.clips.length > 0 && (
            <span className="text-[0.6875rem] text-muted-foreground tabular-nums">{play.clips.length}</span>
          )}
        </TabsTrigger>
      </TabsList>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <TabsContent value="design">
          <DesignTab {...props} />
        </TabsContent>
        <TabsContent value="animate">
          <AnimateTab {...props} />
        </TabsContent>
        <TabsContent value="cliniq">
          <CliniqTab play={play} />
        </TabsContent>
        <TabsContent value="film">
          <FilmTab play={play} />
        </TabsContent>
      </div>
    </Tabs>
  )
}

function DesignTab({
  play,
  frame,
  selected,
  onSelect,
  showDefense,
  onShowDefense,
  onNote,
  onMove,
  onRemoveAction,
  noteId,
  noteRef,
}: InspectorProps) {
  const f = play.frames[frame]
  if (!f) return null
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className={sectionTitle}>Frame</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {frame + 1} of {play.frames.length}
          </span>
        </div>
        <label htmlFor={noteId} className="sr-only">
          Note for frame {frame + 1}
        </label>
        <NoteField
          key={`${frame}-${f.note ?? ""}`}
          id={noteId}
          value={f.note ?? ""}
          onCommit={onNote}
          inputRef={noteRef}
        />
      </section>

      <section className="space-y-2">
        <h3 className={sectionTitle}>Players</h3>
        {f.offense.length === 0 ? (
          <p className="text-xs text-muted-foreground">No players yet. Pick the Player tool (2) and click the court.</p>
        ) : (
          <ul className="space-y-1">
            {f.offense.map((p, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-sm border p-1.5 transition-colors",
                  selected === i ? "border-selection bg-surface-2" : "border-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(selected === i ? null : i)}
                  aria-pressed={selected === i}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-navy text-xs font-semibold text-white tabular-nums dark:bg-surface-3 dark:text-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{ROLE_NAMES[i]}</span>
                    <span className="block truncate text-[0.6875rem] text-muted-foreground">
                      {spotName(p)}
                      {f.ball === i ? " · ball" : ""}
                    </span>
                  </span>
                </button>
                {selected === i && (
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {(["X", "Y"] as const).map((axis, k) => (
                      <label
                        key={axis}
                        className="flex h-7 items-center gap-1.5 rounded-sm border border-input px-2 text-xs focus-within:ring-2 focus-within:ring-ring"
                      >
                        <span className="text-muted-foreground">{axis}</span>
                        <input
                          type="number"
                          step={0.5}
                          value={(p[k] ?? 0) / 10}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            if (Number.isNaN(v)) return
                            const next: Point = k === 0 ? [Math.round(v * 10), p[1]] : [p[0], Math.round(v * 10)]
                            onMove(i, next)
                          }}
                          className="w-full min-w-0 bg-transparent text-right tabular-nums outline-none"
                          aria-label={`Player ${i + 1} ${axis} in feet`}
                        />
                        <span className="text-muted-foreground">ft</span>
                      </label>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className={sectionTitle}>Actions in frame {frame + 1}</h3>
        {f.actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">None. Draw a cut, dribble, pass or screen on the court.</p>
        ) : (
          <ul className="space-y-0.5">
            {f.actions.map((a, i) => {
              const Icon = tools.find((t) => t.key === a.kind)?.Icon
              return (
                <li key={i} className="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-accent">
                  {Icon && <Icon size={15} className="shrink-0 text-foreground-secondary" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate text-sm">{describe(a, play, frame)}</span>
                  <IconButton label="Remove action" size="sm" onClick={() => onRemoveAction(i)}>
                    <TrashIcon size={14} aria-hidden />
                  </IconButton>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className={sectionTitle}>Court</h3>
        <div className="flex items-center justify-between text-sm">
          <label htmlFor={`${noteId}-defense`}>Show defense</label>
          <Switch
            id={`${noteId}-defense`}
            checked={showDefense}
            onCheckedChange={onShowDefense}
            className="data-checked:bg-foreground"
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          Court
          <span className="text-foreground-secondary">Half court · High school</span>
        </div>
      </section>
    </div>
  )
}

function NoteField({
  id,
  value,
  onCommit,
  inputRef,
}: {
  id: string
  value: string
  onCommit: (note: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement | null>
}) {
  const [draft, setDraft] = React.useState(value)
  return (
    <Textarea
      ref={inputRef}
      id={id}
      value={draft}
      rows={3}
      placeholder="What happens in this frame? Players read this note."
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      className="min-h-20 resize-none text-sm"
    />
  )
}

function AnimateTab({ play, speed, onSpeed, loop, onLoop, noteId }: InspectorProps) {
  const transitions = play.frames.length - 1
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className={sectionTitle}>Speed</h3>
        <Segmented<string>
          label="Playback speed"
          value={String(speed)}
          onChange={(v) => onSpeed(Number(v) as Speed)}
          options={SPEEDS.map((s) => ({ value: String(s), label: `${s}x` }))}
          className="w-full [&>button]:flex-1"
        />
      </section>
      <section className="space-y-2">
        <h3 className={sectionTitle}>Playback</h3>
        <div className="flex items-center justify-between text-sm">
          <label htmlFor={`${noteId}-loop`}>Loop</label>
          <Switch
            id={`${noteId}-loop`}
            checked={loop}
            onCheckedChange={onLoop}
            className="data-checked:bg-foreground"
          />
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Per frame</dt>
            <dd className="tabular-nums">{(FRAME_SECONDS / speed).toFixed(2)}s</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="tabular-nums">{((transitions * FRAME_SECONDS) / speed).toFixed(1)}s</dd>
          </div>
        </dl>
        {transitions === 0 && (
          <p className="text-xs text-muted-foreground">One frame: draw an action or add a frame to animate.</p>
        )}
      </section>
      <section className="space-y-1.5">
        <h3 className={sectionTitle}>Keys</h3>
        <ul className="space-y-1 text-xs text-foreground-secondary">
          {[
            ["Space", "Play or pause"],
            ["← →", "Step a frame"],
            ["1–8", "Tools"],
            ["Ctrl Z", "Undo"],
          ].map(([key, what]) => (
            <li key={key} className="flex justify-between">
              <span>{what}</span>
              <kbd className="rounded-xs border border-border bg-surface-2 px-1 font-sans text-[0.6875rem]">{key}</kbd>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
