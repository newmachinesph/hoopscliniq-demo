"use client"

import { ArrowClockwiseIcon, HouseIcon, type Icon, MagnifyingGlassIcon, WarningCircleIcon } from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { LogoMark } from "@/components/ui/logo"
import { cn } from "@/lib/utils"
import { useShell } from "./shell-context"

/** Centered full-panel message for errors and missing pages: 48px icon, a title that says what happened, one action. */
export function StatusScreen({
  Icon,
  code,
  title,
  body,
  children,
  brand = false,
}: {
  Icon: Icon
  code?: string
  title: string
  body: React.ReactNode
  children?: React.ReactNode
  /** Show the logo on top, for screens that render outside the app shell. */
  brand?: boolean
}) {
  return (
    <div className="mx-auto flex min-h-[60svh] w-full max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {brand && <LogoMark size={36} className="mb-8" />}
      <span className="grid size-12 place-items-center rounded-full border border-border bg-surface-2 text-foreground-secondary">
        <Icon size={24} aria-hidden />
      </span>
      {code && <p className="mt-4 text-xs font-medium tracking-wide text-muted-foreground tabular-nums">{code}</p>}
      <h1 className={cn("text-xl font-semibold tracking-tight text-balance", code ? "mt-1" : "mt-4")}>{title}</h1>
      <div className="mt-2 text-sm text-foreground-secondary text-pretty">{body}</div>
      {children && <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:flex-row">{children}</div>}
    </div>
  )
}

const actionSize = "h-11 sm:h-9 sm:px-4"

/** Shared body of every error.tsx boundary: friendly words, a retry, a way home. Details go to the console. */
export function ErrorState({
  error,
  retry,
  homeHref,
  homeLabel,
  brand = false,
}: {
  error: unknown
  retry: () => void
  homeHref: string
  homeLabel: string
  brand?: boolean
}) {
  React.useEffect(() => {
    console.error(error)
  }, [error])
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined

  return (
    <StatusScreen
      Icon={WarningCircleIcon}
      brand={brand}
      title="This screen didn't load"
      body={
        <>
          <p>Nothing you entered was lost. Try again, and if it keeps happening, tell us at support@hoopscliniq.com.</p>
          {digest && <p className="mt-2 text-xs text-muted-foreground tabular-nums">Reference {digest}</p>}
        </>
      }
    >
      <Button className={actionSize} onClick={() => retry()}>
        <ArrowClockwiseIcon aria-hidden /> Try again
      </Button>
      <Link href={homeHref} className={cn(buttonVariants({ variant: "outline" }), actionSize)}>
        <HouseIcon aria-hidden /> {homeLabel}
      </Link>
    </StatusScreen>
  )
}

/** Shared body of the not-found pages. */
export function NotFoundState({ brand = false, onSearch }: { brand?: boolean; onSearch?: () => void }) {
  return (
    <StatusScreen
      Icon={MagnifyingGlassIcon}
      brand={brand}
      code="404"
      title="We couldn't find that page"
      body="The link may be old, or the play, film or player was moved. Search for it, or head back home."
    >
      {onSearch ? (
        <Button className={actionSize} onClick={onSearch}>
          <MagnifyingGlassIcon aria-hidden /> Search
        </Button>
      ) : null}
      <Link href="/demo" className={cn(buttonVariants({ variant: onSearch ? "outline" : "default" }), actionSize)}>
        <HouseIcon aria-hidden /> Go to Home
      </Link>
    </StatusScreen>
  )
}

/** Not-found inside the staff shell: the primary action opens the command palette. */
export function AppNotFound() {
  const { setPaletteOpen } = useShell()
  return <NotFoundState onSearch={() => setPaletteOpen(true)} />
}
