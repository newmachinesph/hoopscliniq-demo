"use client"

import * as React from "react"

// The film room's timeline clock. It lives outside React state so the 60 fps playhead only re-renders the pieces
// that read the time (viewport, scrubber, playhead), not the lanes or the rail.

export const FRAME = 1 / 30

export interface FilmClock {
  duration: number
  getTime: () => number
  getPlaying: () => boolean
  getRate: () => number
  subscribe: (listener: () => void) => () => void
  seek: (t: number) => void
  nudge: (dt: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  setRate: (rate: number) => void
}

export function createClock(duration: number, start: number): FilmClock {
  let time = Math.min(Math.max(0, start), duration)
  let playing = false
  let rate = 1
  let raf = 0
  let prev = 0
  const listeners = new Set<() => void>()
  const emit = () => {
    for (const l of listeners) l()
  }

  const tick = (now: number) => {
    // A hidden tab must not jump the film forward: count at most 100 ms per tick.
    const dt = Math.min(now - prev, 100) / 1000
    prev = now
    time = Math.min(duration, time + dt * rate)
    if (time >= duration) {
      playing = false
      emit()
      return
    }
    emit()
    raf = requestAnimationFrame(tick)
  }

  const clock: FilmClock = {
    duration,
    getTime: () => time,
    getPlaying: () => playing,
    getRate: () => rate,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    seek(t) {
      time = Math.min(Math.max(0, t), duration)
      emit()
    },
    nudge(dt) {
      clock.seek(time + dt)
    },
    play() {
      if (playing) return
      if (time >= duration) time = 0
      playing = true
      prev = performance.now()
      raf = requestAnimationFrame(tick)
      emit()
    },
    pause() {
      if (!playing) return
      playing = false
      cancelAnimationFrame(raf)
      emit()
    },
    toggle() {
      if (playing) clock.pause()
      else clock.play()
    },
    setRate(next) {
      rate = next
      emit()
    },
  }
  return clock
}

export const ClockContext = React.createContext<FilmClock | null>(null)

export function useClock(): FilmClock {
  const clock = React.useContext(ClockContext)
  if (!clock) throw new Error("useClock must be used inside the film room")
  return clock
}

/** The playhead time; re-renders every frame while playing. */
export function useClockTime(): number {
  const clock = useClock()
  return React.useSyncExternalStore(clock.subscribe, clock.getTime, clock.getTime)
}

/** A primitive derived from the time (e.g. the current possession index); re-renders only when it changes. */
export function useClockSelector<T extends string | number | boolean | null>(select: (t: number) => T): T {
  const clock = useClock()
  const get = () => select(clock.getTime())
  return React.useSyncExternalStore(clock.subscribe, get, get)
}

export function useClockPlaying(): boolean {
  const clock = useClock()
  return React.useSyncExternalStore(clock.subscribe, clock.getPlaying, clock.getPlaying)
}

export function useClockRate(): number {
  const clock = useClock()
  return React.useSyncExternalStore(clock.subscribe, clock.getRate, clock.getRate)
}
