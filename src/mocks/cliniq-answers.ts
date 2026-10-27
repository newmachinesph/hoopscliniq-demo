import type { Citation } from "@/data/types"
import { at, formatDate } from "./clock"
import { films, gameClock, pppBySet, resultPoints } from "./film"
import { gameLog, lineups } from "./insights"
import { players } from "./org"
import { getPlay, plays } from "./plays"
import { games, opponentById, playedGames } from "./season"

// Canned ClinIQ answers for the mock. The real product generates these with Muse Spark and cites real sources (P1-15);
// here every answer still carries citations that link to real pages in this app, never a made-up chip.

export type CliniqMode = "ask" | "analyze" | "plan"

export const modeLabels: Record<CliniqMode, { label: string; hint: string }> = {
  ask: { label: "Ask", hint: "Answers from your playbook, film, stats and schedule" },
  analyze: { label: "Analyze", hint: "Breaks down film and stats, step by step" },
  plan: { label: "Plan", hint: "Drafts plans and messages for you to approve" },
}

/** A citation plus what the Sources panel shows for it. */
export interface SourceCitation extends Citation {
  /** One line under the title in the Sources panel. */
  excerpt?: string
  /** When the source was made: game date, clip date or last edit. */
  date?: string
  /** Timecode or count on the thumbnail, e.g. "1:42" or "8 clips". */
  meta?: string
}

export interface CliniqProposal {
  title: string
  to: string
  impact: string
  /** The agent that drafted it. */
  agent?: string
  /** From -> to preview. `to` alone is a new message or item. */
  preview?: { from?: string; to: string }
  /** Outward messages (parents) get a second confirm that states this consequence. */
  confirm?: string
}

export interface CliniqAnswer {
  /** Lowercase keywords; the first answer whose keywords appear in the question wins. */
  match: string[]
  /** Paragraphs. Inline citations use [n] markers that refer to `citations[n - 1]`. */
  body: string[]
  citations: SourceCitation[]
  /** Optional follow-up the coach can approve (AI proposes, people decide). */
  proposal?: CliniqProposal
  credits: number
  suggestions?: string[]
  mode?: CliniqMode
  /** The ClinIQ agent that ran, e.g. "Scout". Plain questions have none. */
  agent?: string
  /** Model tier in plain words for the Activity tab. */
  tier?: "Small" | "Mid" | "Top"
  /** The agent's run steps, shown live and then collapsed to "Ran N steps". */
  steps?: string[]
  /** Shown when the sources are thin, so the coach knows how much weight to give the answer. */
  confidence?: string
}

export const suggestedPrompts = [
  "How do we beat Westview's 2-3 zone?",
  "Who hasn't studied the game plan yet?",
  "Why did our turnovers spike vs Cedar Park?",
  "Plan Thursday's practice around our weaknesses",
]

/** More prompts for the full /cliniq page, grouped under the four above. */
export const morePrompts = [
  "How is Luka Novak shooting?",
  "Who is available Friday?",
  "What does Westview run after timeouts?",
  "How do we beat Pinecrest's press?",
  "Which plays score best for us?",
  "How do we do in close games?",
]

// New answers sit before the original four: their keywords never appear in the original prompts, and the
// Westview tendency answer has to win over the zone answer for "after timeouts" questions.
// ---------- Numbers the answers quote, read from the same mocks the screens use ----------

const roster = players.filter((p) => p.availability !== null)
const eligible = roster.length
const available = roster.filter((p) => p.availability === "available").length
const canPlay = roster.filter((p) => p.availability !== "out").length
const availabilityLine = `${available} available · ${roster.filter((p) => p.availability === "limited").length} limited · ${roster.filter((p) => p.availability === "out").length} out`

/** Opponent threes over the last three games, from the insights game log. */
const last3Threes = (() => {
  const rows = gameLog.slice(-3)
  const m = rows.reduce((a, r) => a + r.opp3m, 0)
  const a = rows.reduce((t, r) => t + r.opp3a, 0)
  return `${m} of ${a} from three (${a ? ((m / a) * 100).toFixed(1) : "0"}%)`
})()

const lineupOf = (ids: string[]) =>
  lineups.find((l) => ids.every((id) => l.playerIds.includes(id)) && l.playerIds.length === ids.length)
const starters = lineupOf(["p-ellis", "p-novak", "p-washington", "p-kim", "p-okoro"])
const brooksGroup = lineupOf(["p-brooks", "p-novak", "p-washington", "p-kim", "p-okoro"])
const mensahGroup = lineupOf(["p-ellis", "p-novak", "p-mensah", "p-kim", "p-okoro"])
const net = (l?: { net: number }) => (l ? `${l.net > 0 ? "+" : ""}${l.net.toFixed(1)}` : "n/a")

const overload = getPlay("overload-131")
const diamond = getPlay("press-diamond")

/** Our sets with at least 10 coach-confirmed runs on film, best first. */
const ranked = plays.filter((p) => p.stats.timesRun >= 10).sort((a, b) => b.stats.ppp - a.stats.ppp)
const [best1, best2, best3] = ranked
const worst = ranked.at(-1)
const playLine = (p?: (typeof plays)[number]) =>
  p ? `**${p.title}** at ${p.stats.ppp.toFixed(2)} points per possession on ${p.stats.timesRun} runs` : ""

/** Games decided by 5 points or fewer. */
const close = playedGames.filter((g) => g.result && Math.abs(g.result.us - g.result.them) <= 5)
const closeW = close.filter((g) => g.result && g.result.us > g.result.them)
const closeL = close.filter((g) => g.result && g.result.us < g.result.them)
const scoreLine = (g: (typeof games)[number]) =>
  `${opponentById(g.opponentId)?.name ?? g.opponentId} ${g.result?.us}-${g.result?.them}`

/** Our zone sets against Westview's 2-3 in the Dec 11 game, coach-confirmed tags only (the hackathon demo question). */
const wvZone = (() => {
  const film = films.find((f) => f.id === "westview")
  const ours = (film?.possessions ?? []).filter((p) => p.side === "us" && p.tag?.status === "confirmed")
  const halfCourt = ours.filter((p) => p.set !== "Primary Transition")
  const zone = halfCourt.filter((p) => p.defense === "2-3 zone")
  const zoneSetNames = ["Horns Flare", "5-Out Chicago", "Short Corner Flood", "Zone Gut"]
  const sets = pppBySet(zone.filter((p) => zoneSetNames.includes(p.set))).map((s) => {
    const runs = zone.filter((p) => p.set === s.set)
    // Ceil: the film room shows the possession that started at or before t.
    const pick = runs.find((p) => resultPoints[p.result] > 0) ?? runs[0]
    const { q, clock } = gameClock(pick?.gameStart ?? 0)
    return { ...s, clip: { t: Math.ceil(pick?.start ?? 0), label: `Q${q} ${clock}` } }
  })
  // Rank only sets we ran at least 3 times: one trip says nothing.
  const ranked = sets.filter((x) => x.n >= 3).sort((a, b) => b.ppp - a.ppp)
  const date = games.find((g) => g.filmId === "westview")?.date
  return {
    trips: zone.length,
    halfCourt: halfCourt.length,
    sets,
    best: ranked[0],
    second: ranked[1],
    worst: ranked.at(-1),
    date,
    dateLabel: date ? formatDate(date) : "Dec 11",
  }
})()

export const answers: CliniqAnswer[] = [
  {
    // Medical and injury questions are refused: ClinIQ only sees the trainer's available / limited / out.
    match: [
      "injur",
      "hurt",
      "ankle",
      "knee",
      "concussion",
      "medical",
      "diagnos",
      "doctor",
      "medication",
      "sprain",
      "rehab",
      "healthy",
    ],
    mode: "ask",
    tier: "Small",
    steps: ["Recognized a health question", "Read availability only"],
    body: [
      "I can't help with medical or injury questions. I don't see health records, and I won't guess about a player's body or a return date.",
      "What I can tell you is availability as the trainer set it: Noah Fischer is out this week and Isaiah Washington is limited [1]. For anything about an injury, talk to Sofia Alvarez, your athletic trainer.",
    ],
    citations: [
      {
        kind: "stat",
        label: "Availability · this week",
        href: "/team/availability",
        excerpt: availabilityLine,
        date: at(0, "07:30"),
      },
    ],
    credits: 0,
    suggestions: ["Who is available Friday?"],
  },
  {
    // Hackathon demo question (/hackathon "Try the demo question"). Every number is read from our Westview film.
    match: ["what did we run against westview", "what worked against westview"],
    mode: "analyze",
    agent: "Film",
    tier: "Top",
    steps: [
      `Read ${wvZone.trips} of our possessions against Westview's 2-3 zone (Dec 11 film)`,
      "Kept coach-confirmed tags only",
      `Grouped them into ${wvZone.sets.length} zone sets and ranked by points per possession`,
      "Picked one clip for each set",
    ],
    body: [
      `In our ${wvZone.dateLabel} game at Westview they sat in a 2-3 zone on ${wvZone.trips} of our ${wvZone.halfCourt} tagged half-court possessions [1]. Against it we ran ${wvZone.sets.map((s) => `**${s.set}** (${s.n})`).join(", ")}.`,
      `What worked: **${wvZone.best?.set}** at ${wvZone.best?.ppp.toFixed(2)} points per possession on ${wvZone.best?.n} trips [2], with **${wvZone.second?.set}** next at ${wvZone.second?.ppp.toFixed(2)} on ${wvZone.second?.n} [3]. Both start with a high-post catch, so the bottom of the zone has to step up and the short corner opens.`,
      `What didn't: **${wvZone.worst?.set}** scored ${wvZone.worst?.ppp.toFixed(2)} points per possession on ${wvZone.worst?.n} trips [4]. Each clip opens at the possession, so you can check the read yourself before Friday.`,
    ],
    confidence: `One game of our own film: ${wvZone.trips} possessions. Treat it as a lean until Friday's film is tagged.`,
    citations: [
      {
        kind: "stat",
        label: `Our ${wvZone.dateLabel} game at Westview · defense faced`,
        href: "/film/westview",
        excerpt: `2-3 zone on ${wvZone.trips} of ${wvZone.halfCourt} tagged half-court possessions.`,
        date: wvZone.date,
      },
      ...[wvZone.best, wvZone.second, wvZone.worst].map((s) => ({
        kind: "clip" as const,
        label: `${s?.set ?? "Clip"} vs Westview · ${s?.clip.label ?? ""}`,
        href: s ? `/film/westview?t=${s.clip.t}` : "/film/westview",
        excerpt: s ? `${s.pts} points on ${s.n} trips against the 2-3 zone.` : undefined,
        date: wvZone.date,
        meta: s?.clip.label,
      })),
    ],
    proposal: {
      title: `Make ${wvZone.best?.set} the first zone call on Friday's call sheet`,
      to: "Varsity Boys staff",
      impact: "The game plan and call sheet show it first; players already study it.",
      agent: "Playbook",
      preview: { to: `${wvZone.best?.set} moves to the top of the zone column for Westview.` },
    },
    credits: 5,
    suggestions: ["How do we beat Westview's 2-3 zone?", "Show me the short-corner clips"],
  },
  {
    match: ["pinecrest", "full-court", "full court"],
    mode: "analyze",
    agent: "Scout",
    tier: "Mid",
    steps: [
      "Read our Nov 25 game vs Pinecrest",
      "Found 14 possessions against their full-court man",
      "Checked Press Break Diamond",
      "Checked who has studied it",
    ],
    body: [
      "Pinecrest went full-court man on 21% of our possessions on Nov 25 and trapped the first pass [1]. We turned it over 10 times that night, 4 of them against the press, and still won 70-66.",
      `When the middle flashed early, **Press Break Diamond** [2] got us out of it: ${diamond?.stats.ppp.toFixed(2) ?? "0.00"} points per possession on ${diamond?.stats.timesRun ?? 0} runs. It's assigned for Tuesday's rematch, and ${diamond?.studied ?? 0} of ${diamond?.assignedTo ?? 0} eligible players have studied it so far [3].`,
    ],
    confidence: "One game of film against their press. A lean, not a pattern.",
    citations: [
      {
        kind: "clip",
        label: "Our Nov 25 game vs Pinecrest · press possessions",
        href: "/film/pinecrest",
        excerpt: "14 possessions against full-court man; 4 turnovers.",
        date: games.find((g) => g.filmId === "pinecrest")?.date,
        meta: "14 clips",
      },
      {
        kind: "play",
        label: "Press Break Diamond",
        href: "/plays/press-diamond",
        excerpt: "Middle catch before the trap closes, then fill the lanes.",
        date: at(-9, "17:50"),
      },
      {
        kind: "stat",
        label: "Pinecrest scouting report",
        href: "/scouting/pinecrest",
        excerpt: "Built from our own Nov 25 film.",
        date: at(0, "13:50"),
      },
    ],
    proposal: {
      title: "Remind players to study Press Break Diamond",
      to: "Varsity Boys players who haven't studied it",
      impact: `${(diamond?.assignedTo ?? 0) - (diamond?.studied ?? 0)} push reminders in the player app before Tuesday`,
      agent: "Playbook",
      preview: { to: "Study reminder: Press Break Diamond, for Tuesday vs Pinecrest." },
    },
    credits: 5,
    suggestions: ["Which plays score best for us?"],
  },
  {
    match: ["best play", "best set", "most efficient", "which plays", "points per possession", "ppp", "score best"],
    mode: "analyze",
    agent: "Film",
    tier: "Mid",
    steps: ["Read coach-confirmed tags from 6 games on film", "Ranked sets with 10 or more runs"],
    body: [
      `On film this season, your most efficient sets with at least 10 runs are ${playLine(best1)} [1], ${playLine(best2)} [2] and ${playLine(best3)} [3].`,
      `The least efficient is ${playLine(worst)} [4]. Small samples swing: a set needs 20 or more runs before its number means much.`,
    ],
    confidence:
      "These come from the 6 games we recorded, not all 15. ClinIQ suggestions waiting for review don't count.",
    citations: [best1, best2, best3, worst].map((p) => ({
      kind: "play" as const,
      label: p?.title ?? "Playbook",
      href: p ? `/plays/${p.id}` : "/playbook",
      excerpt: p
        ? `${p.stats.timesRun} runs · ${p.stats.ppp.toFixed(2)} PPP · ${p.stats.successRate}% score or foul`
        : "",
      date: p?.lastRun?.date,
    })),
    credits: 1,
    suggestions: ["How do we do in close games?"],
  },
  {
    match: ["close game", "clutch", "late-game", "late game", "one-possession", "tight game"],
    mode: "ask",
    tier: "Small",
    steps: ["Read 15 results from the schedule", "Found games decided by 5 or fewer"],
    body: [
      `You're **${closeW.length}-${closeL.length}** in games decided by 5 points or fewer [1]. Wins: ${closeW.map(scoreLine).join(", ")}. Losses: ${closeL.map(scoreLine).join(", ")}.`,
      "Two of the close ones are on film: the 68-64 win at Lakemont [2] and the 57-62 loss to Cedar Park, where 8 of our 19 turnovers came against the press [3].",
    ],
    citations: [
      {
        kind: "stat",
        label: "Season results",
        href: "/schedule",
        excerpt: `${close.length} games decided by 5 or fewer`,
        date: at(-2, "21:30"),
      },
      {
        kind: "clip",
        label: "At Lakemont · 4th quarter",
        href: "/film/lakemont",
        excerpt: "68-64 win on the road.",
        date: games.find((g) => g.filmId === "lakemont")?.date,
      },
      {
        kind: "clip",
        label: "Vs Cedar Park · press turnovers",
        href: "/film/cedar-park",
        excerpt: "8 of 19 turnovers against the 1-2-1-1.",
        date: games.find((g) => g.filmId === "cedar-park")?.date,
        meta: "8 clips",
      },
    ],
    credits: 1,
    suggestions: ["Why did our turnovers spike vs Cedar Park?"],
  },
  {
    match: ["after timeout", "out of timeout", "tendenc", "1-3-1", "what does westview run"],
    mode: "analyze",
    agent: "Scout",
    tier: "Top",
    steps: [
      "Read 9 Westview after-timeout possessions",
      "Grouped them into 2 looks",
      "Checked the Westview scouting report",
      "Matched 1 play from your playbook",
    ],
    body: [
      "Westview lives in the 2-3 zone, but after their own timeouts they switched to a **1-3-1 trap** on 7 of 9 possessions on film [1]. The trap meets the ball at half court and pushes it to the sideline, where the wing and the top of the zone double [2].",
      "On offense out of timeouts they run **Horns** into a high ball screen for their point guard and look for the corner three when the low man helps [3].",
      `Against the 1-3-1, the open spot is the baseline behind the bottom defender. Your **1-3-1 Overload** [4] is built for it: we ran it ${overload?.stats.timesRun ?? 0} times against their 1-3-1 in our Dec 11 win at Westview, at ${(overload?.stats.ppp ?? 0).toFixed(2)} points per possession [5].`,
    ],
    confidence:
      "Thin sources: the 1-3-1 shows up on 9 possessions across 2 scout films plus a handful in our December game. Treat this as a lean, not a scouting fact, until more film comes in.",
    citations: [
      {
        kind: "clip",
        label: "Westview vs Harbor City · ATO possessions",
        href: "/film/westview-harbor-city",
        excerpt: "5 after-timeout possessions; 1-3-1 trap on 4.",
        date: at(-4, "19:30"),
        meta: "5 clips",
      },
      {
        kind: "clip",
        label: "Westview vs Ridgeline · 2nd half",
        href: "/film/westview-ridgeline",
        excerpt: "Sideline trap at half court, wing and top defender double.",
        date: at(-10, "19:00"),
        meta: "4 clips",
      },
      {
        kind: "stat",
        label: "Westview scouting report · sets",
        href: "/scouting/westview",
        excerpt: "Horns high ball screen is their most-run set after a timeout.",
        date: at(-1, "07:40"),
      },
      {
        kind: "play",
        label: "1-3-1 Overload",
        href: "/plays/overload-131",
        excerpt: "Shooter runs the baseline behind the bottom defender of the 1-3-1.",
        date: at(-2, "21:05"),
      },
      {
        kind: "clip",
        label: "Our Dec 11 game at Westview · 1-3-1 possessions",
        href: "/film/westview",
        excerpt: "1-3-1 Overload against their after-timeout zone.",
        date: games.find((g) => g.filmId === "westview")?.date,
      },
    ],
    credits: 5,
    suggestions: ["How do we beat Westview's 2-3 zone?", "Who is available Friday?"],
  },
  {
    match: ["novak", "luka"],
    mode: "analyze",
    agent: "Film",
    tier: "Top",
    steps: [
      "Read Luka Novak's season stats",
      "Found 25 of his threes on film",
      "Split catch-and-shoot from off the dribble",
      "Matched 2 plays that free him",
    ],
    body: [
      "Luka Novak is shooting **41.7% from three** and 88.2% at the line, the best on the team among regular shooters [1]. He's at 44.9% overall on 14.6 points a game.",
      "Most of his threes come off the catch. In the last three games he went 9 of 17 on catch-and-shoot threes [2][3] and 2 of 8 off the dribble. His off-dribble misses mostly come when he drifts left instead of rising straight up [4].",
      "**Floppy** [5] and **Horns Flare** [6] both get him a catch on the move. If you want more of those looks on Friday, he's the first read on both.",
    ],
    citations: [
      {
        kind: "stat",
        label: "Luka Novak · season shooting",
        href: "/team/p-novak",
        excerpt: "15 games · 44.9 FG% · 41.7 3P% · 88.2 FT%",
        date: at(-2, "21:30"),
      },
      {
        kind: "clip",
        label: "Novak catch-and-shoot · vs Lakemont",
        href: "/film/lakemont",
        excerpt: "4 of 6 on catch-and-shoot threes, 3 off pin-downs.",
        date: at(-4, "19:30"),
        meta: "6 clips",
      },
      {
        kind: "clip",
        label: "Novak threes · vs Ridgeline",
        href: "/film/ridgeline",
        excerpt: "Left-corner catch off the flare, 3 of 5.",
        date: at(-7, "19:00"),
        meta: "5 clips",
      },
      {
        kind: "clip",
        label: "Novak off-dribble misses · vs Cedar Park",
        href: "/film/cedar-park",
        excerpt: "Drifts left on the pull-up; 0 of 4 going left.",
        date: at(-3, "18:30"),
        meta: "4 clips",
      },
      {
        kind: "play",
        label: "Floppy",
        href: "/plays/floppy",
        excerpt: "2 picks his side off the pin-downs; first read is the curl.",
        date: at(-3, "18:10"),
      },
      {
        kind: "play",
        label: "Horns Flare",
        href: "/plays/horns-flare",
        excerpt: "Flare screen frees the weak-side wing for a catch on the move.",
        date: at(-1, "17:20"),
      },
    ],
    proposal: {
      title: "Send Luka 6 clips: catch-and-shoot vs off the dribble",
      to: "Luka Novak",
      impact: "6 clips and a coach note in his player app",
      agent: "Film",
      preview: {
        to: "Luka, six of your threes from the last 3 games. On the 2 off-dribble misses, rise straight up instead of drifting left. — Coach Reyes",
      },
    },
    credits: 5,
    suggestions: ["Show me our best lineups", "What does Westview run after timeouts?"],
  },
  {
    match: ["lineup", "rotation", "five-man", "closing group", "closers"],
    mode: "analyze",
    tier: "Mid",
    steps: [
      "Read lineup data from 15 games",
      `Ranked ${lineups.length} five-man groups by net rating`,
      "Checked this week's availability",
    ],
    body: [
      `Your best five this season is **Ellis, Novak, Washington, Kim and Okoro**: ${net(starters)} points per 100 possessions over ${starters?.min ?? 0} minutes together [1]. They're also your starters, so that's where most of your minutes come from.`,
      `The group with **Tyrese Brooks** in for Ellis is ${net(brooksGroup)} per 100 and forces more turnovers, but it has played only ${brooksGroup?.min ?? 0} minutes, mostly against Lakemont's switching defense [2].`,
      `Isaiah Washington is on limited minutes this week per the trainer, back to full Friday [3]. If you want to save his legs, Kwame Mensah in for Washington is ${net(mensahGroup)} per 100 in ${mensahGroup?.min ?? 0} minutes [1].`,
    ],
    confidence: `The Brooks group has only ${brooksGroup?.min ?? 0} minutes together. That's a small sample, and its number can swing a lot in one game.`,
    citations: [
      {
        kind: "stat",
        label: "Lineup net rating · season",
        href: "/insights",
        excerpt: `${lineups.length} five-man groups, ranked by net rating per 100 possessions.`,
        date: at(-2, "21:30"),
      },
      {
        kind: "clip",
        label: "Small lineup · vs Lakemont",
        href: "/film/lakemont",
        excerpt: "Brooks group, 4th quarter: 3 steals in 5 minutes.",
        date: at(-4, "19:30"),
        meta: "7 clips",
      },
      {
        kind: "stat",
        label: "Availability · Isaiah Washington",
        href: "/team/p-washington",
        excerpt: "Limited minutes this week (trainer's note). Back to full Friday.",
        date: at(-1, "08:15"),
      },
    ],
    credits: 5,
    suggestions: ["Who is available Friday?"],
  },
  {
    match: ["available", "availability", "who can play", "who's out", "who is out"],
    mode: "ask",
    tier: "Small",
    steps: ["Read the availability board", "Read 2 trainer's notes", "Checked consent for 13 players"],
    body: [
      `For Friday vs Westview, **${canPlay} of ${eligible}** eligible players can play [1]: ${available} available, and **Isaiah Washington** is limited this week; the trainer has him back to full on Friday [2]. **Noah Fischer** is out this week; the trainer sets his return date [3].`,
      "**Mateo Ruiz**: consent pending. ClinIQ leaves him out of plans and assignments until his guardian signs [4].",
      "I only see availability and the trainer's notes. Health details stay with Sofia Alvarez, your athletic trainer, and never reach ClinIQ.",
    ],
    citations: [
      {
        kind: "stat",
        label: "Availability · this week",
        href: "/team/availability",
        excerpt: availabilityLine,
        date: at(0, "07:30"),
      },
      {
        kind: "stat",
        label: "Trainer's note · Isaiah Washington",
        href: "/team/p-washington",
        excerpt: "Limited minutes this week (trainer's note). Back to full Friday.",
        date: at(-1, "08:15"),
      },
      {
        kind: "stat",
        label: "Trainer's note · Noah Fischer",
        href: "/team/p-fischer",
        excerpt: "Out this week (trainer's note). Return date set by the trainer.",
        date: at(-1, "08:20"),
      },
      {
        kind: "stat",
        label: "Consent status · Mateo Ruiz",
        href: "/team/p-ruiz",
        excerpt: "Consent pending",
        date: at(-6, "10:00"),
      },
    ],
    credits: 1,
    suggestions: ["Show me our best lineups", "Plan Thursday's practice around our weaknesses"],
  },
  {
    match: ["terminology", "what do we call", "glossary", "naming", "same name", "consistent"],
    mode: "ask",
    agent: "Playbook",
    tier: "Mid",
    steps: ["Read 9 plays and their notes", "Compared 41 team terms", "Found 1 action with 2 names"],
    body: [
      'Your playbook mostly uses one name per action, which keeps quizzes clean [1]. One action has two names: **Floppy** calls the screen for a shooter coming up from the block a "pin-down" [2], while **Box BLOB** calls the same action a "down screen" [3].',
      "**Spain** [4] is used the way most staffs use it: a back screen on the roller's defender at the top. **Hammer** [5] means a baseline back screen for the weak-side corner while the ball drives.",
      "I'd standardize on \"pin-down\". It's the word in 6 of your 8 quiz questions about that action [6].",
    ],
    citations: [
      {
        kind: "stat",
        label: "Team terminology · 41 terms",
        href: "/playbook",
        excerpt: "Your names for actions, mapped to the play-dna dictionary.",
        date: at(-3, "18:10"),
      },
      {
        kind: "play",
        label: "Floppy",
        href: "/plays/floppy",
        excerpt: '"5 and 4 set pin-downs for 2 and 3."',
        date: at(-3, "18:10"),
      },
      {
        kind: "play",
        label: "Box BLOB",
        href: "/plays/box-blob",
        excerpt: '"4 sets a down screen for 2 coming to the ball."',
        date: at(-12, "15:30"),
      },
      {
        kind: "play",
        label: "Spain Pick and Roll",
        href: "/plays/spain-pnr",
        excerpt: "Back screen on the roller's defender.",
        date: at(0, "12:40"),
      },
      {
        kind: "play",
        label: "Hammer",
        href: "/plays/hammer",
        excerpt: "Baseline back screen for the weak-side corner.",
        date: at(-7, "17:00"),
      },
      {
        kind: "stat",
        label: "Quiz questions · pin-down",
        href: "/insights",
        excerpt: '8 questions about this action; 6 say "pin-down".',
        date: at(-4, "09:00"),
      },
    ],
    proposal: {
      title: 'Rename "down screen" to "pin-down" in Box BLOB',
      to: "Varsity Boys playbook (12 players)",
      impact: "1 play updated; players see it on their next study",
      agent: "Playbook",
      preview: {
        from: "4 sets a down screen for 2 coming to the ball.",
        to: "4 sets a pin-down for 2 coming to the ball.",
      },
    },
    credits: 1,
  },
  {
    match: ["short corner", "short-corner"],
    mode: "ask",
    agent: "Film",
    tier: "Small",
    steps: ["Searched 2 Westview games", "Found 7 short-corner possessions", "Linked them to your playbook"],
    body: [
      "Here are the 7 short-corner possessions against Westview's 2-3 on film: 4 from Ridgeline [1] and 3 from Harbor City [2]. Opponents scored on 5 of the 7.",
      "The pattern repeats: the high post catches, the bottom defender steps up, and the short-corner player gets a layup or a dump-off to the dunker spot [3]. **5-Out Chicago** [4] gets you to the same catch from your own sets.",
    ],
    citations: [
      {
        kind: "clip",
        label: "Short corner · vs Ridgeline",
        href: "/film/westview-ridgeline",
        excerpt: "High-post catch, baseline open on all 4.",
        date: at(-10, "19:00"),
        meta: "4 clips",
      },
      {
        kind: "clip",
        label: "Short corner · vs Harbor City",
        href: "/film/westview-harbor-city",
        excerpt: "2 layups and a dump-off to the dunker spot.",
        date: at(-4, "19:30"),
        meta: "3 clips",
      },
      {
        kind: "stat",
        label: "Westview zone · short corner PPP",
        href: "/scouting/westview",
        excerpt: "1.21 points per possession allowed from the short corner.",
        date: at(-1, "07:40"),
      },
      {
        kind: "play",
        label: "5-Out Chicago",
        href: "/plays/five-out-chicago",
        excerpt: "DHO into a short-corner cut off the high-post catch.",
        date: at(-3, "16:45"),
      },
    ],
    credits: 1,
    suggestions: ["Draft a zone-offense practice block"],
  },
  {
    match: ["westview", "zone", "2-3"],
    mode: "analyze",
    agent: "Scout",
    tier: "Top",
    steps: ["Read 6 Westview clips", "Found 3 sets", "Matched 2 counters", "Checked who runs the high post"],
    body: [
      "Westview went to a 2-3 zone on 61% of half-court possessions in their last two games [1]. Their weak spot is the short corner: the bottom defender steps up to the high post and leaves the baseline open, and opponents scored 1.21 points per possession there [2].",
      "From your playbook, **Horns Flare** [3] and **5-Out Chicago** [4] both put a shooter in the short corner off the high-post catch. Jalen Ellis and Luka Novak are your best decision makers at the high post this season (6.7 and 2.2 assists) [5].",
      "I'd also add the short-corner read to Thursday's shell work so the high-post catch becomes a habit before Friday.",
    ],
    citations: [
      {
        kind: "clip",
        label: "Westview vs Ridgeline · 1st half",
        href: "/film/westview-ridgeline",
        excerpt: "2-3 zone on 22 of 34 half-court possessions.",
        date: at(-10, "19:00"),
        meta: "6 clips",
      },
      {
        kind: "stat",
        label: "Westview zone · short corner PPP",
        href: "/scouting/westview",
        excerpt: "1.21 points per possession allowed from the short corner.",
        date: at(-1, "07:40"),
      },
      {
        kind: "play",
        label: "Horns Flare",
        href: "/plays/horns-flare",
        excerpt: "High-post catch with a short-corner read.",
        date: at(-1, "17:20"),
      },
      {
        kind: "play",
        label: "5-Out Chicago",
        href: "/plays/five-out-chicago",
        excerpt: "DHO into a short-corner cut off the high-post catch.",
        date: at(-3, "16:45"),
      },
      {
        kind: "stat",
        label: "Season assists · Ellis, Novak",
        href: "/insights",
        excerpt: "Ellis 6.7 · Novak 2.2 assists per game",
        date: at(-2, "21:30"),
      },
    ],
    proposal: {
      title: "Add 2 zone counters to the Westview game plan",
      to: "Varsity Boys players",
      impact: "12 eligible players get the plays and a 4-question quiz",
      agent: "Playbook",
      preview: {
        to: "Horns Flare and 5-Out Chicago added to Friday's game plan, with a 4-question quiz on the short-corner read.",
      },
    },
    credits: 5,
    suggestions: ["Show me the short-corner clips", "Draft a zone-offense practice block"],
  },
  {
    match: ["studied", "game plan", "quiz", "who hasn"],
    mode: "ask",
    tier: "Small",
    steps: ["Read game plan views for 12 eligible players", "Checked consent and availability"],
    body: [
      "11 of 12 eligible players have studied the Westview game plan [1]. Horns Flare, the first play in it, is at 12 of 12 eligible, and 9 players have finished its quiz [4].",
      "One eligible player hasn't opened the game plan: **Omar Haddad** (last active 4 days ago). **Mateo Ruiz** isn't counted: his guardian consent is still pending, so ClinIQ can't assign him anything yet [2]. Noah Fischer studied it but is out this week (trainer's note) [3].",
      "Whether study shows up in games is on Study → Results, from film tags a coach confirmed [1].",
    ],
    citations: [
      {
        kind: "stat",
        label: "Study → Results · Westview game plan",
        href: "/study/results",
        excerpt: "11 of 12 eligible opened · 9 finished the quiz",
        date: at(0, "13:00"),
      },
      {
        kind: "stat",
        label: "Consent status · Mateo Ruiz",
        href: "/team/p-ruiz",
        excerpt: "Consent pending",
        date: at(-6, "10:00"),
      },
      {
        kind: "stat",
        label: "Availability · Noah Fischer",
        href: "/team/p-fischer",
        excerpt: "Out this week (trainer's note). Return date set by the trainer.",
        date: at(-1, "08:20"),
      },
      {
        kind: "play",
        label: "Horns Flare",
        href: "/plays/horns-flare",
        excerpt: "12 of 12 eligible studied · quiz due tonight",
        date: at(0, "12:40"),
      },
    ],
    proposal: {
      title: "Re-send the Westview study reminder to Omar Haddad",
      to: "Omar Haddad (player app)",
      impact: "One push reminder in the player app. Not a message: player messages are Coming 2027.",
      agent: "Playbook",
      preview: { to: "Study reminder: Westview game plan, 3 plays. Due before Thursday's practice." },
    },
    credits: 1,
  },
  {
    match: ["turnover", "cedar"],
    mode: "analyze",
    agent: "Film",
    tier: "Top",
    steps: [
      "Read the Cedar Park box score",
      "Found 19 turnovers on film",
      "Grouped 8 against the press",
      "Checked your press break",
    ],
    body: [
      "You had 19 turnovers vs Cedar Park, up from your 11.2 average [1]. 8 of them came against their 1-2-1-1 press, mostly on the second pass after the inbound when the ball went to the sideline trap [2].",
      "Your **Press Break 1-4** [3] keeps the middle open, but on 5 of those 8 the middle cutter flashed late. The fix is timing, not a new play.",
    ],
    citations: [
      {
        kind: "stat",
        label: "Box score vs Cedar Park",
        href: "/insights",
        excerpt: "19 TOV · season average 11.2",
        date: at(-2, "21:30"),
      },
      {
        kind: "clip",
        label: "Press turnovers · 8 clips",
        href: "/film/cedar-park",
        excerpt: "Second pass after the inbound into the sideline trap.",
        date: at(-3, "18:30"),
        meta: "8 clips",
      },
      {
        kind: "play",
        label: "Press Break 1-4",
        href: "/plays/press-break",
        excerpt: "Middle cutter flashes behind the first trap.",
        date: at(-6, "16:00"),
      },
    ],
    credits: 5,
    suggestions: ["Build a press-break drill for Thursday"],
  },
  {
    match: ["practice", "thursday", "plan", "drill"],
    mode: "plan",
    agent: "Playbook",
    tier: "Mid",
    steps: [
      "Read this week's weak spots",
      "Checked availability and trainer's notes",
      "Built a 90-minute plan",
      "Found an open gym slot Thursday",
    ],
    body: [
      "Here's a 90-minute plan for Thursday built from this week's weak spots: press-break timing [1], zone offense for Westview [2] and closeouts (opponents shot 39% from three in your last 3 games) [3].",
      "It keeps Isaiah Washington's minutes limited and leaves Noah Fischer out of contact work, per the trainer's notes [4].",
    ],
    citations: [
      {
        kind: "clip",
        label: "Press turnovers · 8 clips",
        href: "/film/cedar-park",
        excerpt: "Second pass after the inbound into the sideline trap.",
        date: at(-3, "18:30"),
        meta: "8 clips",
      },
      {
        kind: "stat",
        label: "Westview scouting report",
        href: "/scouting/westview",
        excerpt: "2-3 zone on 61% of half-court possessions.",
        date: at(-1, "07:40"),
      },
      {
        kind: "stat",
        label: "Opponent 3P% · last 3 games",
        href: "/insights",
        excerpt: last3Threes,
        date: at(-2, "21:30"),
      },
      {
        kind: "stat",
        label: "Availability · this week",
        href: "/team",
        excerpt: availabilityLine,
        date: at(0, "07:30"),
      },
    ],
    credits: 5,
  },
]

export const fallbackAnswer: CliniqAnswer = {
  match: [],
  mode: "ask",
  tier: "Small",
  steps: ["Searched your playbook, film, stats and schedule", "Found no source that answers this"],
  body: [
    "I can answer from your playbook, your film, your stats and your schedule, and I'll link every source. I don't have a source for that one yet, so I won't guess.",
    "Try asking about an opponent, a player, a play or a game.",
  ],
  citations: [],
  credits: 1,
  suggestions: suggestedPrompts.slice(0, 2),
}

export function answerFor(question: string): CliniqAnswer {
  const q = question.toLowerCase()
  return answers.find((a) => a.match.some((m) => q.includes(m))) ?? fallbackAnswer
}

/** Saved ClinIQ threads for the history rail. Opening one replays its questions without re-running them. */
export interface CliniqThread {
  id: string
  title: string
  group: "Today" | "This week" | "Earlier"
  updated: string
  prompts: string[]
}

export const threads: CliniqThread[] = [
  {
    id: "t-westview-zone",
    title: "Westview zone plan",
    group: "Today",
    updated: at(0, "13:52"),
    prompts: ["How do we beat Westview's 2-3 zone?", "Show me the short-corner clips"],
  },
  {
    id: "t-cp-turnovers",
    title: "Turnovers vs Cedar Park",
    group: "Today",
    updated: at(0, "09:18"),
    prompts: ["Why did our turnovers spike vs Cedar Park?"],
  },
  {
    id: "t-friday",
    title: "Who's available Friday",
    group: "Today",
    updated: at(0, "07:41"),
    prompts: ["Who is available Friday?"],
  },
  {
    id: "t-novak",
    title: "Luka Novak's shooting",
    group: "This week",
    updated: at(-1, "16:05"),
    prompts: ["How is Luka Novak shooting?"],
  },
  {
    id: "t-thursday",
    title: "Thursday practice",
    group: "This week",
    updated: at(-1, "08:30"),
    prompts: ["Plan Thursday's practice around our weaknesses"],
  },
  {
    id: "t-lineups",
    title: "Closing lineups",
    group: "This week",
    updated: at(-2, "22:10"),
    prompts: ["Show me our best lineups"],
  },
  {
    id: "t-ato",
    title: "Westview after timeouts",
    group: "Earlier",
    updated: at(-4, "20:30"),
    prompts: ["What does Westview run after timeouts?"],
  },
  {
    id: "t-terms",
    title: "Playbook terminology",
    group: "Earlier",
    updated: at(-6, "17:45"),
    prompts: ["Is our playbook terminology consistent?"],
  },
  {
    id: "t-gameplan",
    title: "Game plan study",
    group: "Earlier",
    updated: at(-8, "12:00"),
    prompts: ["Who hasn't studied the game plan yet?"],
  },
]
