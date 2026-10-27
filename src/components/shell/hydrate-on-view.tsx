"use client"

import * as React from "react"

// Flips after the first page load has hydrated. Sections mounted later (client navigation) render straight away.
let pageHydrated = false

const FOCUSABLE = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])'

/**
 * Server-renders its children but does not hydrate them during page load. The server HTML stays on screen, and the
 * children take over (same markup, now interactive) when the block comes within `rootMargin` of the viewport, or on
 * the first tap or focus inside it. Below-the-fold interactive sections then cost nothing while the page loads.
 * Focus inside the block survives the swap. `force` takes over at once, for blocks the user reveals by state
 * (a pane that was display:none) so the stale server HTML never shows.
 */
export function HydrateOnView({
  children,
  rootMargin = "600px 0px",
  className,
  force = false,
}: {
  children: React.ReactNode
  rootMargin?: string
  className?: string
  force?: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [live, setLive] = React.useState(() => typeof window === "undefined" || pageHydrated)
  const focusIndex = React.useRef(-1)
  if (force && !live) setLive(true)

  React.useEffect(() => {
    pageHydrated = true
  }, [])

  React.useEffect(() => {
    const el = ref.current
    if (live || !el) return
    const wake = () => {
      const active = document.activeElement
      if (active && el.contains(active)) focusIndex.current = [...el.querySelectorAll(FOCUSABLE)].indexOf(active)
      setLive(true)
    }
    el.addEventListener("focusin", wake)
    el.addEventListener("pointerdown", wake)
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && wake(), { rootMargin })
    if (io) io.observe(el)
    else wake()
    return () => {
      io?.disconnect()
      el.removeEventListener("focusin", wake)
      el.removeEventListener("pointerdown", wake)
    }
  }, [live, rootMargin])

  React.useLayoutEffect(() => {
    if (!live || focusIndex.current < 0) return
    ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE)[focusIndex.current]?.focus({ preventScroll: true })
    focusIndex.current = -1
  }, [live])

  return (
    <div ref={ref} className={className}>
      {live ? (
        <div key="live" className="contents">
          {children}
        </div>
      ) : (
        // While hydrating, React keeps an element's server HTML when it is given innerHTML, so nothing inside is
        // hydrated or re-rendered until `live` flips and the keyed swap mounts the real children.
        // biome-ignore lint/security/noDangerouslySetInnerHtml: an empty constant string; it only keeps the server HTML
        <div key="server" className="contents" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
      )}
    </div>
  )
}
