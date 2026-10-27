import { CheckCircleIcon, ClockIcon, ProhibitIcon, RulerIcon, UserCheckIcon } from "@phosphor-icons/react/ssr"
import type { Metadata } from "next"
import Link from "next/link"

import { CliniqTabs } from "@/components/cliniq/cliniq-tabs"
import { PageBody, PageHeader } from "@/components/shell/page-header"
import { Chip } from "@/components/ui/chip"
import { type LimitGroup, type LimitStatus, limitGroups, limitStatusLabels } from "@/data/limits"

export const metadata: Metadata = { title: "What ClinIQ can do · ClinIQ" }

const statusTone: Record<LimitStatus, "success" | "info" | "neutral"> = {
  preview: "success",
  beta: "info",
  coming: "neutral",
  never: "neutral",
}

const groupIcon: Record<LimitGroup["id"], typeof CheckCircleIcon> = {
  today: CheckCircleIcon,
  review: UserCheckIcon,
  "not-yet": ClockIcon,
}

export default function CliniqLimitsPage() {
  return (
    <PageBody>
      <CliniqTabs className="border-b border-border" />
      <PageHeader
        eyebrow="ClinIQ"
        title="What ClinIQ can and can't do yet"
        description="A plain list, so you know when to trust it and when to check. In preview: built and clickable in the preview with sample data; not yet running on real teams. Statuses use the same words as the agents page. Status as of October 2026."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {limitGroups.map((g) => {
          const Icon = groupIcon[g.id]
          return (
            <section
              key={g.id}
              aria-labelledby={`g-${g.id}`}
              className="rounded-lg border border-border bg-surface-1 p-4"
            >
              <h2 id={`g-${g.id}`} className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold">
                <Icon size={18} aria-hidden /> {g.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">{g.blurb}</p>
              <ul className="mt-3 space-y-3">
                {g.items.map((item) => (
                  <li key={item.title} className="border-t border-border pt-3">
                    <p className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{item.title}</span>
                      <Chip tone={statusTone[item.status]} dot={item.status !== "never"}>
                        {item.status === "never" && <ProhibitIcon size={11} aria-hidden />}
                        {limitStatusLabels[item.status]}
                      </Chip>
                    </p>
                    <p className="mt-1 text-sm text-foreground-secondary text-pretty">{item.why}</p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <section aria-labelledby="measure" className="rounded-lg border border-border bg-surface-1 p-4">
        <h2 id="measure" className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold">
          <RulerIcon size={18} aria-hidden /> How we measure
        </h2>
        <ul className="mt-2 max-w-prose list-disc space-y-1.5 pl-5 text-sm text-foreground-secondary">
          <li className="text-pretty">Tags are checked against what coaches confirm or fix in the review queue.</li>
          <li className="text-pretty">Agreement is reported per team, from that team's own review history.</li>
          <li className="text-pretty">
            We publish accuracy only after we measure it on real games. Until that evaluation passes, we publish no
            accuracy percentage.
          </li>
        </ul>
        <h3 className="mt-4 text-sm font-semibold">Privacy and access, planned</h3>
        <ul className="mt-2 max-w-prose list-disc space-y-1.5 pl-5 text-sm text-foreground-secondary">
          <li className="text-pretty">
            Players under 13 join through a verified parental consent step (In preview): the guardian signs a consent
            form and enters a one-time code. A $0.50 card check is Coming 2027. We are designing for the amended COPPA
            Rule with counsel.
          </li>
          <li className="text-pretty">
            Districts: a signed data processing agreement per district (SDPC National DPA) is planned. Illinois needs
            one under SOPPA.
          </li>
          <li className="text-pretty">
            Designed toward WCAG 2.1 AA; not yet audited. VPAT planned before district sales.
          </li>
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/film/review" className="min-h-11 text-foreground underline-offset-4 hover:underline">
            Open the Beta review queue
          </Link>
        </p>
      </section>
    </PageBody>
  )
}
