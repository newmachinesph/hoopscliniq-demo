"use client"

import { ClockCounterClockwiseIcon, NotePencilIcon, SidebarSimpleIcon } from "@phosphor-icons/react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { type CliniqAnswer, type CliniqThread, threads } from "@/data/cliniq-answers"
import { relative } from "@/data/clock"
import { cn } from "@/lib/utils"
import { CliniqTabs } from "./cliniq-tabs"
import { Conversation } from "./conversation"
import { SourcesPanel, type SourcesTab } from "./sources-panel"

const groups: CliniqThread["group"][] = ["Today", "This week", "Earlier"]
const WIDE_QUERY = "(min-width: 1280px)"

function ThreadList({
  activeId,
  onSelect,
  onNew,
}: {
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start max-md:min-h-11" onClick={onNew}>
          <NotePencilIcon aria-hidden /> New chat
        </Button>
      </div>
      <nav aria-label="ClinIQ threads" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          const items = threads.filter((t) => t.group === group)
          if (items.length === 0) return null
          return (
            <div key={group}>
              <p className="px-2 pb-1 text-[0.6875rem] font-semibold text-muted-foreground">{group}</p>
              <ul className="space-y-0.5">
                {items.map((t) => {
                  const active = t.id === activeId
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        aria-current={active ? "true" : undefined}
                        onClick={() => onSelect(t.id)}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2 rounded-sm px-2 text-left text-sm transition-colors md:min-h-9",
                          active
                            ? "bg-surface-2 font-medium text-foreground"
                            : "text-foreground-secondary hover:bg-surface-2 hover:text-foreground",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate">{t.title}</span>
                        <span className="shrink-0 text-[0.6875rem] text-muted-foreground tabular-nums">
                          {relative(t.updated)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * The full ClinIQ page: thread history on the left, the conversation in the middle, and the Activity / Sources rail on
 * the right at 1280px and up (a sheet below that).
 */
export function CliniqWorkspace({ initialPrompt }: { initialPrompt?: string | null }) {
  // A ?q= prompt starts a new chat; otherwise open the most recent thread.
  const [threadId, setThreadId] = React.useState<string | null>(initialPrompt ? null : (threads[0]?.id ?? null))
  const [chatKey, setChatKey] = React.useState(0)
  const [prompt, setPrompt] = React.useState<string | null>(initialPrompt ?? null)
  const [answer, setAnswer] = React.useState<CliniqAnswer | null>(null)
  const [tab, setTab] = React.useState<SourcesTab>("sources")
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [sourcesOpen, setSourcesOpen] = React.useState(false)

  const thread = threads.find((t) => t.id === threadId)

  const selectThread = (id: string) => {
    setThreadId(id)
    setPrompt(null)
    setAnswer(null)
    setHistoryOpen(false)
  }

  const newChat = () => {
    setThreadId(null)
    setPrompt(null)
    setAnswer(null)
    setChatKey((k) => k + 1)
    setHistoryOpen(false)
  }

  const showSources = (next: CliniqAnswer) => {
    setAnswer(next)
    setTab("sources")
    if (!window.matchMedia(WIDE_QUERY).matches) setSourcesOpen(true)
  }

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-0 flex-col overflow-hidden md:h-[calc(100dvh-6.625rem)]">
      <h1 className="sr-only">ClinIQ</h1>
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface-1 px-2 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Thread history"
          className="shrink-0 max-md:size-11 lg:hidden"
          onClick={() => setHistoryOpen(true)}
        >
          <ClockCounterClockwiseIcon aria-hidden />
        </Button>
        <CliniqTabs className="min-w-0 flex-1" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Activity and sources"
          className="shrink-0 max-md:size-11 xl:hidden"
          disabled={!answer}
          onClick={() => setSourcesOpen(true)}
        >
          <SidebarSimpleIcon className="-scale-x-100" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="New chat"
          className="shrink-0 max-md:size-11 lg:hidden"
          onClick={newChat}
        >
          <NotePencilIcon aria-hidden />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="History" className="hidden w-64 shrink-0 flex-col border-r border-border lg:flex">
          <ThreadList activeId={threadId} onSelect={selectThread} onNew={newChat} />
        </aside>

        <Conversation
          key={thread ? thread.id : `new-${chatKey}`}
          initialTurns={thread?.prompts}
          initialPrompt={thread ? null : prompt}
          onAnswer={setAnswer}
          onShowSources={showSources}
          className="min-w-0"
        />

        <aside
          aria-label="Activity and sources"
          className="hidden w-80 shrink-0 flex-col border-l border-border xl:flex"
        >
          <SourcesPanel answer={answer} tab={tab} onTabChange={setTab} className="flex-1" />
        </aside>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[85vw] gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="border-b border-border">
            <SheetTitle>ClinIQ threads</SheetTitle>
          </SheetHeader>
          <ThreadList activeId={threadId} onSelect={selectThread} onNew={newChat} />
        </SheetContent>
      </Sheet>

      <Sheet open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border">
            <SheetTitle>Activity and sources</SheetTitle>
          </SheetHeader>
          <SourcesPanel answer={answer} tab={tab} onTabChange={setTab} className="flex-1" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
