"use client"

import { ArrowsOutSimpleIcon, SparkleIcon } from "@phosphor-icons/react"
import Link from "next/link"

import { Conversation } from "@/components/cliniq/conversation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useShell } from "./shell-context"

/** ClinIQ side panel: 400px on the right on desktop, full-height sheet on phone (DIRECTION "Web shell"). */
export function CliniqPanel() {
  const { cliniqOpen, closeCliniq, cliniqPrompt } = useShell()
  return (
    <Sheet open={cliniqOpen} onOpenChange={(open) => !open && closeCliniq()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-[400px]">
        <SheetHeader className="flex-row items-center gap-2 border-b border-border px-4 py-3">
          <SparkleIcon size={18} weight="fill" aria-hidden />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-sm">ClinIQ</SheetTitle>
            <SheetDescription className="text-xs">Varsity Boys · cites every answer</SheetDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open full ClinIQ page"
            className="mr-8"
            nativeButton={false}
            render={<Link href="/cliniq" onClick={closeCliniq} />}
          >
            <ArrowsOutSimpleIcon aria-hidden />
          </Button>
        </SheetHeader>
        <Conversation compact initialPrompt={cliniqPrompt} key={cliniqPrompt ?? "empty"} />
      </SheetContent>
    </Sheet>
  )
}
