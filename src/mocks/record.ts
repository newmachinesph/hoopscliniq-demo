import type { ID } from "@/data/types"

// Record screen mock (/film/record): phone setup tips and the tag-as-you-go buttons. Nothing is recorded.

/** High school quarters are 8 minutes; overtime is 4. */
export const QUARTER_SECONDS = 8 * 60
export const OT_SECONDS = 4 * 60

export const quarters = ["Q1", "Q2", "Q3", "Q4", "OT"] as const
export type Quarter = (typeof quarters)[number]

/** Where the phone goes and how to frame the court. Shown next to the camera view. */
export const recordTips: { title: string; detail: string }[] = [
  {
    title: "High in the stands near half court, or a high corner",
    detail: "Phone high in the stands near half court, or a high corner, so all ten players stay in frame.",
  },
  { title: "Landscape, locked", detail: "Turn on rotation lock and use a clamp or tripod. Don't zoom." },
  { title: "All ten players in frame", detail: "Line the court up with the guide so every possession stays in view." },
  { title: "Plugged in", detail: "A full game runs well over an hour. Start with a charged phone or a battery pack." },
]

/** Our own play names, in the order a coach reaches for them on Friday: game plan first. */
export const tagPlayIds: ID[] = [
  "horns-flare",
  "five-out-chicago",
  "short-corner-flood",
  "zone-gut",
  "spain-pnr",
  "primary-transition",
  "box-blob",
  "sideline-ob",
]
