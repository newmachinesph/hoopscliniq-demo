import { at } from "./clock"

// Varsity Boys 2026–27 season: 24 games, 15 played (11-4), 9 upcoming. Shared by home, film, schedule, scouting,
// insights and the portals, so every screen agrees on scores and dates.

export interface Opponent {
  id: string
  name: string
  mascot: string
  short: string
  record: string
  /** Their primary defense, from scouting. */
  defense: string
}

export const opponents: Opponent[] = [
  {
    id: "westview",
    name: "Westview",
    mascot: "Wolves",
    short: "WV",
    record: "12-3",
    defense: "2-3 zone, 1-3-1 after timeouts",
  },
  {
    id: "cedar-park",
    name: "Cedar Park",
    mascot: "Cougars",
    short: "CP",
    record: "10-5",
    defense: "Man, 1-2-1-1 press",
  },
  { id: "ridgeline", name: "Ridgeline", mascot: "Rams", short: "RL", record: "8-7", defense: "Pack-line man" },
  { id: "lakemont", name: "Lakemont", mascot: "Lakers", short: "LM", record: "13-2", defense: "Switch everything" },
  { id: "fairhaven", name: "Fairhaven", mascot: "Falcons", short: "FH", record: "6-9", defense: "Man" },
  {
    id: "oak-hollow",
    name: "Oak Hollow",
    mascot: "Owls",
    short: "OH",
    record: "9-6",
    defense: "Match-up zone",
  },
  {
    id: "brookside",
    name: "Brookside",
    mascot: "Bears",
    short: "BS",
    record: "7-8",
    defense: "Man, ICE ball screens",
  },
  {
    id: "pinecrest",
    name: "Pinecrest",
    mascot: "Panthers",
    short: "PC",
    record: "11-4",
    defense: "Man with a full-court press",
  },
  { id: "harbor-city", name: "Harbor City", mascot: "Mariners", short: "HC", record: "9-5", defense: "2-3 zone" },
  {
    id: "northfield-prep",
    name: "Northfield Prep",
    mascot: "Knights",
    short: "NP",
    record: "12-2",
    defense: "Man, heavy help",
  },
]

export interface Game {
  id: string
  opponentId: string
  date: string
  home: boolean
  /** Tournament games at a third school: shown as "vs", neither home nor away. */
  neutral?: boolean
  conference: boolean
  /** Tournament or special night, shown under the game. */
  event?: string
  /** Played games have a score; `filmId` links to /film/<id> when we recorded it. */
  result?: { us: number; them: number }
  filmId?: string
  venue: string
}

const HOME = "Lakeshore Fieldhouse"
const THANKSGIVING = "Harbor City Thanksgiving Tournament"
const HOLIDAY = "Lakeshore Holiday Classic"

// Illinois-style season: Thanksgiving tournament to open (Nov 23-28), conference Tuesdays and Fridays, our own holiday
// tournament (Dec 28-30), a bye week in February (Feb 8-13) and senior night on Feb 19. 24 games: 15 played (11-4,
// 6-1 in conference), 9 to go. Day offsets are from NOW (Tue Jan 12). Scores add up to 922-860 (see insights.ts).
export const games: Game[] = [
  {
    id: "g01",
    opponentId: "fairhaven",
    date: at(-50, "16:00"),
    home: false,
    neutral: true,
    conference: false,
    event: THANKSGIVING,
    result: { us: 64, them: 48 },
    venue: "Harbor City HS",
  },
  {
    id: "g02",
    opponentId: "pinecrest",
    date: at(-48, "17:30"),
    home: false,
    neutral: true,
    conference: false,
    event: THANKSGIVING,
    result: { us: 70, them: 66 },
    venue: "Harbor City HS",
    filmId: "pinecrest",
  },
  {
    id: "g03",
    opponentId: "harbor-city",
    date: at(-46, "19:00"),
    home: false,
    conference: false,
    event: THANKSGIVING,
    result: { us: 55, them: 59 },
    venue: "Harbor City HS",
  },
  {
    id: "g04",
    opponentId: "northfield-prep",
    date: at(-45, "14:30"),
    home: false,
    neutral: true,
    conference: false,
    event: `${THANKSGIVING}, third-place game`,
    result: { us: 49, them: 63 },
    venue: "Harbor City HS",
  },
  {
    id: "g05",
    opponentId: "oak-hollow",
    date: at(-39, "19:00"),
    home: false,
    conference: true,
    result: { us: 58, them: 51 },
    venue: "Oak Hollow HS",
  },
  {
    id: "g06",
    opponentId: "brookside",
    date: at(-35, "19:00"),
    home: true,
    conference: true,
    result: { us: 61, them: 52 },
    venue: HOME,
  },
  {
    id: "g07",
    opponentId: "westview",
    date: at(-32, "19:30"),
    home: false,
    conference: true,
    result: { us: 67, them: 60 },
    venue: "Westview HS",
    filmId: "westview",
  },
  {
    id: "g08",
    opponentId: "lakemont",
    date: at(-25, "19:00"),
    home: true,
    conference: true,
    result: { us: 52, them: 57 },
    venue: HOME,
  },
  {
    id: "g09",
    opponentId: "harbor-city",
    date: at(-15, "18:00"),
    home: true,
    conference: false,
    event: HOLIDAY,
    result: { us: 66, them: 61 },
    venue: HOME,
  },
  {
    id: "g10",
    opponentId: "fairhaven",
    date: at(-14, "18:00"),
    home: true,
    conference: false,
    event: HOLIDAY,
    result: { us: 71, them: 55 },
    venue: HOME,
  },
  {
    id: "g11",
    opponentId: "brookside",
    date: at(-13, "19:30"),
    home: true,
    conference: false,
    event: `${HOLIDAY}, championship`,
    result: { us: 63, them: 58 },
    venue: HOME,
  },
  {
    id: "g12",
    opponentId: "oak-hollow",
    date: at(-10, "18:30"),
    home: true,
    conference: true,
    result: { us: 59, them: 50 },
    venue: HOME,
    filmId: "oak-hollow",
  },
  {
    id: "g13",
    opponentId: "ridgeline",
    date: at(-7, "19:00"),
    home: false,
    conference: true,
    result: { us: 62, them: 54 },
    venue: "Ridgeline HS",
    filmId: "ridgeline",
  },
  {
    id: "g14",
    opponentId: "lakemont",
    date: at(-4, "19:30"),
    home: false,
    conference: true,
    result: { us: 68, them: 64 },
    venue: "Gates Gym, Lakemont",
    filmId: "lakemont",
  },
  {
    id: "g15",
    opponentId: "cedar-park",
    date: at(-3, "18:30"),
    home: true,
    conference: false,
    result: { us: 57, them: 62 },
    venue: HOME,
    filmId: "cedar-park",
  },
  { id: "g16", opponentId: "westview", date: at(3, "19:00"), home: true, conference: true, venue: HOME },
  { id: "g17", opponentId: "pinecrest", date: at(7, "19:30"), home: true, conference: false, venue: HOME },
  { id: "g18", opponentId: "northfield-prep", date: at(10, "19:00"), home: true, conference: false, venue: HOME },
  {
    id: "g19",
    opponentId: "cedar-park",
    date: at(14, "19:00"),
    home: false,
    conference: false,
    venue: "Cedar Park HS",
  },
  { id: "g20", opponentId: "ridgeline", date: at(17, "19:00"), home: true, conference: true, venue: HOME },
  { id: "g21", opponentId: "brookside", date: at(21, "19:30"), home: false, conference: true, venue: "Brookside HS" },
  { id: "g22", opponentId: "fairhaven", date: at(24, "19:00"), home: false, conference: true, venue: "Fairhaven HS" },
  {
    id: "g23",
    opponentId: "harbor-city",
    date: at(35, "19:30"),
    home: false,
    conference: false,
    venue: "Harbor City HS",
  },
  {
    id: "g24",
    opponentId: "fairhaven",
    date: at(38, "19:00"),
    home: true,
    conference: true,
    event: "Senior night",
    venue: HOME,
  },
]

/** Opponent games our own scout recorded from the stands with the Hoops ClinIQ app (not our games, never imported). */
export const scoutFilm = [
  { id: "westview-ridgeline", title: "Westview vs Ridgeline", opponentId: "westview", date: at(-10, "19:00") },
  { id: "westview-harbor-city", title: "Westview vs Harbor City", opponentId: "westview", date: at(-4, "19:30") },
]

export const opponentById = (id: string) => opponents.find((o) => o.id === id)
export const playedGames = games.filter((g) => g.result)
export const upcomingGames = games.filter((g) => !g.result)
export const nextGame = upcomingGames[0] as Game
/** "vs" at home and at a neutral site, "at" on the road. */
export const vsAt = (g: Pick<Game, "home" | "neutral">) => (g.home || g.neutral ? "vs" : "at")
export const conferenceRecord = {
  w: playedGames.filter((g) => g.conference && g.result && g.result.us > g.result.them).length,
  l: playedGames.filter((g) => g.conference && g.result && g.result.us < g.result.them).length,
}
export const record = {
  w: playedGames.filter((g) => g.result && g.result.us > g.result.them).length,
  l: playedGames.filter((g) => g.result && g.result.us < g.result.them).length,
}
