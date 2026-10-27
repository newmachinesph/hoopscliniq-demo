"use client"

import { CloudArrowUpIcon, FileVideoIcon, ShieldCheckIcon, WarningIcon, XIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Segmented } from "@/components/ui/segmented"
import { type FilmKind, filmingGuide } from "@/data/film"
import { org, players } from "@/data/org"
import { cn } from "@/lib/utils"

const MAX_BYTES = 2 * 1024 ** 3

export interface NewUpload {
  name: string
  sizeMb: number
  kind: FilmKind
  held: boolean
}

/**
 * Upload film: drop zone, the filming guide, and the consent check (P0-06: a roster minor without video
 * consent blocks the upload unless the coach hides him from player and parent views or holds it). Blur is Coming 2027.
 */
export function UploadDialog({
  open,
  onOpenChange,
  onUpload,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (upload: NewUpload) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [kind, setKind] = React.useState<FilmKind>("game")
  const [file, setFile] = React.useState<{ name: string; size: number } | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [consent, setConsent] = React.useState<"hide" | "hold" | "">("")
  const [guide, setGuide] = React.useState<boolean[]>(() => filmingGuide.map(() => false))

  const pending = players.filter((p) => p.consent === "pending")
  const withConsent = players.length - pending.length
  const hoursLeft = org.videoHours.included - org.videoHours.used
  const tooBig = file !== null && file.size > MAX_BYTES
  const needsConsent = kind !== "scout" && pending.length > 0
  const ready = file !== null && !tooBig && (!needsConsent || consent !== "")

  React.useEffect(() => {
    if (open) return
    setFile(null)
    setConsent("")
    setDragOver(false)
  }, [open])

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|avi|mkv)$/i.test(f.name)) {
      toast.error("That isn't a video file", { description: "Use MP4, MOV or M4V." })
      return
    }
    setFile({ name: f.name, size: f.size })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload video</DialogTitle>
          <DialogDescription>
            Upload a video file from any camera. Up to 2 GB and 90 minutes per video.{" "}
            <span className="tabular-nums">{hoursLeft}</span> of{" "}
            <span className="tabular-nums">{org.videoHours.included}</span> hours left on the Program plan.
          </DialogDescription>
        </DialogHeader>

        <Segmented<FilmKind>
          label="Film type"
          value={kind}
          onChange={setKind}
          className="w-fit"
          options={[
            { value: "game", label: "Our game" },
            { value: "scout", label: "Scouting" },
            { value: "practice", label: "Practice" },
          ]}
        />

        {file ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border p-3",
              tooBig ? "border-danger/50 bg-danger/6" : "border-border",
            )}
          >
            <FileVideoIcon size={28} className="shrink-0 text-foreground-secondary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className={cn("text-xs tabular-nums", tooBig ? "text-danger" : "text-muted-foreground")}>
                {(file.size / 1024 ** 3).toFixed(2)} GB
                {tooBig && " · Over the 2 GB limit. Trim it or export at 1080p."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              className="size-11 sm:size-8"
              onClick={() => setFile(null)}
            >
              <XIcon aria-hidden />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              pick(e.dataTransfer.files[0])
            }}
            className={cn(
              "flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors",
              dragOver ? "border-brand-orange bg-selection-tint" : "border-border-strong/50 hover:border-border-strong",
            )}
          >
            <CloudArrowUpIcon size={36} className="text-foreground-secondary" aria-hidden />
            <span className="text-sm font-semibold">Drag a video here, or choose a file</span>
            <span className="text-xs text-muted-foreground">
              MP4, MOV or M4V. Uploads resume if your connection drops.
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="rounded-md border border-border p-3">
            <legend className="px-1 text-xs font-semibold">
              Filming guide{" "}
              <span className="font-normal text-muted-foreground tabular-nums">
                {guide.filter(Boolean).length}/{guide.length}
              </span>
            </legend>
            <p className="text-xs text-muted-foreground">Better film, better tags. Check what this video has.</p>
            <ul className="mt-2 space-y-1">
              {filmingGuide.map((item, i) => (
                <li key={item}>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI Checkbox renders its control inside the label */}
                  <label className="flex min-h-9 items-start gap-2 py-1 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={guide[i]}
                      onCheckedChange={(checked) => setGuide((g) => g.map((v, j) => (j === i ? Boolean(checked) : v)))}
                    />
                    <span className="text-foreground-secondary">{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className={cn("rounded-md border p-3", needsConsent ? "border-warning/50" : "border-border")}>
            <legend className="px-1 text-xs font-semibold">Consent check</legend>
            {kind === "scout" ? (
              <p className="flex items-start gap-2 text-sm text-foreground-secondary">
                <ShieldCheckIcon size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
                Scout film has no Lakeshore players. Opponents are incidental footage: labeled Opponent 1–5, never
                identified, and the film stays staff-only.
              </p>
            ) : (
              <>
                <p className="flex items-start gap-2 text-sm">
                  <WarningIcon size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
                  <span>
                    <span className="tabular-nums">
                      {withConsent} of {players.length}
                    </span>{" "}
                    rostered players have guardian consent.
                  </span>
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
                  No data about a player on your roster is shown or used until a parent or guardian agrees. Game film
                  can show opponents and non-consented players; that film stays staff-only.
                </p>
                {pending.map((p) => (
                  <p key={p.id} className="mt-1.5 rounded-sm bg-warning/10 px-2 py-1.5 text-sm">
                    <span className="font-semibold">{p.name}:</span> consent pending. Choose how this film handles him.
                  </p>
                ))}
                <RadioGroup
                  value={consent}
                  onValueChange={(v) => setConsent(v as "hide" | "hold")}
                  className="mt-2 gap-1"
                  aria-label="How to handle players without consent"
                >
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI Radio renders its control inside the label */}
                  <label className="flex min-h-10 items-start gap-2 py-1 text-sm">
                    <RadioGroupItem value="hide" className="mt-0.5" />
                    <span>
                      Hide this player from player and parent views
                      <span className="block text-xs text-muted-foreground">
                        The film stays staff-only and ClinIQ skips his possessions. Blurring him: Coming 2027.
                      </span>
                    </span>
                  </label>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Base UI Radio renders its control inside the label */}
                  <label className="flex min-h-10 items-start gap-2 py-1 text-sm">
                    <RadioGroupItem value="hold" className="mt-0.5" />
                    <span>
                      Hold the upload until his guardian agrees
                      <span className="block text-xs text-muted-foreground">Nothing is stored until then.</span>
                    </span>
                  </label>
                </RadioGroup>
              </>
            )}
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ready}
            onClick={() => {
              if (!file) return
              onUpload({
                name: file.name,
                sizeMb: Math.round(file.size / 1024 ** 2),
                kind,
                held: consent === "hold" && needsConsent,
              })
              onOpenChange(false)
            }}
          >
            {consent === "hold" && needsConsent ? "Queue and hold" : "Start upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
