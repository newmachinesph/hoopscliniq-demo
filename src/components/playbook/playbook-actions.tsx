"use client"

import {
  CameraIcon,
  CaretDownIcon,
  FilmStripIcon,
  PlusIcon,
  SparkleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { BetaChip } from "@/components/ui/beta-chip"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const PHOTO_CREDITS = 10

/** Header actions: Add plays (whiteboard photo, film clip) and New play, the one orange button. */
export function PlaybookActions() {
  const router = useRouter()
  const photo = React.useRef<HTMLInputElement>(null)

  const onPhoto = (file: File | undefined) => {
    if (!file) return
    toast("Preview: ClinIQ is drawing your whiteboard", {
      description: `${file.name} · ${PHOTO_CREDITS} credits. You'll review the play before it's saved.`,
      icon: <SparkleIcon weight="fill" aria-hidden />,
    })
  }

  return (
    <>
      <input
        ref={photo}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onPhoto(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" className="max-sm:h-11" />}>
          <UploadSimpleIcon aria-hidden /> Add plays <CaretDownIcon size={12} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>Add plays from</DropdownMenuLabel>
          <DropdownMenuItem className="items-start py-2" onClick={() => photo.current?.click()}>
            <CameraIcon className="mt-0.5" aria-hidden />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                Photo of whiteboard <BetaChip />
              </span>
              <span className="block text-xs text-muted-foreground">
                <SparkleIcon size={11} weight="fill" className="mr-0.5 inline align-[-1px]" aria-hidden />
                Beta: you confirm every player and path · <span className="tabular-nums">{PHOTO_CREDITS} credits</span>
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="items-start py-2" onClick={() => router.push("/film")}>
            <FilmStripIcon className="mt-0.5" aria-hidden />
            <span>
              <span className="flex items-center gap-1.5 font-medium">
                Clip to play <BetaChip />
              </span>
              <span className="block text-xs text-muted-foreground">
                Drafts a play from a short clip; you place and fix the players
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button nativeButton={false} className="max-sm:h-11" render={<Link href="/plays/new" />}>
        <PlusIcon weight="bold" aria-hidden /> New play
      </Button>
    </>
  )
}
