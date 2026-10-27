"use client"

import { FlagIcon, ThumbsDownIcon, ThumbsUpIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { SourceCitation } from "@/data/cliniq-answers"
import { cn } from "@/lib/utils"

/** Thumbs up/down and "Report a wrong source" under each answer. Ratings feed ClinIQ's coach-preference memory. */
export function AnswerFeedback({ citations }: { citations: SourceCitation[] }) {
  const [rating, setRating] = React.useState<"up" | "down" | null>(null)
  const [reportOpen, setReportOpen] = React.useState(false)
  const [picked, setPicked] = React.useState<number[]>([])
  const [note, setNote] = React.useState("")
  const id = React.useId()

  const rate = (next: "up" | "down") => {
    const value = rating === next ? null : next
    setRating(value)
    if (value === "up") toast("Thanks. Feedback is not saved in the demo.")
    if (value === "down") toast("Thanks. Feedback is not saved in the demo.")
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Helpful"
        aria-pressed={rating === "up"}
        className={cn("max-md:size-11", rating === "up" ? "text-foreground" : "text-muted-foreground")}
        onClick={() => rate("up")}
      >
        <ThumbsUpIcon weight={rating === "up" ? "fill" : "regular"} aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Not helpful"
        aria-pressed={rating === "down"}
        className={cn("max-md:size-11", rating === "down" ? "text-foreground" : "text-muted-foreground")}
        onClick={() => rate("down")}
      >
        <ThumbsDownIcon weight={rating === "down" ? "fill" : "regular"} aria-hidden />
      </Button>
      {citations.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground max-md:min-h-11"
          onClick={() => setReportOpen(true)}
        >
          <FlagIcon aria-hidden /> Report a wrong source
        </Button>
      )}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report a wrong source</DialogTitle>
            <DialogDescription>
              Pick the sources that don't back up the answer. Your analyst reviews every report.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-1">
            <legend className="sr-only">Sources</legend>
            {citations.map((c, i) => (
              <div
                key={`${c.href}-${i}`}
                className="flex min-h-11 items-center gap-3 rounded-sm px-2 hover:bg-surface-2"
              >
                <Checkbox
                  id={`${id}-source-${i}`}
                  checked={picked.includes(i)}
                  onCheckedChange={(checked) => setPicked((p) => (checked ? [...p, i] : p.filter((n) => n !== i)))}
                />
                <label
                  htmlFor={`${id}-source-${i}`}
                  className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3"
                >
                  <span className="w-5 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.label}</span>
                </label>
              </div>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-note`} className="text-sm font-medium">
              What's wrong? <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id={`${id}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. That clip is from the Harbor City game, not Ridgeline"
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={picked.length === 0}
              onClick={() => {
                setReportOpen(false)
                setPicked([])
                setNote("")
                toast.success("Preview: reported", {
                  description: "Reports are not saved in the demo.",
                })
              }}
            >
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
