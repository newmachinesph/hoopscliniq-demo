// Court calibration: the coach taps four court landmarks on the paused video, either the corners of the painted lane
// (recommended: almost always on screen) or the corners of the attacked half. This file maps a tap on the displayed
// video to clip.mp4 pixels and checks the shape before it is sent. No path aliases here, so a plain Node script can
// import it for a unit check.

/** A point in clip.mp4 pixels: [x, y]. */
export type Point = [number, number]

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export type ObjectFit = "contain" | "cover" | "fill" | "none" | "scale-down"

/** What the four points mark (backend 0.3.1 `landmarks`). */
export type Landmarks = "lane" | "half"

export interface LandmarkSet {
  /** The choice's label in the panel. */
  label: string
  /** Which frame to pick before tapping. */
  frameHint: string
  /** The four points in the order the backend expects (POST /film/jobs/{id}/calibrate). */
  corners: readonly { label: string; tap: string }[]
}

/** The two landmark sets, lane first: it is the recommended one and the default. */
export const LANDMARK_SETS: Record<Landmarks, LandmarkSet> = {
  lane: {
    label: "Lane corners (recommended)",
    frameHint: "Use a frame where the whole painted lane shows",
    corners: [
      { label: "Baseline, left lane corner", tap: "Tap where the left side of the painted lane meets the baseline." },
      { label: "Baseline, right lane corner", tap: "Tap where the right side of the painted lane meets the baseline." },
      { label: "Free-throw line, right end", tap: "Tap the right end of the free-throw line, at the lane's edge." },
      { label: "Free-throw line, left end", tap: "Tap the left end of the free-throw line, at the lane's edge." },
    ],
  },
  half: {
    label: "Half-court corners",
    frameHint: "Use a frame where all four corners of the half court show",
    corners: [
      { label: "Baseline, left corner", tap: "Tap where the baseline meets the left sideline." },
      { label: "Baseline, right corner", tap: "Tap where the baseline meets the right sideline." },
      { label: "Half-court line, right sideline", tap: "Tap where the half-court line meets the right sideline." },
      { label: "Half-court line, left sideline", tap: "Tap where the half-court line meets the left sideline." },
    ],
  },
}

export const LANDMARK_ORDER: readonly Landmarks[] = ["lane", "half"]

/** True when the point lies on the video picture (clip.mp4 pixels, edges included). */
export function insideFrame(p: Point, size: readonly [number, number]): boolean {
  return p[0] >= 0 && p[1] >= 0 && p[0] <= size[0] && p[1] <= size[1]
}

/**
 * Where the video picture sits inside its element box (letterbox or pillarbox bars excluded), and its scale on each
 * axis, for the element's CSS object-fit. `intrinsic` is the video's own size (videoWidth x videoHeight).
 */
export function pictureRect(box: Rect, intrinsic: readonly [number, number], fit: ObjectFit = "contain") {
  const [iw, ih] = intrinsic
  if (!(iw > 0 && ih > 0 && box.width > 0 && box.height > 0)) return null
  let sx: number
  let sy: number
  if (fit === "fill") {
    sx = box.width / iw
    sy = box.height / ih
  } else {
    const contain = Math.min(box.width / iw, box.height / ih)
    const s =
      fit === "cover"
        ? Math.max(box.width / iw, box.height / ih)
        : fit === "none"
          ? 1
          : fit === "scale-down"
            ? Math.min(contain, 1)
            : contain
    sx = s
    sy = s
  }
  const width = iw * sx
  const height = ih * sy
  return {
    left: box.left + (box.width - width) / 2,
    top: box.top + (box.height - height) / 2,
    width,
    height,
    sx,
    sy,
  }
}

/**
 * A tap at (clientX, clientY) on an element showing the video, in clip.mp4 pixels (rounded to 0.1 px). Null when the
 * tap lands on a letterbox bar or outside the picture.
 */
export function clientToClip(
  clientX: number,
  clientY: number,
  box: Rect,
  intrinsic: readonly [number, number],
  fit: ObjectFit = "contain",
): Point | null {
  const pic = pictureRect(box, intrinsic, fit)
  if (!pic) return null
  const x = (clientX - pic.left) / pic.sx
  const y = (clientY - pic.top) / pic.sy
  const [iw, ih] = intrinsic
  if (!(x >= 0 && y >= 0 && x <= iw && y <= ih)) return null
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

/** The SVG preserveAspectRatio that draws clip-pixel coordinates exactly where object-fit puts the picture. */
export function aspectFor(fit: ObjectFit): string {
  if (fit === "fill") return "none"
  if (fit === "cover") return "xMidYMid slice"
  return "xMidYMid meet"
}

/** True when the four points, in order, make a convex quadrilateral (no crossing edges, no three in a line). */
export function isConvexQuad(points: readonly Point[]): boolean {
  if (points.length !== 4) return false
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = points[i] as Point
    const b = points[(i + 1) % 4] as Point
    const c = points[(i + 2) % 4] as Point
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
    if (Math.abs(cross) < 1e-6) return false
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}
