"use client"

import { CircleNotchIcon, EyeSlashIcon, SparkleIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Chip } from "@/components/ui/chip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FilmJob, Overlay } from "@/lib/film-job"

const MAX_HIDDEN = 4
const SAVE_TIMEOUT_MS = 70_000
const SAVE_FAILED = "ClinIQ could not hide those players. Try again in a moment."

/** Offense first, then defense, each in id order (o1..o5, d1..d5). */
function trackedPlayers(overlay: Overlay) {
  return Object.entries(overlay.players)
    .map(([id, p]) => ({ id, team: p.team }))
    .sort((a, b) =>
      a.team === b.team ? a.id.localeCompare(b.id, undefined, { numeric: true }) : a.team === "offense" ? -1 : 1,
    )
}

/**
 * The consent mask: pick the tracked players to hide in the clip (a player whose family has not given consent). Save
 * posts the ids and waits for the render (up to a minute), then hands back the refreshed job. Empty selection plus
 * Save shows everyone again.
 */
export function HidePlayersDialog({
  jobId,
  overlay,
  hiddenIds,
  open,
  onOpenChange,
  onSaved,
}: {
  jobId: string
  overlay: Overlay
  hiddenIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The refreshed job, or null when the answer had none (poll again). */
  onSaved: (job: FilmJob | null) => void
}) {
  const [selected, setSelected] = React.useState<string[]>(hiddenIds)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const players = React.useMemo(() => trackedPlayers(overlay), [overlay])
  // The save keeps running when the dialog closes (the job view refreshes when it lands); leaving the page aborts it.
  const inFlight = React.useRef<AbortController | null>(null)
  React.useEffect(() => () => inFlight.current?.abort(), [])

  // Each time the dialog opens it starts from what the clip hides now.
  const wasOpen = React.useRef(false)
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      setSelected(hiddenIds)
      setError(null)
    }
    wasOpen.current = open
  }, [open, hiddenIds])

  const full = selected.length >= MAX_HIDDEN
  const unchanged = selected.length === hiddenIds.length && selected.every((id) => hiddenIds.includes(id))
  const toggle = (id: string, on: boolean) =>
    setSelected((cur) => (on ? (cur.includes(id) ? cur : [...cur, id]) : cur.filter((x) => x !== id)))

  const save = async () => {
    if (saving) return
    const controller = new AbortController()
    inFlight.current = controller
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, SAVE_TIMEOUT_MS)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/film/jobs/${encodeURIComponent(jobId)}/hide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerIds: selected }),
        signal: controller.signal,
      })
      const body = (await res.json().catch(() => null)) as (FilmJob & { error?: string }) | null
      if (!res.ok) {
        setError(body?.error || SAVE_FAILED)
        return
      }
      onSaved(body && body.jobId === jobId && body.status === "done" ? body : null)
      onOpenChange(false)
      toast(selected.length ? "Clip updated" : "Everyone is shown again", {
        description: selected.length
          ? "The selected players are hidden in every frame."
          : "The clip plays as recorded.",
      })
    } catch {
      if (controller.signal.aborted && !timedOut) return // the page closed
      setError(timedOut ? "Hiding took longer than a minute. Try again in a moment." : SAVE_FAILED)
    } finally {
      clearTimeout(timer)
      if (inFlight.current === controller) inFlight.current = null
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <EyeSlashIcon aria-hidden /> Hide a player
          </DialogTitle>
          <DialogDescription className="text-pretty">
            For a player whose family has not given consent. ClinIQ replaces the clip with one where the selected
            players are blurred in every frame, using their SAM 3.1 tracks. Check the whole clip: if tracking lost a
            player, a few frames can still show them.
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={saving} className="min-w-0">
          <legend className="mb-1 text-xs text-muted-foreground">
            Tracked players · pick up to {MAX_HIDDEN} ({selected.length} picked)
          </legend>
          <ul className="grid grid-cols-2 gap-x-3">
            {players.map((p) => {
              const on = selected.includes(p.id)
              return (
                <li key={p.id}>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI Checkbox renders its control inside the label */}
                  <label className="flex min-h-11 items-center gap-2 py-1 text-sm sm:min-h-9">
                    <Checkbox checked={on} disabled={!on && full} onCheckedChange={(c) => toggle(p.id, Boolean(c))} />
                    <span className="font-medium tabular-nums">{p.id}</span>
                    <Chip tone="outline">{p.team === "defense" ? "Defense" : "Offense"}</Chip>
                  </label>
                </li>
              )
            })}
          </ul>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {saving && (
          <p aria-live="polite" className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <SparkleIcon size={13} weight="fill" className="mt-0.5 shrink-0 text-ai-mark" aria-hidden />
            ClinIQ is redrawing the clip with the selected players blurred. This can take up to a minute. You can close
            this window; the clip updates when it is done.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            className="h-11 sm:h-8"
            disabled={saving || selected.length === 0}
            onClick={() => setSelected([])}
          >
            Show everyone
          </Button>
          <Button className="h-11 sm:h-8" disabled={saving || unchanged} onClick={save}>
            {saving && <CircleNotchIcon weight="bold" className="motion-safe:animate-spin" aria-hidden />}
            {saving ? "Hiding…" : selected.length ? "Hide selected" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
