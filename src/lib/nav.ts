import {
  BookOpenTextIcon,
  DeviceMobileCameraIcon,
  FilmStripIcon,
  GraduationCapIcon,
  HouseIcon,
  type Icon,
  ListChecksIcon,
  SparkleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"

// One nav config for the sidebar, the mobile tab bar and the command palette. Every href here has a page.
// Hackathon demo: the core loop only, in demo order (record and tag film, ask ClinIQ, players study).
// Icons: use Phosphor's `*Icon` names (the bare names are deprecated in 2.1.10).

export interface NavItem {
  href: string
  label: string
  Icon: Icon
  badge?: number
  keywords?: string
  /** Child pages. The sidebar shows them while their parent is open; the palette always lists them. */
  sub?: NavItem[]
  /** Set on a flattened sub item: the label of the page it belongs to. */
  parent?: string
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/demo", label: "Demo home", Icon: HouseIcon, keywords: "dashboard demo flow start" },
      { href: "/playbook", label: "Playbook", Icon: BookOpenTextIcon, keywords: "plays sets designer" },
      {
        href: "/film",
        label: "Film",
        Icon: FilmStripIcon,
        keywords: "video clips upload tagging",
        sub: [
          {
            href: "/film/record",
            label: "Record",
            Icon: DeviceMobileCameraIcon,
            keywords: "record phone camera game",
          },
          {
            href: "/film/review",
            label: "Review",
            Icon: ListChecksIcon,
            keywords: "review queue assisted tagging confirm tags proposed ai",
          },
        ],
      },
      {
        href: "/cliniq",
        label: "ClinIQ",
        Icon: SparkleIcon,
        keywords: "ai assistant ask answers citations",
      },
      {
        href: "/study",
        label: "Study",
        Icon: GraduationCapIcon,
        keywords: "player study assigned play quiz",
        sub: [
          {
            href: "/study/results",
            label: "Team results",
            Icon: UsersThreeIcon,
            keywords: "study results quiz coach",
          },
        ],
      },
    ],
  },
]

/** Bottom tabs on phone: five, labeled (DIRECTION "Mobile tabs"). */
export const mobileTabs = ["/demo", "/playbook", "/film", "/cliniq", "/study"]

/** Every page in the nav, sub pages included (tabs and the command palette look pages up here). */
export const allNavItems: NavItem[] = navGroups.flatMap((g) =>
  g.items.flatMap((i) => [i, ...(i.sub ?? []).map((s) => ({ ...s, parent: i.label }))]),
)

/** Path prefixes that exist in the hackathon demo. Sources that point anywhere else render as plain labels. */
const demoPrefixes = ["/demo", "/playbook", "/plays", "/film", "/cliniq", "/study"]

export function inDemo(href: string) {
  const path = href.split(/[?#]/)[0] ?? href
  return path === "/" || demoPrefixes.some((p) => isActive(path, p))
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** The one href that should look active: the longest match, so /film/record doesn't also light up /film. */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs.filter((h) => isActive(pathname, h)).sort((a, b) => b.length - a.length)[0]
}
