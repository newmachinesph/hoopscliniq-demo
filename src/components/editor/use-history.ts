"use client"

import * as React from "react"

const LIMIT = 100

interface History<T> {
  past: T[]
  present: T
  future: T[]
}

/**
 * Undo history for the play being edited. `apply` is one undo step; a drag calls `checkpoint` once at the start and
 * `preview` on every move, so the whole drag undoes in one step.
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = React.useState<History<T>>({ past: [], present: initial, future: [] })

  const apply = React.useCallback((fn: (value: T) => T) => {
    setState((s) => {
      const next = fn(s.present)
      if (next === s.present) return s
      return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [] }
    })
  }, [])
  const checkpoint = React.useCallback(() => {
    setState((s) => ({ past: [...s.past, s.present].slice(-LIMIT), present: s.present, future: [] }))
  }, [])
  const preview = React.useCallback((fn: (value: T) => T) => {
    setState((s) => ({ ...s, present: fn(s.present) }))
  }, [])
  const undo = React.useCallback(() => {
    setState((s) => {
      const prev = s.past.at(-1)
      if (prev === undefined) return s
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future] }
    })
  }, [])
  const redo = React.useCallback(() => {
    setState((s) => {
      const [next, ...rest] = s.future
      if (next === undefined) return s
      return { past: [...s.past, s.present], present: next, future: rest }
    })
  }, [])

  return {
    value: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    apply,
    checkpoint,
    preview,
    undo,
    redo,
  }
}
