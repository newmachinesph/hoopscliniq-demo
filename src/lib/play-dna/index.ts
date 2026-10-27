// Hand-drawn Play DNA plays (authored, no source clip; play.json + labels.json) copied from the content workspace's plays/half-court/, the same files the
// reels are rendered from. Marketing shows these; the app screens still use the editable mock plays in lib/plays.ts.
import floppyLabels from "./floppy.labels.json"
import floppy from "./floppy.play.json"
import hammerLabels from "./hammer.labels.json"
import hammer from "./hammer.play.json"
import hornsTwistLabels from "./horns-twist.labels.json"
import hornsTwist from "./horns-twist.play.json"
import spainLabels from "./spain-pnr.labels.json"
import spain from "./spain-pnr.play.json"

export interface DnaPlay {
  id: string
  title: string
  play: { name: string; moments: { frame: number; label: string }[] }
  labels: { verdicts: unknown[] }
}

export const dnaPlays: DnaPlay[] = [
  { id: "spain-pnr", title: "Spain Pick and Roll", play: spain, labels: spainLabels },
  { id: "horns-twist", title: "Horns Twist", play: hornsTwist, labels: hornsTwistLabels },
  { id: "hammer", title: "Hammer", play: hammer, labels: hammerLabels },
  { id: "floppy", title: "Floppy", play: floppy, labels: floppyLabels },
]
