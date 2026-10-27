"use client"

import dynamic from "next/dynamic"
import * as React from "react"

import { useShell } from "./shell-context"

// The palette and the ClinIQ panel carry most of the mock data (plays, film, answers). They load the first time they
// open instead of on every page, which keeps phone hydration short.
const CommandPalette = dynamic(() => import("./command-palette").then((m) => m.CommandPalette), { ssr: false })
const CliniqPanel = dynamic(() => import("./cliniq-panel").then((m) => m.CliniqPanel), { ssr: false })

/** Mounts each overlay once it has been opened, then keeps it mounted so closing animates and reopening is instant. */
export function LazyOverlays() {
  const { paletteOpen, cliniqOpen } = useShell()
  const [palette, setPalette] = React.useState(paletteOpen)
  const [cliniq, setCliniq] = React.useState(cliniqOpen)
  if (paletteOpen && !palette) setPalette(true)
  if (cliniqOpen && !cliniq) setCliniq(true)
  return (
    <>
      {cliniq ? <CliniqPanel /> : null}
      {palette ? <CommandPalette /> : null}
    </>
  )
}
