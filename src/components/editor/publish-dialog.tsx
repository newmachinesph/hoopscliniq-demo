"use client"

import { BellIcon, CheckIcon, ClockIcon, UsersThreeIcon } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { PersonAvatar } from "@/components/shell/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Chip } from "@/components/ui/chip"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { players } from "@/data/org"
import { ELIGIBLE_COUNT } from "@/data/plays"
import { assignments } from "@/data/portal"

/**
 * Publishing sends the play to players, so it gets the approval treatment: who gets it, what they see, what waits
 * (DIRECTION "Dialog": second confirm for outward actions, consequence in words).
 */
export function PublishDialog({
  open,
  onOpenChange,
  title,
  playId,
  onPublished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  playId?: string
  onPublished: () => void
}) {
  const router = useRouter()
  const [notify, setNotify] = React.useState(true)
  // Next step of the study loop: what a player sees. Plays outside the demo player's assignments open the list.
  const playerHref = assignments.some((a) => a.playId === playId) ? `/study?play=${playId}` : "/study"
  const pending = players.filter((p) => p.consent === "pending")
  const now = players.filter((p) => p.consent !== "pending")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Publish to {ELIGIBLE_COUNT} eligible players</DialogTitle>
          <DialogDescription>
            Varsity Boys get &ldquo;{title}&rdquo; in their app, with its frames and notes. A player whose guardian
            consent is pending gets it once consent arrives. You can unpublish any time.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <UsersThreeIcon size={18} className="mt-0.5 shrink-0 text-foreground-secondary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                <span className="tabular-nums">{now.length}</span> players get it now
              </p>
              <div className="mt-1.5 flex -space-x-1.5">
                {now.map((p) => (
                  <PersonAvatar
                    key={p.id}
                    initials={p.initials}
                    hue={p.avatarHue}
                    size={24}
                    className="ring-2 ring-popover"
                  />
                ))}
              </div>
            </div>
          </li>
          {pending.map((p) => (
            <li key={p.id} className="flex items-start gap-3">
              <ClockIcon size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {p.name}
                  <Chip tone="warning" dot>
                    Consent pending
                  </Chip>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Gets it automatically once a guardian consents.</p>
              </div>
            </li>
          ))}
          <li className="flex items-start gap-3">
            <BellIcon size={18} className="mt-0.5 shrink-0 text-foreground-secondary" aria-hidden />
            <div className="flex flex-1 items-start justify-between gap-3">
              <span>
                <label htmlFor="publish-notify" className="block font-medium">
                  Send a push notification
                </label>
                <span className="block text-xs text-muted-foreground">
                  &ldquo;New play: {title}. Study it before Friday.&rdquo;
                </span>
              </span>
              <Checkbox id="publish-notify" checked={notify} onCheckedChange={(v) => setNotify(v)} className="mt-0.5" />
            </div>
          </li>
        </ul>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              onOpenChange(false)
              onPublished()
              toast.success(`Preview: published to ${now.length} players`, {
                description: pending.length
                  ? `${pending.map((p) => p.name).join(", ")} gets it once consent is granted.`
                  : undefined,
                icon: <CheckIcon weight="bold" aria-hidden />,
                action: { label: "See it as a player", onClick: () => router.push(playerHref) },
              })
            }}
          >
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
