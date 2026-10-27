"use client"

import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  InfoIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
  TagIcon,
  XIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Segmented } from "@/components/ui/segmented"
import { org } from "@/data/org"
import { getPlay } from "@/data/plays"
import { OT_SECONDS, QUARTER_SECONDS, type Quarter, quarters, recordTips, tagPlayIds } from "@/data/record"
import { nextGame, opponentById } from "@/data/season"
import { cn } from "@/lib/utils"

interface LiveTag {
  id: number
  title: string
  quarter: Quarter
  clock: number
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
const tagPlays = tagPlayIds.flatMap((id) => {
  const p = getPlay(id)
  return p ? [{ id, title: p.title }] : []
})

/**
 * Mock Record screen: phone camera view with a court framing guide, score and clock overlay, quarter picker, record
 * button and tag-as-you-go buttons with the team's own play names. The camera never turns on.
 */
export function RecordScreen() {
  const opp = opponentById(nextGame.opponentId)
  const us = org.short.slice(0, 3).toUpperCase()
  const them = opp?.short ?? "OPP"

  const [recording, setRecording] = React.useState(false)
  const [stopped, setStopped] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [quarter, setQuarter] = React.useState<Quarter>("Q1")
  const [clock, setClock] = React.useState(QUARTER_SECONDS)
  const [clockRunning, setClockRunning] = React.useState(false)
  const [score, setScore] = React.useState({ us: 0, them: 0 })
  const [tags, setTags] = React.useState<LiveTag[]>([])
  const [flash, setFlash] = React.useState<LiveTag | null>(null)
  const nextTagId = React.useRef(1)

  // One tick drives both counters: recording time and, when running, the game clock.
  React.useEffect(() => {
    if (!recording && !clockRunning) return
    const id = setInterval(() => {
      if (recording) setElapsed((e) => e + 1)
      if (clockRunning) setClock((c) => Math.max(0, c - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [recording, clockRunning])

  React.useEffect(() => {
    if (clock === 0) setClockRunning(false)
  }, [clock])

  React.useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => setFlash(null), 2400)
    return () => clearTimeout(id)
  }, [flash])

  const toggleRecording = () => {
    if (recording) {
      setRecording(false)
      setClockRunning(false)
      setStopped(true)
      return
    }
    setStopped(false)
    setRecording(true)
  }

  const pickQuarter = (q: Quarter) => {
    setQuarter(q)
    setClock(q === "OT" ? OT_SECONDS : QUARTER_SECONDS)
    setClockRunning(false)
  }

  const addTag = (title: string) => {
    const tag = { id: nextTagId.current++, title, quarter, clock }
    setTags((list) => [tag, ...list])
    setFlash(tag)
  }

  const addPoints = (side: "us" | "them", n: number) => setScore((s) => ({ ...s, [side]: Math.max(0, s[side] + n) }))

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0 space-y-4">
        <p className="flex items-start gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-foreground-secondary">
          <InfoIcon size={18} className="mt-px shrink-0" aria-hidden />
          <span className="text-pretty">
            <span className="font-semibold text-foreground">Preview: nothing is recorded.</span> The camera stays off.
            The court is a drawing of what your phone would see.
          </span>
        </p>

        {/* Landscape phone: the bezel stays dark in both themes, like a real camera view. */}
        <div className="mx-auto w-full max-w-3xl rounded-[1.75rem] bg-black p-2 shadow-lg ring-1 ring-border sm:p-3">
          <div className="relative aspect-video overflow-hidden rounded-[1.1rem] bg-black text-white">
            <CameraCourt guide={!recording} />

            <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2 text-[0.6875rem] sm:inset-x-3 sm:top-3 sm:text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-xs bg-black/60 px-1.5 py-0.5 font-semibold tabular-nums">
                {recording ? (
                  <>
                    <span aria-hidden className="size-2 rounded-full bg-danger motion-safe:animate-pulse" />
                    REC {mmss(elapsed)}
                  </>
                ) : (
                  <span className="font-medium text-white/75">{stopped ? "Stopped" : "Camera off · preview"}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-2 rounded-xs bg-black/60 px-2 py-0.5 font-semibold tabular-nums">
                <span>
                  {us} {score.us}
                </span>
                <span className="text-white/50">–</span>
                <span>
                  {score.them} {them}
                </span>
                <span className="border-l border-white/25 pl-2 text-white/80">
                  {quarter} {mmss(clock)}
                </span>
              </span>
            </div>

            {flash ? (
              <span className="pointer-events-none absolute bottom-2 left-2 inline-flex max-w-[80%] items-center gap-1.5 truncate rounded-xs bg-black/70 px-2 py-1 text-[0.6875rem] font-semibold tabular-nums sm:bottom-3 sm:left-3 sm:text-xs">
                <TagIcon size={12} aria-hidden /> {flash.title} · {flash.quarter} {mmss(flash.clock)}
              </span>
            ) : !recording ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit max-w-[90%] rounded-xs bg-black/60 px-2 py-1 text-center text-[0.6875rem] text-white/90 sm:bottom-3 sm:text-xs">
                Phone high in the stands near half court, or a high corner, so all ten players stay in frame
              </span>
            ) : null}
            <span aria-hidden className="absolute top-1/2 left-1 size-1.5 -translate-y-1/2 rounded-full bg-white/20" />
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {recording ? "Recording preview started." : stopped ? "Recording preview stopped." : ""}
          {flash ? ` Tagged ${flash.title} at ${flash.quarter} ${mmss(flash.clock)}.` : ""}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-border bg-surface-1 p-3">
          <Button
            onClick={toggleRecording}
            aria-pressed={recording}
            className="h-14 gap-2 rounded-full pr-5 pl-2 text-base"
          >
            <span className="grid size-10 place-items-center rounded-full bg-primary-foreground/15">
              {recording ? (
                <StopIcon weight="fill" aria-hidden />
              ) : (
                <span aria-hidden className="size-4 rounded-full bg-primary-foreground" />
              )}
            </span>
            {recording ? "Stop" : stopped ? "Record again" : "Record"}
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<Quarter>
              label="Quarter"
              value={quarter}
              onChange={pickQuarter}
              options={quarters.map((q) => ({ value: q, label: q }))}
            />
            <Button
              variant="outline"
              className="h-11 tabular-nums sm:h-9"
              aria-pressed={clockRunning}
              onClick={() => setClockRunning((r) => !r)}
              disabled={clock === 0}
            >
              {clockRunning ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
              {clockRunning ? "Stop clock" : "Start clock"}
            </Button>
          </div>
        </div>

        {stopped ? (
          <div className="flex gap-3 rounded-lg border border-border bg-surface-1 p-4">
            <CheckCircleIcon size={20} className="mt-0.5 shrink-0 text-foreground-secondary" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">Preview: nothing was recorded or uploaded.</p>
              <p className="mt-0.5 text-foreground-secondary text-pretty">
                In the app, the video uploads when you are on Wi-Fi and opens in Film with your{" "}
                <span className="tabular-nums">{tags.length}</span> {tags.length === 1 ? "tag" : "tags"}, linked to
                those plays in your playbook.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/film" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
                  Film library
                </Link>
                <Link href="/film/review" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-8")}>
                  Review queue
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <section
          aria-labelledby="setup-title"
          className="hidden rounded-lg border border-border bg-surface-1 p-4 lg:block"
        >
          <SetupTips />
        </section>
      </div>

      <div className="min-w-0 space-y-4">
        <section aria-labelledby="tag-title" className="rounded-lg border border-border bg-surface-1 p-4">
          <h2 id="tag-title" className="text-[0.9375rem] font-semibold">
            Tag as you go
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            Tap the play you just ran. Your names, from your playbook.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {tagPlays.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                className="h-auto min-h-11 justify-start px-3 py-2 text-left whitespace-normal"
                onClick={() => addTag(p.title)}
              >
                {p.title}
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="score-title" className="rounded-lg border border-border bg-surface-1 p-4">
          <h2 id="score-title" className="text-[0.9375rem] font-semibold">
            Score
          </h2>
          <div className="mt-2 divide-y divide-border">
            {(
              [
                ["us", org.short],
                ["them", opp?.name ?? "Opponent"],
              ] as const
            ).map(([side, name]) => (
              <div key={side} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                <span className="min-w-0 flex-1 text-sm font-medium">{name}</span>
                <span className="w-10 text-right text-2xl font-semibold tabular-nums">{score[side]}</span>
                <span className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <Button
                      key={n}
                      variant="secondary"
                      className="size-11 tabular-nums sm:size-9"
                      aria-label={`Add ${n} for ${name}`}
                      onClick={() => addPoints(side, n)}
                    >
                      +{n}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="size-11 sm:size-9"
                    aria-label={`Take 1 point off ${name}`}
                    onClick={() => addPoints(side, -1)}
                    disabled={score[side] === 0}
                  >
                    <ArrowCounterClockwiseIcon aria-hidden />
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="tags-title" className="rounded-lg border border-border bg-surface-1 p-4">
          <h2 id="tags-title" className="flex items-baseline justify-between gap-2 text-[0.9375rem] font-semibold">
            Tags this game
            <span className="text-sm font-normal text-muted-foreground tabular-nums">{tags.length}</span>
          </h2>
          {tags.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              No tags yet. Each tag marks the clip with your play&apos;s name, so it shows up on that play and in your
              players&apos; study.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {tags.map((t) => (
                <li key={t.id} className="flex min-h-11 items-center gap-3 py-1">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {t.quarter} {mmss(t.clock)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
                  <Button
                    variant="ghost"
                    className="size-11 text-muted-foreground sm:size-8"
                    aria-label={`Remove tag ${t.title} at ${t.quarter} ${mmss(t.clock)}`}
                    onClick={() => setTags((list) => list.filter((x) => x.id !== t.id))}
                  >
                    <XIcon aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="setup-title-phone"
          className="rounded-lg border border-border bg-surface-1 p-4 lg:hidden"
        >
          <SetupTips phone />
        </section>
      </div>
    </div>
  )
}

function SetupTips({ phone = false }: { phone?: boolean }) {
  return (
    <>
      <h2 id={phone ? "setup-title-phone" : "setup-title"} className="text-[0.9375rem] font-semibold">
        Before tip-off
      </h2>
      <ol className="mt-2 grid gap-3 sm:grid-cols-2">
        {recordTips.map((t, i) => (
          <li key={t.title} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-medium">{t.title}</span>
              <span className="block text-muted-foreground text-pretty">{t.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

/** The court as a phone at half court, high in the stands, sees it, with the framing guide while setting up. */
function CameraCourt({ guide }: { guide: boolean }) {
  // Far sideline y=96, near sideline y=318. The ends are mirrored around x=320.
  const keyL = "M77 175 L176 175 L162 239 L54 239 Z"
  const arcL = "M104 120 Q262 207 31 296"
  const dotsUs: [number, number][] = [
    [190, 150],
    [232, 205],
    [168, 262],
    [120, 190],
    [255, 280],
  ]
  const dotsThem: [number, number][] = [
    [175, 170],
    [212, 222],
    [148, 248],
    [108, 206],
    [236, 262],
  ]
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label="Drawing of the camera view: the full court seen from half court, high in the stands"
      className="absolute inset-0 size-full"
    >
      <defs>
        <linearGradient id="rec-stands" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.02" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#rec-stands)" />
      <g fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5">
        <path d="M112 96 L528 96 L618 318 L22 318 Z" fill="currentColor" fillOpacity="0.06" />
        <line x1="320" y1="96" x2="320" y2="318" />
        <ellipse cx="320" cy="207" rx="42" ry="20" />
        {[false, true].map((mirror) => (
          <g key={String(mirror)} transform={mirror ? "matrix(-1 0 0 1 640 0)" : undefined}>
            <path d={keyL} fill="currentColor" fillOpacity="0.05" />
            <path d={arcL} />
            <ellipse cx="169" cy="207" rx="20" ry="24" />
            <line x1="68" y1="199" x2="63" y2="215" strokeWidth="2.5" strokeOpacity="0.8" />
            <ellipse cx="76" cy="207" rx="6" ry="3.5" strokeOpacity="0.8" />
          </g>
        ))}
      </g>
      <g>
        {dotsUs.map(([x, y]) => (
          <circle key={`u${x}`} cx={x} cy={y} r="6" fill="currentColor" fillOpacity="0.9" />
        ))}
        {dotsThem.map(([x, y]) => (
          <circle
            key={`t${x}`}
            cx={x}
            cy={y}
            r="6"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.8"
            strokeWidth="2"
          />
        ))}
      </g>
      {guide ? (
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {/* Corner brackets: line the court up inside them. */}
          <path d="M14 88 v-18 h24 M626 88 v-18 h-24 M14 326 v18 h24 M626 326 v18 h-24" strokeOpacity="0.9" />
          <line x1="320" y1="62" x2="320" y2="80" strokeOpacity="0.9" />
        </g>
      ) : null}
    </svg>
  )
}
