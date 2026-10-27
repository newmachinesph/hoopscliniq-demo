"use client"

import { ArrowRightIcon, CheckCircleIcon, FilmStripIcon } from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import type { PlaybookPlay } from "@/data/plays"
import { CourtPlay, onPlaybackKey, PlayTransport, usePlayback } from "@/lib/play-engine/court-play"
import { cn } from "@/lib/utils"

/** Player's play viewer: playback controls, own role highlighted, coach note per frame, studied toggle, linked clips. */
export function PlayViewer({
  play,
  role,
  initialStudied,
  coachLine,
  quiz,
  clipBase = "/study/clips",
}: {
  play: PlaybookPlay
  role: number
  initialStudied: boolean
  coachLine?: string
  /** The quiz on this play, offered once it is studied. */
  quiz?: { href: string; title: string }
  /** Where clip links go: the player app, or the demo study screen. */
  clipBase?: string
}) {
  const [speed, setSpeed] = React.useState(1)
  const [studied, setStudied] = React.useState(initialStudied)
  const pb = usePlayback(play, { speed })

  return (
    <div className="md:grid md:grid-cols-2 md:items-start md:gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: space and arrows from the court's controls bubble here */}
      <div onKeyDown={onPlaybackKey(pb)} className="md:sticky md:top-20">
        <div className="overflow-hidden rounded-md border border-border">
          <CourtPlay
            play={play}
            frame={pb.frame}
            t={pb.t}
            mode={pb.playing ? "live" : undefined}
            showDefense
            selected={role - 1}
            className="block w-full"
            title={`${play.title}, frame ${pb.frame + 1} of ${play.frames.length}. Your role is number ${role}.`}
          />
        </div>

        <p className="mt-2 flex items-center gap-2 text-sm">
          <Chip tone="outline" size="md">
            Your role: #{role} (Luka)
          </Chip>
          <span className="text-xs text-muted-foreground tabular-nums">
            Frame {pb.frame + 1} of {play.frames.length}
          </span>
        </p>

        <PlayTransport playback={pb} speed={speed} onSpeed={setSpeed} className="mt-3" />
      </div>

      <div className="min-w-0">
        <h2 className="mt-6 mb-2 text-sm font-semibold text-foreground-secondary md:mt-0">Coach notes</h2>
        {coachLine && (
          <p className="mb-2 rounded-md bg-surface-2 p-3 text-sm">
            {coachLine} <span className="text-muted-foreground">Coach Reyes</span>
          </p>
        )}
        <ol className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {play.frames.map((f, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  pb.pause()
                  pb.seek(i)
                }}
                aria-current={i === pb.frame ? "step" : undefined}
                className={cn(
                  "flex min-h-14 w-full items-start gap-3 px-3 py-3 text-left text-sm",
                  i === pb.frame ? "bg-surface-2" : "hover:bg-surface-2",
                )}
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border-strong text-xs tabular-nums">
                  {i + 1}
                </span>
                <span className={i === pb.frame ? "font-medium" : "text-foreground-secondary"}>
                  {f.note ?? "Hold and read the defense."}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {play.clips.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 text-sm font-semibold text-foreground-secondary">Clips of this play</h2>
            <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {play.clips.map((c) => (
                <li key={`${c.filmId}-${c.t}`}>
                  <Link
                    href={`${clipBase}/${c.filmId}?t=${c.t}&play=${play.id}`}
                    className="flex min-h-14 items-center gap-3 px-3 py-2 hover:bg-surface-2"
                  >
                    <FilmStripIcon size={20} className="shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 text-sm">
                      {c.label}
                      <span className="block text-xs text-muted-foreground tabular-nums">{c.clock}</span>
                    </span>
                    <Chip tone={c.result === "score" ? "success" : "neutral"}>
                      {c.result === "score"
                        ? "Score"
                        : c.result === "miss"
                          ? "Miss"
                          : c.result === "foul"
                            ? "Foul"
                            : "Turnover"}
                    </Chip>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-6">
          {studied ? (
            <p className="flex h-12 items-center justify-center gap-2 rounded-sm bg-success/14 text-sm font-semibold text-success">
              <CheckCircleIcon size={20} weight="fill" aria-hidden />
              Studied
            </p>
          ) : null}
          {studied && quiz ? (
            <Link href={quiz.href} className={cn(buttonVariants(), "mt-2 h-12 w-full text-base")}>
              Take the quiz <ArrowRightIcon aria-hidden />
            </Link>
          ) : null}
          {studied ? null : (
            <Button
              type="button"
              className="h-12 w-full text-base"
              onClick={() => {
                setStudied(true)
                toast.success("Preview: marked as studied", {
                  description: "Your coach sees it in the team's results.",
                })
              }}
            >
              Mark as studied
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
