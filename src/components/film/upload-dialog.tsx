"use client"

import {
  CheckCircleIcon,
  CircleNotchIcon,
  CloudArrowUpIcon,
  FileVideoIcon,
  ShieldCheckIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
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
import { players } from "@/data/org"
import {
  jobStartKey,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_SECONDS,
  SAMPLE_ATTRIBUTION,
  type SampleId,
  sampleClips,
} from "@/lib/film-job"
import { cn } from "@/lib/utils"

const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"]
const VIDEO_EXT = /\.(mp4|mov|webm)$/i
const DURATION_TIMEOUT_MS = 5000
const SEND_FAILED = "The upload did not go through. Try again."

export interface NewUpload {
  name: string
  sizeMb: number
  kind: FilmKind
  held: boolean
}

interface Picked {
  file: File
  /** Seconds, from the video's metadata; null while it is read (or when it cannot be read). */
  duration: number | null
  error: string | null
}

/** Reads a video file's length from a detached <video> element's metadata. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    const clean = () => {
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      video.removeAttribute("src")
    }
    const timer = setTimeout(() => {
      clean()
      reject(new Error("timeout"))
    }, DURATION_TIMEOUT_MS)
    video.onloadedmetadata = () => {
      const d = video.duration
      clean()
      if (Number.isFinite(d) && d > 0) resolve(d)
      else reject(new Error("no duration"))
    }
    video.onerror = () => {
      clean()
      reject(new Error("unreadable"))
    }
    video.src = url
  })
}

const sizeMb = (bytes: number) => (bytes / 1024 ** 2).toFixed(1)

/**
 * Analyze a clip: one file (MP4, MOV or WebM, up to 60 MB and 60 s) or a sample clip goes to POST /api/film/upload,
 * then to its job page. The filming guide and the consent check (P0-06) stay as they were: holding the upload keeps
 * the preview behaviour and sends nothing.
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
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const [kind, setKind] = React.useState<FilmKind>("game")
  const [picked, setPicked] = React.useState<Picked | null>(null)
  const [sample, setSample] = React.useState<SampleId | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [consent, setConsent] = React.useState<"hide" | "hold" | "">("")
  const [guide, setGuide] = React.useState<boolean[]>(() => filmingGuide.map(() => false))
  const [sending, setSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)

  const pending = players.filter((p) => p.consent === "pending")
  const withConsent = players.length - pending.length
  const needsConsent = kind !== "scout" && pending.length > 0
  const held = consent === "hold" && needsConsent
  const sampleClip = sampleClips.find((c) => c.id === sample) ?? null
  const fileReady = picked !== null && picked.duration !== null && picked.error === null
  const ready = (sampleClip !== null || fileReady) && (!needsConsent || consent !== "") && !sending

  // Leaving the page cancels an upload in flight, so it cannot pull the user to a job page later.
  React.useEffect(() => () => abortRef.current?.abort(), [])

  React.useEffect(() => {
    if (open) return
    abortRef.current?.abort()
    setPicked(null)
    setSample(null)
    setConsent("")
    setDragOver(false)
    setSending(false)
    setSendError(null)
  }, [open])

  const pick = (f: File | undefined) => {
    if (!f) return
    if (!VIDEO_TYPES.includes(f.type) && !VIDEO_EXT.test(f.name)) {
      toast.error("That isn't a video file we can read", { description: "Use MP4, MOV or WebM." })
      return
    }
    setSample(null)
    setSendError(null)
    if (f.size > MAX_UPLOAD_BYTES) {
      setPicked({
        file: f,
        duration: null,
        error: `${sizeMb(f.size)} MB is over the 60 MB limit. Trim it to one play.`,
      })
      return
    }
    setPicked({ file: f, duration: null, error: null })
    const settle = (duration: number | null, error: string | null) =>
      setPicked((cur) => (cur?.file === f ? { file: f, duration, error } : cur))
    readDuration(f).then(
      (d) =>
        settle(
          d,
          d > MAX_UPLOAD_SECONDS + 0.5
            ? `${Math.round(d)} seconds is over the 60 second limit. Trim it to one play.`
            : null,
        ),
      () => settle(null, "This browser can't read the video's length. Try an MP4."),
    )
  }

  const submit = async () => {
    if (held) {
      const name = sampleClip?.fileName ?? picked?.file.name ?? "clip"
      onUpload({ name, sizeMb: Math.round((picked?.file.size ?? 0) / 1024 ** 2), kind, held: true })
      onOpenChange(false)
      return
    }
    const controller = new AbortController()
    const startedAt = Date.now()
    abortRef.current = controller
    setSending(true)
    setSendError(null)
    try {
      let body: Blob
      let name: string
      if (sampleClip) {
        const res = await fetch(sampleClip.src, { signal: controller.signal })
        if (!res.ok) throw new Error("The sample clip did not load. Try again.")
        body = await res.blob()
        name = sampleClip.fileName
      } else if (picked) {
        body = picked.file
        name = picked.file.name
      } else {
        throw new Error("Choose a clip first.")
      }
      const form = new FormData()
      form.append("file", body, name)
      const res = await fetch("/api/film/upload", { method: "POST", body: form, signal: controller.signal })
      const data = (await res.json().catch(() => null)) as { jobId?: string; error?: string } | null
      if (!res.ok || !data?.jobId) throw new Error(data?.error || SEND_FAILED)
      try {
        sessionStorage.setItem(jobStartKey(data.jobId), String(startedAt))
      } catch {
        // Private mode: the job page counts from when it opens instead.
      }
      if (controller.signal.aborted) return
      router.push(`/film/jobs/${encodeURIComponent(data.jobId)}${sampleClip ? `?sample=${sampleClip.id}` : ""}`)
    } catch (error) {
      if (controller.signal.aborted) return
      setSendError(error instanceof Error && error.message ? error.message : SEND_FAILED)
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analyze a clip</DialogTitle>
          <DialogDescription>
            One clip, up to 60 seconds and 60 MB. Modal pulls the frames, SAM 3.1 tracks the players and Muse Spark
            suggests the play name for you to review.
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

        {picked ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border p-3",
              picked.error ? "border-danger/50 bg-danger/6" : "border-border",
            )}
          >
            <FileVideoIcon size={28} className="shrink-0 text-foreground-secondary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{picked.file.name}</p>
              <p
                className={cn("text-xs tabular-nums", picked.error ? "text-danger" : "text-muted-foreground")}
                aria-live="polite"
              >
                {sizeMb(picked.file.size)} MB
                {picked.duration !== null && ` · ${Math.round(picked.duration)} s`}
                {picked.error ? ` · ${picked.error}` : picked.duration === null ? " · Checking the length…" : null}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove file"
              className="size-11 sm:size-8"
              disabled={sending}
              onClick={() => setPicked(null)}
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
              "flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors",
              dragOver ? "border-brand-orange bg-selection-tint" : "border-border-strong/50 hover:border-border-strong",
            )}
          >
            <CloudArrowUpIcon size={32} className="text-foreground-secondary" aria-hidden />
            <span className="text-sm font-semibold">Drag a clip here, or choose a file</span>
            <span className="text-xs text-muted-foreground">MP4, MOV or WebM. Up to 60 MB and 60 seconds.</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            pick(e.target.files?.[0])
            e.target.value = ""
          }}
        />

        <fieldset className="rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-semibold">Or use a sample clip</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {sampleClips.map((c) => {
              const on = sample === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  disabled={sending}
                  onClick={() => {
                    setSample(on ? null : c.id)
                    setPicked(null)
                    setSendError(null)
                  }}
                  className={cn(
                    "flex min-h-11 items-start gap-2 rounded-sm border px-3 py-2 text-left text-sm transition-colors",
                    on ? "border-foreground bg-selection-tint" : "border-border hover:bg-surface-2",
                  )}
                >
                  {on ? (
                    <CheckCircleIcon size={16} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                  ) : (
                    <FileVideoIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  <span>
                    <span className="block font-medium">Hazen {c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{SAMPLE_ATTRIBUTION}</p>
        </fieldset>

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

        {(sending || sendError) && (
          <p
            className={cn("flex items-start gap-2 text-sm", sendError ? "text-danger" : "text-muted-foreground")}
            role={sendError ? "alert" : "status"}
          >
            {sendError ? (
              <WarningIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
            ) : (
              <CircleNotchIcon size={16} className="mt-0.5 shrink-0 motion-safe:animate-spin" aria-hidden />
            )}
            {sendError ?? "Uploading the clip. This can take a minute on a slow connection."}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ready} onClick={submit}>
            {held ? "Queue and hold" : sending ? "Uploading…" : "Start analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
