// Shared mock-data types. Every module's mock file (src/mocks/<module>.ts) builds on these IDs so screens cross-link:
// a clip cites a play, an AI answer cites a clip, an approval names a player. No backend yet; shapes follow
// hoops-cliniq/tech/DATA-MODEL.md where a table exists.

export type ID = string
/** ISO 8601 date-time, e.g. "2027-01-12T15:30:00-06:00". */
export type ISODate = string

export type Plan = "free" | "coach" | "team" | "program"

export type Role =
  | "owner"
  | "director"
  | "head_coach"
  | "assistant_coach"
  | "scout"
  | "analyst"
  | "trainer"
  | "manager"
  | "player"
  | "parent"

export interface Org {
  id: ID
  name: string
  short: string
  kind: "high_school" | "club" | "college" | "academy"
  city: string
  plan: Plan
  /** Pooled monthly AI credits (PRICING.md). */
  credits: { used: number; included: number; packs: number; resetsOn: ISODate }
  videoHours: { used: number; included: number }
  mascot: string
  colors: { primary: string; secondary: string }
}

export interface Team {
  id: ID
  orgId: ID
  name: string
  short: string
  level: "varsity" | "jv" | "freshman" | "17u" | "16u" | "15u" | "14u"
  gender: "boys" | "girls"
  season: string
  record: { w: number; l: number; conf: string }
  headCoachId: ID
}

export interface Person {
  id: ID
  name: string
  initials: string
  email: string
  avatarHue: number
}

export interface StaffMember extends Person {
  role: Exclude<Role, "player" | "parent">
  title: string
  teamIds: ID[]
}

export type Position = "PG" | "SG" | "SF" | "PF" | "C"
export type ConsentStatus = "granted" | "pending" | "declined" | "not_required"
export type Availability = "available" | "limited" | "out"

export interface Player extends Person {
  teamId: ID
  number: number
  position: Position
  /** null while consent is pending or declined: nothing is stored until a guardian agrees. */
  grade: 9 | 10 | 11 | 12 | null
  height: string | null
  /** Under 18 = minor; guardian consent gates any data, video or AI about them (constitution, product 5). */
  minor: boolean
  consent: ConsentStatus
  guardianIds: ID[]
  availability: Availability | null
  /** Shown to staff only; wellness and availability, never medical detail. */
  availabilityNote?: string
  starter: boolean
  /** Season averages. null while consent is not on file. */
  stats: {
    gp: number
    min: number
    pts: number
    reb: number
    ast: number
    stl: number
    tov: number
    fgPct: number
    tpPct: number
    ftPct: number
  } | null
  /** Player IQ: share of assigned plays the player has studied + quiz accuracy (P3-01). */
  iq: { studied: number; assigned: number; quizAccuracy: number; streak: number } | null
}

/** A player whose guardian has agreed (or who needs no consent): every stat field is present. */
export type OpenPlayer = Player &
  Required<{ [K in "grade" | "height" | "availability" | "stats" | "iq"]: NonNullable<Player[K]> }>

export interface Guardian extends Person {
  playerIds: ID[]
  relation: "mother" | "father" | "guardian" | "grandparent"
  phone: string
}

export type CitationKind = "play" | "clip" | "stat"
export interface Citation {
  kind: CitationKind
  label: string
  /** Where clicking the chip goes inside the app. */
  href: string
}
