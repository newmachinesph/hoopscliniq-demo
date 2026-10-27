import { dnaPlays } from "@/lib/play-dna"
import { answerFor } from "./cliniq-answers"
import { at } from "./clock"

// Hackathon build status: the one file to edit as pieces of the real pipeline land.
// Flip a status to "live" when that piece runs on real footage in the deployed demo.

/** FEATURES.md vocabulary plus "planned" (Planned for this build) and "live". */
export type BuildStatus = "live" | "planned" | "in-preview" | "beta" | "coming-2027"

export const buildStatusLabel: Record<BuildStatus, string> = {
  live: "Live",
  planned: "Planned for this build",
  "in-preview": "In preview",
  beta: "Beta",
  "coming-2027": "Coming 2027",
}

/** When the statuses below were last checked. Update it with them. */
export const statusAsOf = "October 28, 2026"

export const hackathon = {
  event: "Meta Global AI Developer Hackathon 2026",
  theme: "Build for Your World",
  oneLiner:
    "Hoops ClinIQ turns a coach's phone video of a basketball game into tagged plays and answers that cite the exact clip.",
  buildWindow: "Oct 28–Nov 3",
  deadline: "Nov 4, 2026, 9:00 PM ET",
  track: "Track: Indie developer",
  team: "Hoops ClinIQ, founder-led. Team details are added with the submission.",
  /** The seeded ClinIQ question: /cliniq?q= opens it with its cited answer. */
  demoQuestion: "What did we run against Westview's zone and what worked?",
  links: {
    demo: "/demo",
    /** Placeholder until the repository is public. Set a URL to show it as a link. */
    github: null as string | null,
  },
}

export interface ModelRow {
  id: string
  name: string
  /** Where it runs. */
  host: string
  jobs: string[]
  status: BuildStatus
  bonus?: boolean
}

/** "Where Meta's models go" on /hackathon. */
export const modelRows: ModelRow[] = [
  {
    id: "sam",
    name: "SAM 3.1",
    host: "Meta API, called from the Modal pipeline",
    jobs: [
      "Track all 10 players through a phone clip",
      "Jersey crops so the coach confirms who is who",
      "Consent mask: hide a player without guardian consent",
    ],
    status: "planned",
  },
  {
    id: "spark",
    name: "Muse Spark 1.3",
    host: "Meta API",
    jobs: [
      "Name the play in the coach's own playbook words",
      "Write quiz questions for player study",
      "ClinIQ tool calls (fetch_play, fetch_clip, fetch_stat); no source, no answer",
    ],
    status: "planned",
  },
  {
    id: "spark-open",
    name: "Muse Spark Open",
    host: "Baseten",
    jobs: ["Coach-facing ClinIQ chat", "Kids' data stays in our own tenancy"],
    status: "planned",
  },
  {
    id: "modal",
    name: "Modal",
    host: "GPU jobs",
    jobs: ["Video pipeline: ffmpeg frames, SAM tracking, play-dna JSON", "Eval harness against hand-labelled clips"],
    status: "planned",
  },
  {
    id: "muse-code",
    name: "Muse Code",
    host: "Developer tool",
    jobs: ["Built the backend; transcripts go in the writeup"],
    status: "planned",
  },
  {
    id: "voice",
    name: "Muse Voice Transcribe",
    host: "Meta API",
    jobs: ["Sideline voice tags: say the play name, the clip gets tagged"],
    status: "planned",
    bonus: true,
  },
]

export interface PipelineStep {
  id: "upload" | "frames" | "track" | "name" | "review" | "cite"
  label: string
  /** The engine behind the step, shown under the label. */
  engine: string
  status: BuildStatus
  /** Where the step lives in the demo today. */
  href: string
}

/** Upload → Frames (Modal) → Track (SAM 3.1) → Name (Muse Spark) → Review → Cite (ClinIQ). */
export const pipelineSteps: PipelineStep[] = [
  { id: "upload", label: "Upload", engine: "Phone or file", status: "in-preview", href: "/film/record" },
  { id: "frames", label: "Frames", engine: "Modal", status: "planned", href: "/#models" },
  { id: "track", label: "Track", engine: "SAM 3.1", status: "planned", href: "/#models" },
  { id: "name", label: "Name", engine: "Muse Spark", status: "planned", href: "/#models" },
  { id: "review", label: "Review", engine: "Coach confirms", status: "beta", href: "/film/review" },
  { id: "cite", label: "Cite", engine: "ClinIQ", status: "in-preview", href: "/cliniq" },
]

/** Pass lines from the evidence plan (site /how-we-test). Results stay empty until measured. */
export const passLines = [
  { id: "possessions", measure: "Possessions and shots found", line: "90% precision or better" },
  { id: "screens", measure: "Ball screens found", line: "70% precision or better" },
  { id: "confirm", measure: "Coach confirmation time per game", line: "Under 15 minutes" },
  { id: "cost", measure: "Our cost per game", line: "Under half the price we charge" },
]

export interface MeasuredResult {
  measure: string
  result: string
  clips: string
  measuredOn: string
}

/** Empty on purpose: rows go here only after the eval harness runs on hand-labelled clips. */
export const measuredResults: MeasuredResult[] = []

// ---------- Mock API payloads (src/app/api/*). The backend replaces these. ----------

const MOCK_JOB_ID = "demo-job-horns-twist"

export function mockUploadJob() {
  return {
    jobId: MOCK_JOB_ID,
    status: "queued" as const,
    statusUrl: `/api/film/jobs/${MOCK_JOB_ID}`,
    note: "Mock: nothing was uploaded or stored.",
  }
}

/** A finished job: tracks and play-dna from the hand-drawn Horns Twist play, standing in for SAM output. */
export function mockJob(jobId: string) {
  const dna = dnaPlays.find((p) => p.id === "horns-twist")
  return {
    jobId,
    status: "done" as const,
    finishedAt: at(0, "14:38"),
    steps: pipelineSteps.map((s) => ({ id: s.id, label: s.label, engine: s.engine, status: s.status })),
    suggestedName: { playId: "horns-twist", title: dna?.title ?? "Horns Twist", needsReview: true },
    playDna: dna?.play ?? null,
  }
}

export function mockAsk(question: string) {
  const a = answerFor(question)
  return {
    question,
    answer: { body: a.body, citations: a.citations, confidence: a.confidence ?? null, credits: a.credits },
    noSource: a.citations.length === 0,
  }
}

// ---------- /demo: the demo flow, four steps plus consent ----------

export interface StatusItem {
  label: string
  status: BuildStatus
}

export interface DemoStep {
  id: "record" | "tag" | "ask" | "study" | "consent"
  title: string
  sentence: string
  href: string
  cta: string
  /** A second, smaller link on the card. */
  more?: { href: string; label: string }
  strip: StatusItem[]
}

/** A pipeline step as a status item, so /demo and the pipeline strip never disagree. */
const fromPipeline = (id: PipelineStep["id"]): StatusItem => {
  const s = pipelineSteps.find((p) => p.id === id)
  return { label: s ? `${s.label} · ${s.engine}` : id, status: s?.status ?? "planned" }
}

export const demoFlow: DemoStep[] = [
  {
    id: "record",
    title: "Record",
    sentence: "Film the game on a phone from high in the stands and tap play names as they happen.",
    href: "/film/record",
    cta: "Open Record",
    more: { href: "/film", label: "Film library" },
    strip: [fromPipeline("upload")],
  },
  {
    id: "tag",
    title: "Tag",
    sentence:
      "Modal pulls the frames, SAM 3.1 tracks the ten players and Muse Spark names the play in your words; you confirm every tag.",
    href: "/film/cedar-park",
    cta: "Open a tagged game",
    more: { href: "/film/review", label: "Review queue" },
    strip: [fromPipeline("frames"), fromPipeline("track"), fromPipeline("name"), fromPipeline("review")],
  },
  {
    id: "ask",
    title: "Ask",
    sentence:
      "Ask ClinIQ about your own film: every claim links to the exact clip, play or stat, or it says it has no source.",
    href: `/cliniq?q=${encodeURIComponent(hackathon.demoQuestion)}`,
    cta: "Ask the demo question",
    strip: [fromPipeline("cite"), { label: "Answers · Muse Spark", status: "planned" }],
  },
  {
    id: "study",
    title: "Study",
    sentence:
      "Players study the play you assigned, with their own role highlighted and the clips that show it, then take a quiz.",
    href: "/study",
    cta: "Open Study",
    more: { href: "/study/results", label: "Team results" },
    strip: [
      { label: "Assigned play and quiz", status: "in-preview" },
      { label: "Quiz questions · Muse Spark", status: "planned" },
    ],
  },
]

export const consentStep: DemoStep = {
  id: "consent",
  title: "Hide this player",
  sentence:
    "No data about a player is shown or used until a guardian agrees. On upload, the coach can hide a player without consent from player and parent views.",
  href: "/film?upload=1",
  cta: "See it on upload",
  strip: [
    { label: "Hide from player and parent views", status: "in-preview" },
    { label: "Consent mask · SAM 3.1", status: "planned" },
  ],
}

// ---------- The 90-second demo script: /demo lists it, SUBMISSION.md tells it beat by beat ----------

export interface ScriptBeat {
  /** Time stamp in the video, "0:00–0:10". */
  at: string
  title: string
  href: string
  /** What the viewer sees, one sentence. */
  shows: string
}

export const demoScript: ScriptBeat[] = [
  {
    at: "0:00–0:10",
    title: "The submission page",
    href: "/",
    shows: "The one-liner and the theme: coaches film every game and almost never watch it back.",
  },
  {
    at: "0:10–0:20",
    title: "Demo flow",
    href: "/demo",
    shows: "Four steps, Record, Tag, Ask and Study, each with what runs today and what this build adds.",
  },
  {
    at: "0:20–0:30",
    title: "Record",
    href: "/film/record",
    shows: "The phone recorder: film from the stands and tap play names as they happen.",
  },
  {
    at: "0:30–0:45",
    title: "Tag",
    href: "/film/cedar-park",
    shows: "A tagged game in the film room, with the pipeline strip: Modal frames, SAM 3.1 tracks, Muse Spark names.",
  },
  {
    at: "0:45–0:55",
    title: "Review",
    href: "/film/review",
    shows: "Suggested tags wait for the coach to confirm them; nothing is trusted until a person says so.",
  },
  {
    at: "0:55–1:15",
    title: "Ask",
    href: `/cliniq?q=${encodeURIComponent(hackathon.demoQuestion)}`,
    shows: "ClinIQ answers the Westview zone question; each claim cites a clip, and one click opens that possession.",
  },
  {
    at: "1:15–1:25",
    title: "Study",
    href: "/study",
    shows: "A player studies the assigned play with his role highlighted, then takes the quiz.",
  },
  {
    at: "1:25–1:30",
    title: "Consent",
    href: "/film?upload=1",
    shows: "On upload, the coach hides a player without guardian consent from player and parent views.",
  },
]
