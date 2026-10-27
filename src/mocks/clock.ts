// The mock world's "now". Every screen reads dates relative to this so the data never goes stale:
// Tuesday, January 12, 2027, 2:40 PM Central, mid-season, three days before the Westview game.
export const NOW = new Date("2027-01-12T14:40:00-06:00")

const DAY = 86_400_000
/** The mock world runs on Central Standard Time (UTC-6) no matter where the viewer is. */
const CENTRAL_OFFSET = -6 * 3_600_000

/** Day number of an instant on the Central calendar. */
const centralDay = (ms: number) => Math.floor((ms + CENTRAL_OFFSET) / DAY)

/** A date `days` from NOW at the given local time ("15:30"). */
export function at(days: number, time = "00:00"): string {
  // Shifted so the UTC fields read as the Central wall clock.
  const d = new Date(NOW.getTime() + days * DAY + CENTRAL_OFFSET)
  const [h, m] = time.split(":").map(Number)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0")
  const da = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${mo}-${da}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-06:00`
}

export function daysFromNow(iso: string): number {
  return centralDay(new Date(iso).getTime()) - centralDay(NOW.getTime())
}

/** "2h ago", "yesterday", "in 3 days", "Jan 15". */
export function relative(iso: string): string {
  const diff = new Date(iso).getTime() - NOW.getTime()
  const abs = Math.abs(diff)
  const past = diff < 0
  if (abs < 60_000) return "just now"
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000)
    return past ? `${m}m ago` : `in ${m}m`
  }
  if (abs < DAY) {
    const h = Math.round(abs / 3_600_000)
    return past ? `${h}h ago` : `in ${h}h`
  }
  const days = daysFromNow(iso)
  if (days === -1) return "yesterday"
  if (days === 1) return "tomorrow"
  if (Math.abs(days) < 7) return past ? `${-days} days ago` : `in ${days} days`
  return formatDate(iso)
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", ...opts }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  )
}
