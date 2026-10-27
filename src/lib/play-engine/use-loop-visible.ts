"use client"

import * as React from "react"

/**
 * True while the element is on screen and the tab is visible, so rAF loops only run when someone can see them.
 * Attach `ref` to the element; with no element yet it reports visible.
 */
export function useLoopVisible<T extends Element = Element>() {
  const [el, setEl] = React.useState<T | null>(null)
  const [onScreen, setOnScreen] = React.useState(true)
  const [tabVisible, setTabVisible] = React.useState(true)

  React.useEffect(() => {
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? true))
    io.observe(el)
    return () => io.disconnect()
  }, [el])

  React.useEffect(() => {
    const sync = () => setTabVisible(!document.hidden)
    sync()
    document.addEventListener("visibilitychange", sync)
    return () => document.removeEventListener("visibilitychange", sync)
  }, [])

  return { ref: setEl, visible: onScreen && tabVisible }
}
