// Client-only (hooks, canvas): imported from the client JobView, so no "use client" entry here and `onFrame` may be a
// plain function prop.
import * as React from "react"

import type { Overlay } from "@/lib/film-job"
import { cn } from "@/lib/utils"

// Team colours: the same blue/red split as the court discs, from the status tokens so both themes stay readable.
const TEAM_TOKEN = { offense: "--info", defense: "--danger" } as const
const LABEL_FONT = "600 11px ui-sans-serif, system-ui, sans-serif"
// The ball uses the court diagram's ball colours (hoops-court.js) so the two read as the same object.
const BALL_FILL = "#ea7a2c"
const BALL_RADIUS = { min: 4, max: 9 }

/** Clip frame index at video time t: frame = floor(t * fps), clamped to the clip. */
export function frameAt(t: number, overlay: Pick<Overlay, "fps" | "frames">): number {
  const f = Math.floor(t * overlay.fps)
  return Math.min(Math.max(Number.isFinite(f) ? f : 0, 0), Math.max(overlay.frames - 1, 0))
}

function drawBoxes(canvas: HTMLCanvasElement, overlay: Overlay, frame: number, skip: ReadonlySet<string>) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const [w, h] = overlay.imageSize
  if (!w || !h) return
  const scale = cssW / w
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const style = getComputedStyle(canvas)
  const ink = style.getPropertyValue("--status-foreground").trim() || "#ffffff"
  const colour = {
    offense: style.getPropertyValue(TEAM_TOKEN.offense).trim() || "#2e5aac",
    defense: style.getPropertyValue(TEAM_TOKEN.defense).trim() || "#b42318",
  }
  ctx.font = LABEL_FONT
  ctx.textBaseline = "middle"
  ctx.lineWidth = 2

  for (const [id, player] of Object.entries(overlay.players)) {
    if (skip.has(id)) continue
    const box = player.boxes[frame]
    if (!box) continue
    const [x1, y1, x2, y2] = box
    const x = x1 * scale
    const y = y1 * scale
    const bw = (x2 - x1) * scale
    const bh = (y2 - y1) * scale
    if (y > cssH) continue
    const c = player.team === "defense" ? colour.defense : colour.offense
    ctx.strokeStyle = c
    ctx.strokeRect(x, y, bw, bh)
    // The id tag sits above the box, or inside it when the box touches the top edge.
    const tagW = ctx.measureText(id).width + 8
    const tagH = 15
    const tagY = y - tagH >= 0 ? y - tagH : y
    ctx.fillStyle = c
    ctx.fillRect(x - 1, tagY, tagW, tagH)
    ctx.fillStyle = ink
    ctx.fillText(id, x + 3, tagY + tagH / 2 + 0.5)
  }

  // The ball: a small circle at the centre of its SAM box.
  const ball = overlay.ball?.[frame]
  if (ball) {
    const [x1, y1, x2, y2] = ball
    const r = Math.min(Math.max((Math.min(x2 - x1, y2 - y1) * scale) / 2, BALL_RADIUS.min), BALL_RADIUS.max)
    ctx.beginPath()
    ctx.arc(((x1 + x2) / 2) * scale, ((y1 + y2) / 2) * scale, r, 0, Math.PI * 2)
    ctx.fillStyle = BALL_FILL
    ctx.fill()
    ctx.strokeStyle = ink
    ctx.stroke()
  }
}

/**
 * The pipeline's clip.mp4 with SAM 3.1 boxes drawn on a canvas for the frame on screen. Reports the frame index on every
 * change so the court diagram can follow the video. While `calibrating`, the controls and boxes hide and `children`
 * (the corner-tap layer) sits over the picture. `hiddenIds` are players hidden in the clip for consent: no box for them.
 */
export function ClipOverlay({
  clipUrl,
  overlay,
  onFrame,
  videoRef: outerRef,
  calibrating = false,
  hiddenIds,
  className,
  children,
}: {
  clipUrl: string
  overlay: Overlay
  onFrame?: (frame: number) => void
  /** The caller's handle on the video element (to pause and seek it). */
  videoRef?: React.RefObject<HTMLVideoElement | null>
  calibrating?: boolean
  hiddenIds?: string[]
  className?: string
  children?: React.ReactNode
}) {
  const ownRef = React.useRef<HTMLVideoElement>(null)
  const videoRef = outerRef ?? ownRef
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const onFrameRef = React.useRef(onFrame)
  React.useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])
  const [w, h] = overlay.imageSize
  const hiddenKey = (hiddenIds ?? []).join(",")

  React.useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const skip = new Set(hiddenKey ? hiddenKey.split(",") : [])
    let last = -1
    let raf = 0
    const tick = () => {
      const f = frameAt(video.currentTime, overlay)
      if (f !== last) {
        last = f
        drawBoxes(canvas, overlay, f, skip)
        onFrameRef.current?.(f)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // A resize or theme change needs a redraw of the same frame.
    const redraw = () => {
      last = -1
    }
    const resize = new ResizeObserver(redraw)
    resize.observe(canvas)
    const theme = new MutationObserver(redraw)
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => {
      cancelAnimationFrame(raf)
      resize.disconnect()
      theme.disconnect()
    }
  }, [overlay, videoRef, hiddenKey])

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-md bg-brand-navy", className)}
      style={{ aspectRatio: w && h ? `${w} / ${h}` : "16 / 9" }}
    >
      <video
        ref={videoRef}
        src={clipUrl}
        controls={!calibrating}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 size-full object-contain"
        aria-label={hiddenKey ? "Analyzed clip with selected players hidden" : "Analyzed clip with player boxes"}
      />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 size-full", calibrating && "invisible")}
      />
      {children}
    </div>
  )
}
