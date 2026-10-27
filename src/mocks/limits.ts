import { filmAddOn } from "./settings"

// What ClinIQ can and can't do yet. Status vocabulary matches mocks/agents.ts: In preview / Beta / Coming 2027 / Not planned.

export type LimitStatus = "preview" | "beta" | "coming" | "never"

export const limitStatusLabels: Record<LimitStatus, string> = {
  preview: "In preview",
  beta: "Beta",
  coming: "Coming 2027",
  never: "Not planned",
}

export interface LimitItem {
  title: string
  why: string
  status: LimitStatus
}

export interface LimitGroup {
  id: "today" | "review" | "not-yet"
  title: string
  blurb: string
  items: LimitItem[]
}

export const limitGroups: LimitGroup[] = [
  {
    id: "today",
    title: "Works in the preview today",
    blurb: "Works on your own playbook and film, and shows where each answer came from. Sample data only.",
    items: [
      {
        title: "Search your playbook and film",
        why: "It answers from plays and tagged clips in your library, and links each one.",
        status: "preview",
      },
      {
        title: "Draft scouting reports with citations",
        why: "It writes from your notes, plays and tagged film. You edit before anyone sees it.",
        status: "preview",
      },
    ],
  },
  {
    id: "review",
    title: "Beta, with your review",
    blurb: "ClinIQ proposes and a coach confirms. Nothing counts in reports until confirmed.",
    items: [
      {
        title: "Clip to play draft",
        why: "Clip to play drafts a play from a short clip; you place and fix the players. Not yet tested on real amateur footage.",
        status: "beta",
      },
      {
        title: "Photo to play",
        why: "Beta: you confirm every player and path.",
        status: "beta",
      },
      {
        title: "Sideline suggestions",
        why: "Beta: suggests plays from your own library based on the score, clock and fouls. You decide.",
        status: "beta",
      },
      {
        title: "Tag suggestions from phone video",
        why: "Your staff tags possessions by hand. On a minority, ClinIQ suggests a tag instead; each shows an illustrative confidence and waits for a yes.",
        status: "beta",
      },
      {
        title: "Action labels",
        why: "It names screens, cuts and passes. A coach confirms the label before it counts.",
        status: "beta",
      },
      {
        title: "Opponent tendencies",
        why: "Built from the film you tagged, so they are only as good as that sample.",
        status: "beta",
      },
    ],
  },
  {
    id: "not-yet",
    title: "Not yet",
    blurb: "We won't sell these as working until they are.",
    items: [
      {
        title: "Full-game breakdown (film add-on)",
        why: `$${filmAddOn.perGame} a game, not paid in credits. ${filmAddOn.note} It opens once it works on real phone footage.`,
        status: "coming",
      },
      {
        title: "Full-game automatic stats",
        why: "A person still keeps the book. We have not shown this works on amateur phone footage.",
        status: "coming",
      },
      {
        title: "Player tracking from one phone at the far end",
        why: "Players are too small and blocked too often from one distant angle. We use no face or gait recognition: players are identified by jersey number and the roster you confirm.",
        status: "coming",
      },
      {
        title: "Face or gait recognition",
        why: "We will not identify players by face or by how they move. Players are identified by jersey number and the roster you confirm.",
        status: "never",
      },
      {
        title: "Injury or medical anything",
        why: "Availability only. ClinIQ never diagnoses a player or clears one to play.",
        status: "never",
      },
    ],
  },
]
