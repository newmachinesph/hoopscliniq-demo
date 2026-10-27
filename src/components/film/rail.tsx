"use client"

import {
  ArrowSquareOutIcon,
  ChatCircleIcon,
  CheckIcon,
  CircleNotchIcon,
  FilmStripIcon,
  ListChecksIcon,
  LockSimpleIcon,
  PencilSimpleIcon,
  ScissorsIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react"
import Link from "next/link"
import * as React from "react"

import { PersonAvatar } from "@/components/shell/avatar"
import { BetaChip } from "@/components/ui/beta-chip"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Segmented } from "@/components/ui/segmented"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { relative } from "@/data/clock"
import { type ClipDraft, gameClock, isMake, type Possession, pppBySet, setOptions, timecode } from "@/data/film"
import { me } from "@/data/org"
import { filmAddOn } from "@/data/settings"
import { clipQuality, confidenceLabel } from "@/lib/confidence"
import { cn } from "@/lib/utils"
import { useClock, useClockPlaying, useClockSelector, useClockTime } from "./clock"
import { CourtThumb } from "./court-view"
import { useFilmRoom } from "./film-room-context"
import { MakePlayDialog } from "./make-play-dialog"
import { staffLabel } from "./people"
import { ReviewDraftDialog } from "./review-draft-dialog"
import { hatch } from "./styles"
import { gameElapsedAt, possessionIndexAt } from "./timeline"

type Tab = "comments" | "events" | "plays"

/** Right rail (320px): Comments / Events / Plays. On phone it sits under the player as the same tabs. */
export function FilmRail() {
  const { comments, possessions, drafts } = useFilmRoom()
  const [tab, setTab] = React.useState<Tab>("events")
  const proposed = possessions.filter((p) => p.tag?.status === "proposed").length
  const draftsWaiting = drafts.filter((d) => d.status === "draft").length

  return (
    <aside
      aria-label="Film notes"
      className="flex min-h-[28rem] flex-col rounded-md border border-border bg-surface-1 xl:sticky xl:top-4 xl:h-[calc(100svh-6rem)] xl:min-h-0"
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 flex-1 flex-col gap-0">
        <TabsList variant="line" className="h-11 w-full shrink-0 justify-start gap-0 border-b border-border px-2">
          <TabsTrigger value="comments" className="h-11 flex-1 sm:h-9">
            <ChatCircleIcon aria-hidden /> Comments{" "}
            <span className="tabular-nums text-muted-foreground">{comments.length}</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="h-11 flex-1 sm:h-9">
            <ListChecksIcon aria-hidden /> Events
            {proposed > 0 && (
              <Chip tone="warning" className="ml-0.5">
                {proposed}
              </Chip>
            )}
          </TabsTrigger>
          <TabsTrigger value="plays" className="h-11 flex-1 sm:h-9">
            <FilmStripIcon aria-hidden /> Plays
            {draftsWaiting > 0 && (
              <Chip tone="warning" className="ml-0.5">
                {draftsWaiting}
              </Chip>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="comments" className="flex min-h-0 flex-1 flex-col">
          <CommentsPanel />
        </TabsContent>
        <TabsContent value="events" className="flex min-h-0 flex-1 flex-col">
          <EventsPanel />
        </TabsContent>
        <TabsContent value="plays" className="flex min-h-0 flex-1 flex-col">
          <PlaysPanel onStarted={() => setTab("plays")} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

function stamp(possessions: Possession[], t: number) {
  const { q, clock } = gameClock(gameElapsedAt(possessions, t))
  return `Q${q} ${clock}`
}

// ---------- Comments ----------

function CommentsPanel() {
  const { comments, possessions, addComment } = useFilmRoom()
  const clock = useClock()
  const [body, setBody] = React.useState("")
  const sorted = React.useMemo(() => [...comments].sort((a, b) => a.at - b.at), [comments])
  const activeId = useClockSelector((t) => sorted.find((c) => t >= c.at && t < c.at + 4)?.id ?? null)
  const meLabel = staffLabel(me.id)

  const post = () => {
    const text = body.trim()
    if (!text) return
    addComment(text, Math.round(clock.getTime() * 10) / 10)
    setBody("")
  }

  return (
    <>
      <ol className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {sorted.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No comments yet. Pause on a moment and leave the first note.
          </li>
        )}
        {sorted.map((c) => {
          const who = staffLabel(c.authorId)
          return (
            <li key={c.id} className={cn("px-3 py-3 transition-colors", activeId === c.id && "bg-selection-tint")}>
              <div className="flex items-start gap-2.5">
                <PersonAvatar initials={who.initials} hue={who.hue} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                    <span className="font-semibold">{who.name}</span>
                    <span className="text-xs text-muted-foreground">{relative(c.postedAt)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => clock.seek(c.at)}
                    className="mt-0.5 inline-flex min-h-7 items-center gap-1 rounded-xs bg-surface-2 px-1.5 text-xs font-medium tabular-nums text-foreground-secondary hover:text-foreground"
                  >
                    {timecode(c.at)} · {stamp(possessions, c.at)}
                  </button>
                  <p className="mt-1 text-sm leading-snug text-foreground-secondary">{c.body}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
      <form
        className="shrink-0 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          post()
        }}
      >
        <label htmlFor="film-comment" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PersonAvatar initials={meLabel.initials} hue={meLabel.hue} size={18} className="text-[8px]" />
          Comment at <PlayheadStamp />
        </label>
        <textarea
          id="film-comment"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              post()
            }
          }}
          rows={2}
          placeholder="What should the staff see here?"
          className="mt-1.5 block w-full resize-none rounded-sm border border-input bg-surface-1 px-2.5 py-2 text-md outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring sm:text-sm"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[0.6875rem] text-muted-foreground">Staff only. Ctrl+Enter to post.</span>
          <Button type="submit" size="sm" variant="secondary" disabled={!body.trim()} className="h-11 sm:h-7">
            Post
          </Button>
        </div>
      </form>
    </>
  )
}

function PlayheadStamp() {
  const { possessions } = useFilmRoom()
  const t = useClockTime()
  return (
    <span className="rounded-xs bg-surface-2 px-1 font-medium tabular-nums text-foreground-secondary">
      {timecode(t)} · {stamp(possessions, t)}
    </span>
  )
}

// ---------- Events ----------

type EventFilter = "all" | "us" | "them" | "review"

function EventsPanel() {
  const { film, possessions } = useFilmRoom()
  const clock = useClock()
  const playing = useClockPlaying()
  const [filter, setFilter] = React.useState<EventFilter>("all")
  const [editing, setEditing] = React.useState<string | null>(null)
  const [allSets, setAllSets] = React.useState(false)
  const listRef = React.useRef<HTMLOListElement>(null)
  const current = useClockSelector((t) => possessionIndexAt(possessions, t))
  const currentId = possessions[current]?.id

  const proposed = possessions.filter((p) => p.tag?.status === "proposed")
  // PPP by set counts coach-confirmed tags only: a suggestion waiting for review never reaches a number.
  const confirmed = possessions.filter((p) => p.tag?.status === "confirmed")
  const sets = pppBySet(confirmed)
  const shown = possessions.filter((p) =>
    filter === "all" ? true : filter === "review" ? p.tag?.status === "proposed" : p.side === filter,
  )

  // Follow the playhead while the film plays.
  React.useEffect(() => {
    if (!playing || !currentId) return
    listRef.current?.querySelector(`[data-id="${currentId}"]`)?.scrollIntoView({ block: "nearest" })
  }, [currentId, playing])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-3 border-b border-border p-3">
        <div>
          <h3 className="text-xs font-semibold">{film.us.name} offense by set</h3>
          <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">Sample data · coach-confirmed tags only</p>
          <table className="mt-1.5 w-full text-xs tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-normal">Set</th>
                <th className="w-10 py-1 text-right font-normal">Poss</th>
                <th className="w-9 py-1 text-right font-normal">Pts</th>
                <th className="w-11 py-1 text-right font-normal">PPP</th>
              </tr>
            </thead>
            <tbody>
              {(allSets ? sets : sets.slice(0, 5)).map((row) => (
                <tr key={row.set} className="border-t border-border">
                  <td className="max-w-0 truncate py-1.5 pr-2" title={row.set}>
                    {row.playId ? (
                      <Link href={`/plays/${row.playId}`} className="font-medium hover:underline">
                        {row.set}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.set}</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right">{row.n}</td>
                  <td className="py-1.5 text-right">{row.pts}</td>
                  <td className="py-1.5 text-right font-semibold">{row.ppp.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sets.length > 5 && (
            <button
              type="button"
              onClick={() => setAllSets((v) => !v)}
              className="mt-1 min-h-11 text-xs text-muted-foreground hover:text-foreground md:min-h-7"
            >
              {allSets ? "Show fewer" : `Show all ${sets.length} sets`}
            </button>
          )}
        </div>

        <div className="rounded-sm border border-dashed border-border-strong p-2.5 text-xs">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold">
            <LockSimpleIcon size={13} aria-hidden /> Full-game breakdown
          </p>
          <p className="mt-1 text-foreground-secondary">
            Film add-on · <span className="tabular-nums">${filmAddOn.perGame}</span> a game · {filmAddOn.status}. Until
            then, your staff tags possessions by hand.
          </p>
        </div>

        {proposed.length > 0 && (
          <div className="rounded-sm bg-ai-surface p-2.5 text-xs">
            <p className="flex flex-wrap items-center gap-1.5 font-semibold text-ai-mark">
              <SparkleIcon size={13} weight="fill" aria-hidden /> ClinIQ
              <Chip tone="outline">Suggested · needs review</Chip>
              <BetaChip />
            </p>
            <p className="mt-1 text-foreground-secondary">
              {proposed.length} of {possessions.length} possessions have a ClinIQ suggestion instead of a staff tag.
              They're hatched in the lanes and don't count in reports until a coach confirms them.
            </p>
            <Link
              href="/film/review"
              className="mt-2 inline-flex min-h-11 items-center text-foreground underline-offset-4 hover:underline sm:min-h-7"
            >
              Open the Beta review queue
            </Link>
          </div>
        )}

        <Segmented<EventFilter>
          label="Filter events"
          value={filter}
          onChange={setFilter}
          className="flex w-full [&>button]:flex-1"
          options={[
            { value: "all", label: "All" },
            { value: "us", label: film.us.short },
            { value: "them", label: film.them.short },
            { value: "review", label: `Review ${proposed.length}` },
          ]}
        />
      </div>

      <ol ref={listRef} className="divide-y divide-border">
        {shown.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            {filter === "review"
              ? "Nothing waiting. Every ClinIQ suggestion has been reviewed."
              : "No possessions here."}
          </li>
        )}
        {shown.map((p) => (
          <EventRow
            key={p.id}
            p={p}
            active={p.id === currentId}
            editing={editing === p.id}
            onEdit={() => setEditing(editing === p.id ? null : p.id)}
            onDone={() => setEditing(null)}
            onSeek={() => clock.seek(p.start)}
          />
        ))}
        {film.status === "tagging" && (
          <li className="px-3 py-4 text-xs text-muted-foreground">
            Your staff is still tagging this film. Untagged possessions wait for a coach.
          </li>
        )}
      </ol>
    </div>
  )
}

function EventRow({
  p,
  active,
  editing,
  onEdit,
  onDone,
  onSeek,
}: {
  p: Possession
  active: boolean
  editing: boolean
  onEdit: () => void
  onDone: () => void
  onSeek: () => void
}) {
  const { film, confirmTag, dismissTag, editSet } = useFilmRoom()
  const { q, clock } = gameClock(p.gameStart)
  const proposed = p.tag?.status === "proposed"
  const short = p.side === "us" ? film.us.short : film.them.short
  const options = setOptions(film)

  return (
    <li data-id={p.id} className={cn("relative", active && "bg-selection-tint")}>
      {proposed && <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", hatch)} />}
      <button type="button" onClick={onSeek} className="block w-full px-3 py-2 pl-4 text-left hover:bg-surface-2/60">
        <span className="flex items-center gap-1.5 text-sm">
          <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
            Q{q} {clock}
          </span>
          <Chip tone={p.side === "us" ? "neutral" : "outline"}>{short}</Chip>
          <span className={cn("min-w-0 flex-1 truncate font-medium", !p.tag && "text-muted-foreground")}>
            {p.tag ? p.set : "Untagged"}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs tabular-nums",
              isMake(p.result) ? "font-semibold" : "text-muted-foreground",
            )}
          >
            {p.result}
            {p.points > 0 && ` · +${p.points}`}
          </span>
        </span>
        <span className="mt-0.5 block truncate pl-[3.375rem] text-xs text-muted-foreground">
          {p.actor} · vs {p.defense}
          {p.note ? ` · ${p.note}` : ""}
        </span>
      </button>

      {proposed && p.tag && (
        <div className="flex flex-wrap items-center gap-1 px-3 pb-2 pl-4">
          <Chip tone="outline">
            <SparkleIcon size={10} weight="fill" aria-hidden /> Suggested · needs review
          </Chip>
          <span className="text-[0.6875rem] text-muted-foreground">
            {confidenceLabel(p.tag.confidence * 100)} confidence (illustrative)
          </span>
          <span className="ml-auto" />
          <Button size="xs" variant="secondary" className="h-11 sm:h-6" onClick={() => confirmTag(p.id)}>
            <CheckIcon weight="bold" className="text-success" aria-hidden /> Confirm
          </Button>
          <Button size="xs" variant="outline" className="h-11 sm:h-6" aria-expanded={editing} onClick={onEdit}>
            <PencilSimpleIcon aria-hidden /> Edit
          </Button>
          <Button
            size="xs"
            variant="ghost"
            className="h-11 text-muted-foreground sm:h-6"
            onClick={() => dismissTag(p.id)}
          >
            <XIcon aria-hidden /> Dismiss
          </Button>
        </div>
      )}

      {!p.tag && !editing && (
        <div className="px-3 pb-2 pl-4">
          <Button size="xs" variant="outline" className="h-11 sm:h-6" onClick={onEdit}>
            <PencilSimpleIcon aria-hidden /> Tag it
          </Button>
        </div>
      )}

      {editing && (
        <form
          className="space-y-2 px-3 pb-3 pl-4"
          onSubmit={(e) => {
            e.preventDefault()
            const value = new FormData(e.currentTarget).get("set") as string
            const opt = options.find((o) => o.set === value)
            editSet(p.id, value, opt?.playId)
            onDone()
          }}
        >
          <label className="grid gap-1 text-xs text-muted-foreground">
            Set
            <select
              name="set"
              defaultValue={p.set}
              className="h-11 rounded-sm border border-input bg-surface-1 px-2 text-sm text-foreground sm:h-8"
            >
              {options.map((o) => (
                <option key={o.set}>{o.set}</option>
              ))}
            </select>
          </label>
          <p className="text-[0.6875rem] text-muted-foreground">
            The result comes from the scorebook, so it isn't editable here.
          </p>
          <div className="flex gap-1.5">
            <Button type="submit" size="xs" variant="secondary" className="h-11 sm:h-6">
              Save and confirm
            </Button>
            <Button type="button" size="xs" variant="ghost" className="h-11 sm:h-6" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </li>
  )
}

// ---------- Plays (clip -> play) ----------

function PlaysPanel({ onStarted }: { onStarted: () => void }) {
  const { possessions, drafts } = useFilmRoom()
  const clock = useClock()
  const [making, setMaking] = React.useState<Possession | null>(null)
  const [reviewing, setReviewing] = React.useState<ClipDraft | null>(null)
  const current = useClockSelector((t) => possessionIndexAt(possessions, t))
  const p = possessions[Math.max(0, current)]
  const canMake = Boolean(p?.tag)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="space-y-2 border-b border-border p-3">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
          Clip to play <BetaChip />
        </p>
        <p className="text-sm text-foreground-secondary">
          Clip to play drafts a play from a short clip (15 s or less); you place and fix the players, and nothing is
          saved until you review it. Not yet tested on real amateur footage.
        </p>
        <Button variant="outline" className="h-11 w-full sm:h-8" disabled={!canMake} onClick={() => p && setMaking(p)}>
          <ScissorsIcon aria-hidden /> Make a play from possession {p?.n ?? ""}
        </Button>
        {!canMake && <p className="text-xs text-muted-foreground">Tag this possession first.</p>}
      </div>

      <ol className="divide-y divide-border">
        {drafts.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">
            No plays from this film yet. Pick a possession and make the first one.
          </li>
        )}
        {drafts.map((d) => {
          const source = possessions.find((x) => x.id === d.possessionId)
          const { q, clock: gc } = gameClock(source?.gameStart ?? 0)
          return (
            <li key={d.id} className="flex gap-3 p-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xs bg-brand-navy">
                <CourtThumb dna={d.dna} className="h-full w-full" />
                {d.status === "processing" && (
                  <span className="absolute inset-0 grid place-items-center bg-brand-navy/70 text-white">
                    <CircleNotchIcon size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{d.title}</span>
                  {d.status !== "processing" && <Chip tone="neutral">Demo result</Chip>}
                </p>
                <button
                  type="button"
                  onClick={() => source && clock.seek(source.start)}
                  className="mt-0.5 min-h-6 text-left text-xs text-muted-foreground tabular-nums hover:text-foreground"
                >
                  From Q{q} {gc} · {d.clipLength} s clip
                  {d.status !== "processing" && ` · Clip quality: ${clipQuality(d.quality)}`}
                </button>
                {d.issues.length > 0 && d.status === "draft" && (
                  <p className="mt-0.5 truncate text-xs text-warning">{d.issues[0]}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {d.status === "saved" && (
                    <>
                      <Chip tone="success">
                        <CheckIcon size={10} weight="bold" aria-hidden /> In playbook
                      </Chip>
                      <Link
                        href={d.href}
                        className="inline-flex min-h-7 items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
                      >
                        Open <ArrowSquareOutIcon size={12} aria-hidden />
                      </Link>
                    </>
                  )}
                  {d.status === "draft" && (
                    <>
                      <Chip tone="warning" dot>
                        Needs review
                      </Chip>
                      <Button size="xs" variant="secondary" className="h-11 sm:h-6" onClick={() => setReviewing(d)}>
                        Review draft
                      </Button>
                    </>
                  )}
                  {d.status === "processing" && <Chip tone="neutral">Drafting… about 2 min</Chip>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <MakePlayDialog
        key={making?.id ?? "none"}
        possession={making}
        open={making !== null}
        onOpenChange={(open) => !open && setMaking(null)}
        onStarted={onStarted}
      />
      <ReviewDraftDialog
        key={reviewing?.id ?? "none"}
        draft={reviewing}
        open={reviewing !== null}
        onOpenChange={(open) => !open && setReviewing(null)}
      />
    </div>
  )
}
