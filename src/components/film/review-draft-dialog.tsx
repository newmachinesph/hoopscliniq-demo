"use client"

import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  SparkleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CLIP_TO_PLAY_CREDITS, type ClipDraft, type DraftAction, type DraftActionType } from "@/data/film"
import { confidenceLabel } from "@/lib/confidence"
import { dnaPlays } from "@/lib/play-dna"
import { ClipboardPlay } from "@/lib/play-engine/clipboard-play"
import { cn } from "@/lib/utils"
import { useFilmRoom } from "./film-room-context"
import { hatch } from "./styles"

const ACTION_TYPES: DraftActionType[] = [
  "Ball screen",
  "Back screen",
  "Stagger screen",
  "Roll",
  "Drive",
  "Cut",
  "Pass",
  "Shot",
]
const CHECK_BELOW = 0.7

type Decision = "pending" | "confirmed" | "dismissed"
interface Row extends DraftAction {
  decision: Decision
  coachMade?: boolean
}

/**
 * Review a clip-to-play draft (P1-18): the play beside its actions, each with a confidence. Low ones say "Check this".
 * Nothing is confirmed by default, and Save asks about anything still undecided.
 */
export function ReviewDraftDialog({
  draft,
  open,
  onOpenChange,
}: {
  draft: ClipDraft | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { film, saveDraft } = useFilmRoom()
  const router = useRouter()
  // The call site keys this by draft, so each draft starts fresh without a reset effect.
  const [rows, setRows] = React.useState<Row[]>(() =>
    (draft?.actions ?? []).map((a) => ({ ...a, decision: "pending" as const })),
  )
  const [title, setTitle] = React.useState(draft?.title ?? "")
  const [flipped, setFlipped] = React.useState(false)
  const [editing, setEditing] = React.useState<string | null>(null)
  const [askRest, setAskRest] = React.useState(false)

  if (!draft) return null
  const dna = dnaPlays.find((d) => d.id === draft.dna)
  const pending = rows.filter((r) => r.decision === "pending").length
  const decide = (id: string, decision: Decision) =>
    setRows((list) => list.map((r) => (r.id === id ? { ...r, decision } : r)))
  const decideAll = (decision: Decision) =>
    setRows((list) => list.map((r) => (r.decision === "pending" ? { ...r, decision } : r)))

  const save = () => {
    if (pending > 0) {
      setAskRest(true)
      return
    }
    saveDraft(draft.id, title.trim() || draft.title)
    onOpenChange(false)
    toast.success("Saved to your playbook", {
      description: `${title.trim() || draft.title} · ${rows.filter((r) => r.decision === "confirmed").length} actions, reviewed by you`,
      action: { label: "Open", onClick: () => router.push(draft.href) },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Review draft play
            <Chip tone="outline">
              <SparkleIcon size={11} weight="fill" aria-hidden /> Draft
            </Chip>
          </DialogTitle>
          <DialogDescription>
            Clip to play (Beta) drafted this from a {draft.clipLength} s clip of {film.title}. Place and fix the
            players, confirm, fix or dismiss each action, then save. Not yet tested on real amateur footage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md bg-court-wrapper p-2">
              {dna && (
                <div className={cn("transition-transform", flipped && "rotate-180")}>
                  <ClipboardPlay play={dna.play} labels={dna.labels} className="mx-auto block max-h-[46svh] w-full" />
                </div>
              )}
            </div>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI Switch renders its control inside the label */}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={flipped} onCheckedChange={setFlipped} size="sm" />
              {flipped ? "Attacking the bottom basket (flipped)" : "Attacking the top basket (draft's guess)"}
            </label>
            <div className="rounded-sm bg-ai-surface p-3 text-sm">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ai-mark">
                <SparkleIcon size={14} weight="fill" aria-hidden /> ClinIQ quality check
                <span className="ml-auto tabular-nums text-foreground-secondary">{draft.quality}/100</span>
              </p>
              {draft.issues.length > 0 ? (
                <ul className="mt-2 space-y-1 text-foreground-secondary">
                  {draft.issues.map((issue) => (
                    <li key={issue} className="flex items-start gap-1.5">
                      <WarningIcon size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                      {issue}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-foreground-secondary">All 10 players placed for the whole clip.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Quality is Good, Fair or Poor, based on how many frames have all 10 players placed. Sample values in the
                preview; it's a draft, never final.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="draft-title">Play name</Label>
              <Input
                id="draft-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 sm:h-8"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Detected actions <span className="font-normal text-muted-foreground tabular-nums">({rows.length})</span>
              </h3>
              {pending > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{pending} waiting for you</span>
              )}
            </div>
            <ol className="space-y-1.5">
              {rows.map((row) => (
                <ActionRow
                  key={row.id}
                  row={row}
                  editing={editing === row.id}
                  onEdit={() => setEditing(editing === row.id ? null : row.id)}
                  onDecide={(d) => {
                    decide(row.id, d)
                    setAskRest(false)
                  }}
                  onChange={(patch) =>
                    setRows((list) =>
                      list.map((r) => (r.id === row.id ? { ...r, ...patch, decision: "confirmed" } : r)),
                    )
                  }
                />
              ))}
            </ol>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const id = `${draft.id}-coach-${rows.length + 1}`
                setRows((list) => [
                  ...list,
                  { id, type: "Cut", who: "", at: 0, confidence: 1, decision: "confirmed", coachMade: true },
                ])
                setEditing(id)
              }}
            >
              <PlusIcon aria-hidden /> Add an action ClinIQ missed
            </Button>
          </div>
        </div>

        {askRest && pending > 0 && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-md border border-warning/40 bg-warning/8 p-3 text-sm"
          >
            <WarningIcon size={16} className="text-warning" aria-hidden />
            <span className="mr-auto">
              {pending} {pending === 1 ? "suggestion still needs" : "suggestions still need"} a decision. Nothing is
              saved as confirmed by default.
            </span>
            <Button size="sm" variant="secondary" onClick={() => decideAll("confirmed")}>
              <CheckIcon aria-hidden className="text-success" /> Confirm the rest
            </Button>
            <Button size="sm" variant="ghost" onClick={() => decideAll("dismissed")}>
              Dismiss the rest
            </Button>
          </div>
        )}

        <DialogFooter className="sm:items-center">
          <p className="mr-auto text-xs text-muted-foreground">
            Drafting cost <span className="tabular-nums">{CLIP_TO_PLAY_CREDITS}</span> credits, charged once. Saving is
            free. Players see the play, not the clip.
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep as draft
          </Button>
          <Button onClick={save}>Save to playbook</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ActionRow({
  row,
  editing,
  onEdit,
  onDecide,
  onChange,
}: {
  row: Row
  editing: boolean
  onEdit: () => void
  onDecide: (d: Decision) => void
  onChange: (patch: Partial<Row>) => void
}) {
  const low = row.confidence < CHECK_BELOW
  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-sm border border-border bg-surface-1 py-2 pr-2 pl-4",
        row.decision === "dismissed" && "opacity-60",
      )}
    >
      {row.decision === "pending" && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", hatch)} />}
      {row.decision === "confirmed" && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-success" />}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", row.decision === "dismissed" && "line-through")}>
            {row.type}
            {row.who && <span className="font-normal text-foreground-secondary"> · {row.who}</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            0:{row.at.toFixed(1).padStart(4, "0")}
            {row.coachMade ? (
              <Chip tone="neutral">Added by you</Chip>
            ) : low ? (
              <Chip tone="warning">
                <WarningIcon size={10} weight="bold" aria-hidden /> Check this · {confidenceLabel(row.confidence * 100)}
              </Chip>
            ) : (
              <Chip tone="outline">{confidenceLabel(row.confidence * 100)} confidence</Chip>
            )}
            {row.decision === "confirmed" && (
              <Chip tone="success">
                <CheckIcon size={10} weight="bold" aria-hidden /> Confirmed
              </Chip>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          {row.decision === "dismissed" ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Undo dismiss"
              className="size-11 sm:size-7"
              onClick={() => onDecide("pending")}
            >
              <ArrowCounterClockwiseIcon aria-hidden />
            </Button>
          ) : (
            <>
              {row.decision === "pending" && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Confirm ${row.type}`}
                  className="size-11 sm:size-7"
                  onClick={() => onDecide("confirmed")}
                >
                  <CheckIcon weight="bold" className="text-success" aria-hidden />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${row.type}`}
                aria-expanded={editing}
                className="size-11 sm:size-7"
                onClick={onEdit}
              >
                <PencilSimpleIcon aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Dismiss ${row.type}`}
                className="size-11 sm:size-7"
                onClick={() => onDecide("dismissed")}
              >
                <XIcon aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
      {editing && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Type
            <select
              value={row.type}
              onChange={(e) => onChange({ type: e.target.value as DraftActionType })}
              className="h-11 rounded-sm border border-input bg-surface-1 px-2 text-sm text-foreground sm:h-8"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Players
            <input
              value={row.who}
              onChange={(e) => onChange({ who: e.target.value })}
              placeholder="e.g. 4 for 2"
              className="h-11 rounded-sm border border-input bg-surface-1 px-2 text-sm text-foreground sm:h-8"
            />
          </label>
        </div>
      )}
    </li>
  )
}
