"use client"

import * as React from "react"
import { toast } from "sonner"

import { NOW } from "@/data/clock"
import { CLIP_TO_PLAY_CREDITS, type ClipDraft, type Film, type FilmComment, type Possession } from "@/data/film"
import { me, org } from "@/data/org"

// Session state for one film: tag decisions, comments added here, clip-to-play drafts. No backend: it resets on reload.

interface FilmRoomState {
  film: Film
  possessions: Possession[]
  comments: FilmComment[]
  drafts: ClipDraft[]
  /** Org credits left after this session's clip-to-play runs. */
  creditsLeft: number
  confirmTag: (id: string) => void
  confirmMany: (ids: string[]) => void
  dismissTag: (id: string) => void
  editSet: (id: string, set: string, playId?: string) => void
  addComment: (body: string, at: number) => void
  requestPlay: (possession: Possession, range: [number, number]) => void
  saveDraft: (id: string, title: string) => void
}

const FilmRoomContext = React.createContext<FilmRoomState | null>(null)

export function useFilmRoom() {
  const ctx = React.useContext(FilmRoomContext)
  if (!ctx) throw new Error("useFilmRoom must be used inside FilmRoomProvider")
  return ctx
}

export function FilmRoomProvider({ film, children }: { film: Film; children: React.ReactNode }) {
  const [possessions, setPossessions] = React.useState(film.possessions)
  const [comments, setComments] = React.useState(film.comments)
  const [drafts, setDrafts] = React.useState(film.drafts)
  const [spent, setSpent] = React.useState(0)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])

  React.useEffect(() => {
    const pending = timers.current
    return () => {
      for (const t of pending) clearTimeout(t)
    }
  }, [])

  const update = React.useCallback((id: string, fn: (p: Possession) => Possession) => {
    setPossessions((list) => list.map((p) => (p.id === id ? fn(p) : p)))
  }, [])

  const value = React.useMemo<FilmRoomState>(
    () => ({
      film,
      possessions,
      comments,
      drafts,
      creditsLeft: Math.max(0, org.credits.included + org.credits.packs - org.credits.used - spent),
      confirmTag: (id) => update(id, (p) => (p.tag ? { ...p, tag: { ...p.tag, status: "confirmed" } } : p)),
      confirmMany: (ids) => {
        const set = new Set(ids)
        setPossessions((list) =>
          list.map((p) => (set.has(p.id) && p.tag ? { ...p, tag: { ...p.tag, status: "confirmed" } } : p)),
        )
        toast.success(`Confirmed ${ids.length} ${ids.length === 1 ? "tag" : "tags"}`)
      },
      dismissTag: (id) => {
        const before = possessions.find((p) => p.id === id)
        update(id, (p) => ({ ...p, tag: null }))
        toast("Tag dismissed", {
          description: before ? `Possession ${before.n} is untagged now.` : undefined,
          action: before ? { label: "Undo", onClick: () => update(id, () => before) } : undefined,
        })
      },
      editSet: (id, set, playId) =>
        update(id, (p) => ({ ...p, set, playId, tag: { by: "coach", status: "confirmed", confidence: 1 } })),
      addComment: (body, at) =>
        setComments((list) => [
          ...list,
          { id: `c-${Date.now()}`, authorId: me.id, at, body, postedAt: NOW.toISOString() },
        ]),
      requestPlay: (possession, [from, to]) => {
        const id = `d-${Date.now()}`
        const draft: ClipDraft = {
          id,
          possessionId: possession.id,
          title: `${possession.set} · possession ${possession.n}`,
          dna: possession.dna,
          playId: possession.playId,
          href: possession.playId ? `/plays/${possession.playId}` : "/playbook",
          status: "processing",
          quality: 0,
          issues: [],
          clipLength: Math.round(to - from),
          actions: [],
        }
        setDrafts((list) => [draft, ...list])
        setSpent((n) => n + CLIP_TO_PLAY_CREDITS)
        const source = film.drafts.find((d) => d.dna === possession.dna) ?? film.drafts[0]
        timers.current.push(
          setTimeout(() => {
            setDrafts((list) =>
              list.map((d) =>
                d.id === id
                  ? {
                      ...d,
                      status: "draft",
                      quality: 79,
                      issues: ["Low confidence on 1 player (occluded at the screen)"],
                      actions: (source?.actions ?? []).map((a, i) => ({
                        ...a,
                        id: `${id}-a${i + 1}`,
                        confidence: i === 1 ? 0.62 : Math.max(a.confidence, 0.8),
                      })),
                    }
                  : d,
              ),
            )
            toast("Preview: draft play ready", {
              description: "Clip to play (Beta) drafted it. Place and fix the players before it's saved.",
            })
          }, 3500),
        )
      },
      saveDraft: (id, title) =>
        setDrafts((list) => list.map((d) => (d.id === id ? { ...d, title, status: "saved", reviewedBy: me.id } : d))),
    }),
    [film, possessions, comments, drafts, spent, update],
  )

  return <FilmRoomContext.Provider value={value}>{children}</FilmRoomContext.Provider>
}
