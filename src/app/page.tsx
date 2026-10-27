import type { Icon } from "@phosphor-icons/react"
import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  DeviceMobileCameraIcon,
  EyeSlashIcon,
  GithubLogoIcon,
  GraduationCapIcon,
  ListChecksIcon,
  SparkleIcon,
} from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { PipelineStrip } from "@/components/hackathon/pipeline-strip"
import { BuildStatusChip } from "@/components/hackathon/status-chip"
import { SkipLink } from "@/components/shell/skip-link"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Logo } from "@/components/ui/logo"
import {
  consentStep,
  type DemoStep,
  demoFlow,
  hackathon,
  measuredResults,
  modelRows,
  passLines,
  statusAsOf,
} from "@/data/hackathon"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: { absolute: `Hoops ClinIQ · ${hackathon.event} submission` },
  description: hackathon.oneLiner,
}

const askHref = `/cliniq?q=${encodeURIComponent(hackathon.demoQuestion)}`

const linkClass =
  "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline md:min-h-8"

const stepIcons: Record<DemoStep["id"], Icon> = {
  record: DeviceMobileCameraIcon,
  tag: ListChecksIcon,
  ask: ChatCircleTextIcon,
  study: GraduationCapIcon,
  consent: EyeSlashIcon,
}

const themeCards = [
  {
    h: "A coach's problem",
    p: "Coaches film every game on a phone and almost never watch it back, because tagging one game by hand takes hours that a volunteer or high school coach doesn't have.",
  },
  {
    h: "Meta's models, in that world",
    p: "SAM 3.1 follows the ten players through shaky phone footage, and Muse Spark names each play in the coach's own words and answers only when it can cite the clip.",
  },
  {
    h: "Not possible before",
    p: "Until now this took a pro camera rig or a paid tagging service. Promptable video segmentation and an open model we host ourselves bring it to film a coach already has, with kids' data kept in our own tenancy.",
  },
]

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string
  eyebrow?: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-16 border-t border-border py-10 sm:py-14">
      {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
      <h2 id={`${id}-title`} className="mt-0.5 text-xl font-semibold tracking-tight text-balance">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** Home: the public submission page for the Meta hackathon. No shell, no sign-in; it links into the demo at /demo. */
export default function HackathonPage() {
  return (
    <div className="min-h-svh bg-background">
      <SkipLink />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/demo"
            aria-label="Hoops ClinIQ demo app"
            className="inline-flex min-h-11 items-center rounded-sm"
          >
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            {/* The one orange action on this page, pinned at the top while the page scrolls. */}
            <Link href={hackathon.links.demo} className={cn(buttonVariants(), "h-11 sm:h-9")}>
              Open the demo <ArrowRightIcon aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 outline-none sm:px-6">
        <div className="py-10 sm:py-16">
          <p className="text-sm text-muted-foreground">{hackathon.event} · Submission</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {hackathon.oneLiner}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Chip tone="neutral" size="md">
              Theme: {hackathon.theme}
            </Chip>
            <Chip tone="outline" size="md" className="whitespace-normal">
              {hackathon.track}
            </Chip>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={askHref} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}>
              <SparkleIcon weight="fill" aria-hidden /> Try the demo question
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground text-pretty">
            Open demo, no sign-in. Everything you click is sample data for a fictional team, the Lakeshore Lions, and
            nothing is saved.
          </p>
        </div>

        <Section id="theme" eyebrow="Theme" title="Build for Your World">
          <div className="grid gap-4 sm:grid-cols-3">
            {themeCards.map((c) => (
              <div key={c.h} className="rounded-md border border-border bg-surface-1 p-4">
                <h3 className="font-semibold">{c.h}</h3>
                <p className="mt-1.5 text-foreground-secondary text-pretty">{c.p}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="flow" eyebrow="The demo flow" title="Record, tag, ask, study">
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {demoFlow.map((step, i) => {
              const StepIcon = stepIcons[step.id]
              return (
                <li key={step.id} className="flex flex-col rounded-md border border-border bg-surface-1 p-4">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="grid size-6 place-items-center rounded-full bg-surface-2 text-xs font-semibold tabular-nums text-foreground">
                      {i + 1}
                    </span>
                    <StepIcon size={18} aria-hidden />
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1 flex-1 text-foreground-secondary text-pretty">{step.sentence}</p>
                  {/* Outline only: "Open the demo" is the one orange action on this page. */}
                  <Link
                    href={step.href}
                    className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-11 w-full justify-between sm:h-9")}
                  >
                    {step.cta} <ArrowRightIcon aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground text-pretty">
            The demo question, &ldquo;{hackathon.demoQuestion}&rdquo;, gets the sets we ran against Westview&rsquo;s 2-3
            zone, ranked by points per possession, each citing its clip in our own film.
          </p>
          <div className="mt-6 flex flex-col gap-3 rounded-md border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <EyeSlashIcon size={18} aria-hidden /> Consent: {consentStep.title}
              </h3>
              <p className="mt-1 max-w-2xl text-foreground-secondary text-pretty">{consentStep.sentence}</p>
            </div>
            <Link
              href={consentStep.href}
              className={cn(buttonVariants({ variant: "outline" }), "h-11 shrink-0 sm:h-9")}
            >
              {consentStep.cta} <ArrowRightIcon aria-hidden />
            </Link>
          </div>
        </Section>

        <Section id="models" eyebrow={`Status as of ${statusAsOf}`} title="Where Meta's models go">
          <div className="overflow-hidden rounded-md border border-border bg-surface-1">
            <table className="w-full text-left text-sm">
              <thead className="hidden bg-surface-2 text-xs text-muted-foreground md:table-header-group">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Piece
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    What it does in Hoops ClinIQ
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {modelRows.map((m) => (
                  <tr key={m.id} className="grid gap-2 px-4 py-3 md:table-row md:p-0">
                    <th scope="row" className="text-left align-top font-normal md:w-60 md:px-4 md:py-3">
                      <span className="block font-semibold">
                        {m.name}
                        {m.bonus && <span className="font-normal text-muted-foreground"> · bonus</span>}
                      </span>
                      <span className="block text-xs text-muted-foreground">{m.host}</span>
                    </th>
                    <td className="align-top md:px-4 md:py-3">
                      <ul className="grid list-disc gap-0.5 pl-4 text-foreground-secondary">
                        {m.jobs.map((j) => (
                          <li key={j}>{j}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="align-top md:w-48 md:px-4 md:py-3">
                      <BuildStatusChip status={m.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PipelineStrip className="mt-6" />
        </Section>

        <Section id="real" title="What's real and what's sample data">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border bg-surface-1 p-4">
              <h3 className="font-semibold">Today</h3>
              <p className="mt-1.5 text-foreground-secondary text-pretty">
                Everything in this demo is sample data. The team, players, games, clips, tags and every ClinIQ answer
                are fictional and canned; a citation opens the clip, play or screen it cites when that screen is part of
                this demo. No video is processed and nothing is saved. Record and upload say &ldquo;Preview&rdquo; and
                store nothing.
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface-1 p-4">
              <h3 className="font-semibold">This build, {hackathon.buildWindow}</h3>
              <p className="mt-1.5 text-foreground-secondary text-pretty">
                The pipeline is being built now: Modal frames, SAM 3.1 tracking, Muse Spark naming and cited answers.
                Each row above moves from &ldquo;Planned for this build&rdquo; to &ldquo;Live&rdquo; only when it runs
                on real footage. Demo footage is adult or our own, never real minors&rsquo; data.
              </p>
            </div>
          </div>
        </Section>

        <Section id="testing" title="How we test">
          <p className="max-w-2xl text-foreground-secondary text-pretty">
            Tracks and tags are scored against hand-labelled clips. These are the pass lines we hold ourselves to before
            we sell film tagging:
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {passLines.map((p) => (
              <li key={p.id} className="rounded-md border border-border bg-surface-1 px-4 py-3">
                <span className="block text-sm text-muted-foreground">{p.measure}</span>
                <span className="block font-semibold">{p.line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface-1">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="px-4 pt-3 text-left font-semibold">Measured results</caption>
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Measure
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Result
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Clips
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Measured on
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {measuredResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Measured results will be published here.
                    </td>
                  </tr>
                ) : (
                  measuredResults.map((r) => (
                    <tr key={r.measure}>
                      <td className="px-4 py-2">{r.measure}</td>
                      <td className="px-4 py-2 font-semibold tabular-nums">{r.result}</td>
                      <td className="px-4 py-2 tabular-nums">{r.clips}</td>
                      <td className="px-4 py-2">{r.measuredOn}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="team" title="Team, track and links">
          <div className="grid gap-4 md:grid-cols-2">
            <dl className="grid content-start gap-3 rounded-md border border-border bg-surface-1 p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Team</dt>
                <dd className="font-medium">{hackathon.team}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Track</dt>
                <dd className="font-medium">{hackathon.track.replace("Track: ", "")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Submission deadline</dt>
                <dd className="font-medium tabular-nums">{hackathon.deadline}</dd>
              </div>
            </dl>
            <ul className="grid content-start gap-1 rounded-md border border-border bg-surface-1 p-4">
              <li>
                <Link href={hackathon.links.demo} className={linkClass}>
                  <ArrowRightIcon size={14} aria-hidden /> Demo app, coach view
                </Link>
              </li>
              <li>
                {hackathon.links.github ? (
                  <a href={hackathon.links.github} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    <GithubLogoIcon size={14} aria-hidden /> Source on GitHub
                  </a>
                ) : (
                  <span className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground md:min-h-8">
                    <GithubLogoIcon size={14} aria-hidden /> GitHub repository: link added with the submission
                  </span>
                )}
              </li>
            </ul>
          </div>
        </Section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>Sample team data. Fictional teams and players. Nothing is saved.</p>
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  )
}
