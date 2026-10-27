import { CheckCircleIcon, ClockIcon, EyeIcon, FlaskIcon, HourglassIcon } from "@phosphor-icons/react/ssr"

import { Chip } from "@/components/ui/chip"
import { type BuildStatus, buildStatusLabel } from "@/data/hackathon"

const look = {
  live: { tone: "success", Icon: CheckCircleIcon },
  planned: { tone: "outline", Icon: ClockIcon },
  "in-preview": { tone: "neutral", Icon: EyeIcon },
  beta: { tone: "info", Icon: FlaskIcon },
  "coming-2027": { tone: "neutral", Icon: HourglassIcon },
} as const

/** Build status chip for the hackathon pipeline: a word plus an icon, never color alone, never orange. */
export function BuildStatusChip({ status, className }: { status: BuildStatus; className?: string }) {
  const { tone, Icon } = look[status]
  return (
    <Chip tone={tone} className={className}>
      <Icon size={11} weight={status === "live" ? "bold" : "regular"} aria-hidden /> {buildStatusLabel[status]}
    </Chip>
  )
}
