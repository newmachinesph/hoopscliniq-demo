import { ArrowLeftIcon, LockSimpleIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { StudyLoop } from "@/components/home/study-loop"
import { Panel, PanelHeader } from "@/components/insights/panel"
import { PersonAvatar } from "@/components/shell/avatar"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { StudyInsightCard } from "@/components/study/insight-card"
import { BetaChip } from "@/components/ui/beta-chip"
import { Chip } from "@/components/ui/chip"
import { currentTeam, players } from "@/data/org"
import { playerStudyRows, playStudyRows, studyInsight, studyKpis } from "@/data/study"
import { isLocked } from "@/data/team"

export const metadata: Metadata = { title: "Study → Results" }

const kpis = [
  { label: "Plays assigned", value: String(studyKpis.playsAssigned), note: "This season" },
  { label: "Studied", value: `${studyKpis.studiedPct}%`, note: "Of assigned plays, all players" },
  { label: "Quiz accuracy", value: `${studyKpis.quizAccuracy}%`, note: "Across read quizzes" },
]

export default function StudyResultsPage() {
  // Consent-pending players are listed by name, number and position only; their study data never leaves the server.
  const locked = players.filter(isLocked)
  const rows = playerStudyRows.flatMap((r) => {
    const player = players.find((x) => x.id === r.playerId)
    return player && !isLocked(player) ? [{ ...r, player }] : []
  })

  return (
    <PageBody wide>
      <Link
        href="/study"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:min-h-0"
      >
        <ArrowLeftIcon size={14} aria-hidden /> Study
      </Link>
      <PageHeader
        eyebrow={`${currentTeam.name} · ${currentTeam.season}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Study → Results <BetaChip /> <Chip tone="neutral">Sample data</Chip>
          </span>
        }
        description="Does studying a play show up in games? Playbook study, quizzes and film tags side by side."
      />

      <dl className="grid grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-surface-1 p-3 sm:p-4">
            <dt className="text-xs text-muted-foreground">{k.label}</dt>
            <dd className="mt-0.5 text-2xl font-semibold tabular-nums">{k.value}</dd>
            <dd className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{k.note}</dd>
          </div>
        ))}
      </dl>

      <StudyInsightCard insight={studyInsight} />

      <StudyLoop current={4} />

      <Panel aria-labelledby="by-play">
        <PanelHeader
          id="by-play"
          title="Points per possession, by play"
          description="When all five on the floor had studied the play, against when they hadn't."
        />
        <ul className="mt-3 divide-y divide-border">
          {playStudyRows.map((r) => {
            const diff = r.studied.ppp - r.notStudied.ppp
            return (
              <li
                key={r.playId}
                className="grid gap-2 px-4 py-3 md:grid-cols-[12rem_1fr_6rem] md:items-center md:gap-4"
              >
                <Link
                  href={`/plays/${r.playId}`}
                  className="min-h-11 content-center font-semibold hover:underline md:min-h-0"
                >
                  {r.title}
                </Link>
                <div className="space-y-1.5">
                  {(
                    [
                      ["Studied", r.studied, true],
                      ["Not studied", r.notStudied, false],
                    ] as const
                  ).map(([label, v, strong]) => (
                    <div key={label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 text-sm">
                      <span className="text-foreground-secondary">{label}</span>
                      <span
                        role="img"
                        aria-label={`${label}: ${v.ppp.toFixed(2)} points per possession on ${v.runs} runs`}
                        className="h-2 overflow-hidden rounded-full bg-surface-2"
                      >
                        <span
                          className={
                            strong
                              ? "block h-full rounded-full bg-foreground"
                              : "block h-full rounded-full bg-muted-foreground/50"
                          }
                          style={{ width: `${Math.min(100, (v.ppp / 1.4) * 100)}%` }}
                        />
                      </span>
                      <span className="min-w-[5.5rem] text-right tabular-nums">
                        <span className={strong ? "font-semibold" : undefined}>{v.ppp.toFixed(2)}</span>{" "}
                        <span className="text-xs text-muted-foreground">on {v.runs} runs</span>
                      </span>
                    </div>
                  ))}
                </div>
                <Chip tone={diff >= 0 ? "success" : "danger"} className="w-fit md:justify-self-end">
                  {diff >= 0 ? "+" : "−"}
                  {Math.abs(diff).toFixed(2)} PPP
                </Chip>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel aria-labelledby="by-player">
        <PanelHeader
          id="by-player"
          title="By player"
          description="Study progress, quiz accuracy and plays run correctly, from film tags a coach confirmed."
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">
                  Player
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Studied
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Quiz
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Run correctly
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ player: p, ...r }) => (
                <tr key={p.id}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    <span className="flex min-h-9 items-center gap-2">
                      <PersonAvatar initials={p.initials} hue={p.avatarHue} size={24} />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">#{p.number}</span>
                    </span>
                  </th>
                  <td className="px-2 py-2 text-right tabular-nums">{r.studyPct}%</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.quizPct}%</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.executed.right} of {r.executed.of}
                  </td>
                </tr>
              ))}
              {locked.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    <span className="flex min-h-9 items-center gap-2">
                      <PersonAvatar initials={p.initials} hue={p.avatarHue} size={24} />
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        #{p.number} · {p.position}
                      </span>
                    </span>
                  </th>
                  <td colSpan={3} className="px-4 py-2 text-right text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <LockSimpleIcon size={13} aria-hidden /> Consent pending, no data
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p className="text-pretty">
          <span className="font-semibold text-foreground-secondary">Why this matters.</span> This only exists because
          your playbook, your film and your players' study live in one place. A tool that holds only one of them can't
          draw the line between them.
        </p>
        <p className="text-pretty">
          Correlation, not proof: these are small samples, and players who study more may also practice more. Use it to
          start a conversation, not to rank players.
        </p>
      </div>
    </PageBody>
  )
}
