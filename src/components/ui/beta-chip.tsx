import { FlaskIcon } from "@phosphor-icons/react/ssr"

import { Chip } from "@/components/ui/chip"

/** Same Beta chip the agent catalog and playbook menu use (info tone, flask icon). */
export function BetaChip({ className }: { className?: string }) {
  return (
    <Chip tone="info" className={className}>
      <FlaskIcon size={11} aria-hidden /> Beta
    </Chip>
  )
}

/** Marks screens outside the first product (playbook, study, cited answers). Neutral, never orange; they stay clickable in the preview. */
export function RoadmapChip({ className }: { className?: string }) {
  return (
    <Chip tone="neutral" className={className}>
      Roadmap
    </Chip>
  )
}
