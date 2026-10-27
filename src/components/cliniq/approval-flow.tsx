"use client"

import { ArrowDownIcon, ArrowUUpLeftIcon, CheckIcon, PencilSimpleIcon, XIcon } from "@phosphor-icons/react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type DecisionState = "waiting" | "approved" | "rejected"

export interface ApprovalPreview {
  from?: string
  to: string
  items?: string[]
}

export interface Decision {
  reason?: string
  edited?: boolean
}

/** The from -> to preview of an approval. Proposed content is tinted and tagged so it never reads as saved data. */
export function PreviewBlock({
  preview,
  draft,
  editing,
  onDraftChange,
  inputId,
}: {
  preview: ApprovalPreview
  draft: string
  editing: boolean
  onDraftChange: (value: string) => void
  inputId: string
}) {
  return (
    <div className="space-y-1.5">
      {preview.from && (
        <>
          <div className="rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground">
            <span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide">Now</span>
            <span className="line-through decoration-border-strong">{preview.from}</span>
          </div>
          <ArrowDownIcon size={14} className="mx-auto block text-muted-foreground" aria-label="changes to" />
        </>
      )}
      <div className="rounded-sm bg-ai-surface px-3 py-2 text-sm text-foreground-secondary">
        <span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {preview.from ? "Suggested" : "Draft"}
        </span>
        {editing ? (
          <>
            <label htmlFor={inputId} className="sr-only">
              Edit the draft
            </label>
            <Textarea
              id={inputId}
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              className="mt-1 bg-background text-sm"
              autoFocus
            />
          </>
        ) : (
          <p className="whitespace-pre-line">{draft}</p>
        )}
        {preview.items && (
          <ul className="mt-1.5 space-y-1">
            {preview.items.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-current" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/**
 * Approve / Edit / Reject for one AI proposal (DIRECTION "Approval card"). Reject asks for an optional reason;
 * outward messages (`confirm`) get a second confirm that states the consequence; everything else is one click + Undo.
 */
export function ApprovalFlow({
  title,
  to,
  preview,
  confirm,
  status,
  onDecide,
  primary = false,
  className,
}: {
  title: string
  to: string
  preview?: ApprovalPreview
  confirm?: string
  status: DecisionState
  onDecide: (status: DecisionState, decision?: Decision) => void
  /** The sheet's Approve is the view's one orange button; inline cards stay secondary. */
  primary?: boolean
  className?: string
}) {
  const id = React.useId()
  const [draft, setDraft] = React.useState(preview?.to ?? "")
  const [editing, setEditing] = React.useState(false)
  const [rejecting, setRejecting] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [note, setNote] = React.useState("")
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const edited = preview !== undefined && draft.trim() !== preview.to.trim()

  const approve = () => {
    setEditing(false)
    onDecide("approved", { edited })
    if (confirm) {
      toast.success("Preview: approved, nothing sent", { description: `${title}${edited ? ", with your edits" : ""}` })
    } else {
      toast.success("Preview: approved", {
        description: title,
        action: { label: "Undo", onClick: () => onDecide("waiting") },
      })
    }
  }

  const reject = () => {
    const why = reason.trim()
    setRejecting(false)
    onDecide("rejected", { reason: why || undefined })
    toast("Rejected", {
      description: why ? "ClinIQ will use your reason for its next draft." : title,
      action: { label: "Undo", onClick: () => onDecide("waiting") },
    })
  }

  return (
    <div className={cn("space-y-3", className)}>
      {preview && (
        <PreviewBlock
          preview={preview}
          draft={draft}
          editing={editing && status === "waiting"}
          onDraftChange={setDraft}
          inputId={`${id}-draft`}
        />
      )}
      {/* Without a draft to edit in place, Edit means telling the agent what to change. */}
      {!preview && editing && status === "waiting" && (
        <div className="space-y-2">
          <label htmlFor={`${id}-note`} className="text-sm font-medium">
            Tell ClinIQ what to change
          </label>
          <Textarea
            id={`${id}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Keep it to two plays and skip the quiz"
            className="text-sm"
            autoFocus
          />
          <Button
            size="sm"
            variant="outline"
            className="max-md:min-h-11"
            disabled={!note.trim()}
            onClick={() => {
              setEditing(false)
              setNote("")
              toast("Preview: ClinIQ is redrafting", {
                description: "The new version will replace this one for approval.",
              })
            }}
          >
            Redraft
          </Button>
        </div>
      )}
      {edited && status === "waiting" && !editing && (
        <p className="text-xs text-muted-foreground">Edited. Approval will send your version.</p>
      )}

      {status === "waiting" && !rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size={primary ? "default" : "sm"}
            variant={primary ? "default" : "secondary"}
            className="font-semibold max-md:min-h-11"
            onClick={() => (confirm ? setConfirmOpen(true) : approve())}
          >
            <CheckIcon weight="bold" className={primary ? undefined : "text-success"} aria-hidden />
            {edited ? "Approve with edits" : "Approve"}
          </Button>
          <Button
            size={primary ? "default" : "sm"}
            variant="outline"
            className="max-md:min-h-11"
            aria-pressed={editing}
            onClick={() => setEditing((e) => !e)}
          >
            <PencilSimpleIcon aria-hidden /> {editing ? "Done editing" : "Edit"}
          </Button>
          <Button
            size={primary ? "default" : "sm"}
            variant="ghost"
            className="ml-auto text-muted-foreground max-md:min-h-11"
            onClick={() => setRejecting(true)}
          >
            <XIcon aria-hidden /> Reject
          </Button>
        </div>
      )}

      {status === "waiting" && rejecting && (
        <div className="space-y-2 rounded-sm border border-border p-3">
          <label htmlFor={`${id}-reason`} className="text-sm font-medium">
            Why are you rejecting it? <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            id={`${id}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Too much contact work for Thursday"
            className="text-sm"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">ClinIQ remembers why, so its next draft fits better.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="max-md:min-h-11" onClick={reject}>
              <XIcon aria-hidden /> Reject
            </Button>
            <Button size="sm" variant="ghost" className="max-md:min-h-11" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* A sent message can't be undone; everything else can. */}
      {(status === "rejected" || (status === "approved" && !confirm)) && (
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDecide("waiting")}>
          <ArrowUUpLeftIcon aria-hidden /> Undo
        </Button>
      )}

      {confirm && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Send to {to}?</DialogTitle>
              <DialogDescription>{confirm}</DialogDescription>
            </DialogHeader>
            {preview && (
              <p className="max-h-40 overflow-y-auto rounded-sm bg-surface-2 p-3 text-sm whitespace-pre-line text-foreground-secondary">
                {draft}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Go back
              </Button>
              <Button
                onClick={() => {
                  setConfirmOpen(false)
                  approve()
                }}
              >
                Send now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
