"use client"

import { EyeSlashIcon, KeyboardIcon } from "@phosphor-icons/react"
import * as React from "react"

import { getFilm } from "@/data/film"
import { players } from "@/data/org"
import { ClockContext, createClock, FRAME } from "./clock"
import { EventLanes } from "./event-lanes"
import { FilmRoomProvider } from "./film-room-context"
import { FilmPlayer } from "./player"
import { FilmRail } from "./rail"

const IGNORE =
  "input, textarea, select, [contenteditable], [role=dialog], [role=dialog] *, [role=radio], [role=tab], [role=slider]"

/**
 * Video review (DIRECTION): player at least 60% wide, event lanes under it, a 320px Comments / Events / Plays rail.
 * Phone: player on top, the rail's tabs below, lanes scroll sideways. Takes the film id; mock data is deterministic.
 */
export function FilmRoom({ filmId, startAt }: { filmId: string; startAt?: number }) {
  const film = getFilm(filmId)
  const [clock] = React.useState(() => (film ? createClock(film.duration, startAt ?? film.startAt) : null))

  React.useEffect(() => {
    if (!clock) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest(IGNORE)) return
      const onControl = Boolean(target?.closest("button, a"))
      switch (e.key) {
        case " ":
        case "k":
          if (e.key === " " && onControl) return
          e.preventDefault()
          clock.toggle()
          break
        case "ArrowLeft":
          e.preventDefault()
          clock.nudge(-5)
          break
        case "ArrowRight":
          e.preventDefault()
          clock.nudge(5)
          break
        case ",":
          clock.pause()
          clock.nudge(-FRAME)
          break
        case ".":
          clock.pause()
          clock.nudge(FRAME)
          break
        case "f":
          window.dispatchEvent(new Event("film:fullscreen"))
          break
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      clock.pause()
    }
  }, [clock])

  if (!film || !clock) return null
  const pending = players.filter((p) => p.consent === "pending")

  return (
    <ClockContext.Provider value={clock}>
      <FilmRoomProvider film={film}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3">
            <FilmPlayer />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {film.kind === "game" && pending.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <EyeSlashIcon size={14} aria-hidden />
                  {pending.map((p) => p.name).join(", ")}: consent pending. Hidden from player and parent views (this
                  film stays staff-only), and ClinIQ skips {pending.length === 1 ? "him" : "them"}.
                </span>
              )}
              {film.kind === "scout" && <span>Opponent players are labeled Opponent 1–5 and never identified.</span>}
              <span className="hidden items-center gap-1.5 md:inline-flex">
                <KeyboardIcon size={14} aria-hidden /> Space play · ← → 5 s · , . frame · F fullscreen
              </span>
            </div>
            <EventLanes />
          </div>
          <FilmRail />
        </div>
      </FilmRoomProvider>
    </ClockContext.Provider>
  )
}
