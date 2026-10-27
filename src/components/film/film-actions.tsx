"use client"

import { ShareNetworkIcon, SparkleIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { useShell } from "@/components/shell/shell-context"
import { Button } from "@/components/ui/button"

/** Header actions on a film: ask ClinIQ about it, share a staff link. */
export function FilmActions({ prompt }: { prompt: string }) {
  const { openCliniq } = useShell()
  return (
    <>
      <Button variant="outline" onClick={() => openCliniq(prompt)} className="h-11 sm:h-8">
        <SparkleIcon weight="fill" aria-hidden /> Ask ClinIQ
      </Button>
      <Button
        variant="ghost"
        className="h-11 sm:h-8"
        onClick={() => {
          void navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
          toast("Staff link copied", { description: "Only Lakeshore staff with Film access can open it." })
        }}
      >
        <ShareNetworkIcon aria-hidden /> Share
      </Button>
    </>
  )
}
