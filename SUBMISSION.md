# Hoops ClinIQ: Meta Global AI Developer Hackathon 2026 submission

**Hoops ClinIQ turns a coach's phone video of a basketball game into tagged plays and answers that cite the exact clip.**
- Demo: `/demo` in this app (run it locally, see below). The submission page is `/`.
- Source: GitHub link added with the submission (placeholder).
- Track: Indie developer. Team details are added with the submission.

## Theme: Build for Your World

1. **A coach's problem.** Coaches film every game on a phone and almost never watch it back, because tagging one game by hand takes hours that a volunteer or high school coach doesn't have.
2. **Meta's models, in that world.** SAM 3.1 follows the ten players through shaky phone footage, and Muse Spark names each play in the coach's own words and answers only when it can cite the clip.
3. **Not possible before.** Until now this took a pro camera rig or a paid tagging service. Promptable video segmentation and an open model we host ourselves bring it to film a coach already has, with kids' data kept in our own tenancy.

Why this theme: the "world" is a gym with one coach, one phone and no analyst. The models do the part that coach can't staff, and the coach still confirms every tag.

## The 90-second demo script

Run the app (see "How to run it locally"), then follow these beats. The same list is on `/demo` under "Watch the 90-second path" (`demoScript` in `src/mocks/hackathon.ts`).

| Time      | Beat                | URL                                                                                      | What the viewer sees                                                                                     |
| --------- | ------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 0:00–0:10 | The submission page | `/`                                                                                      | The one-liner and the theme: coaches film every game and almost never watch it back.                     |
| 0:10–0:20 | Demo flow           | `/demo`                                                                                  | Four steps, Record, Tag, Ask and Study, each with what runs today and what this build adds.              |
| 0:20–0:30 | Record              | `/film/record`                                                                           | The phone recorder: film from the stands and tap play names as they happen.                              |
| 0:30–0:45 | Tag                 | `/film/cedar-park`                                                                       | A tagged game in the film room, with the pipeline strip: Modal frames, SAM 3.1 tracks, Muse Spark names. |
| 0:45–0:55 | Review              | `/film/review`                                                                           | Suggested tags wait for the coach to confirm them; nothing is trusted until a person says so.            |
| 0:55–1:15 | Ask                 | `/cliniq?q=What%20did%20we%20run%20against%20Westview's%20zone%20and%20what%20worked%3F` | ClinIQ answers the Westview zone question; each claim cites a clip, and one click opens that possession. |
| 1:15–1:25 | Study               | `/study`                                                                                 | A player studies the assigned play with his role highlighted, then takes the quiz (`/study/quiz`).       |
| 1:25–1:30 | Consent             | `/film?upload=1`                                                                         | On upload, the coach hides a player without guardian consent from player and parent views.               |

## Meta models and where they are used

Status today (Oct 28, 2026): every row is **planned, backend in progress Oct 28–Nov 3**. The backend is built in its own repo. The statuses shown in the app come from one file, `src/mocks/hackathon.ts` (`modelRows`, `pipelineSteps`); a row flips to "Live" only when it runs on real footage.

| Model or tool                 | Where it runs               | What it does in Hoops ClinIQ                                                                                                                            | Status                                    |
| ----------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| SAM 3.1                       | Meta API, called from Modal | Tracks all 10 players through a phone clip; jersey crops so the coach confirms who is who; consent mask to hide a player                                | Planned, backend in progress Oct 28–Nov 3 |
| Muse Spark 1.3                | Meta API                    | Names the play in the coach's playbook words; drafts quiz questions; ClinIQ tool calls (`fetch_play`, `fetch_clip`, `fetch_stat`), no source, no answer | Planned, backend in progress Oct 28–Nov 3 |
| Muse Spark Open               | Baseten                     | The coach-facing ClinIQ chat endpoint, so kids' data stays in our own tenancy                                                                           | Planned, backend in progress Oct 28–Nov 3 |
| Modal pipeline                | Modal GPU jobs              | ffmpeg frames → SAM 3.1 tracks → play-dna JSON; the eval harness against hand-labelled clips                                                            | Planned, backend in progress Oct 28–Nov 3 |
| Muse Code                     | Developer tool              | Builds the backend; its transcripts go in the writeup                                                                                                   | Planned, backend in progress Oct 28–Nov 3 |
| Muse Voice Transcribe (bonus) | Meta API                    | Sideline voice tags: say the play name and the clip gets tagged                                                                                         | Planned, backend in progress Oct 28–Nov 3 |

In the app: the model table and pipeline strip are on `/`; the pipeline strip is also on `/film` and every film room; each `/demo` card shows the status of the steps behind it.

## What's real and what's sample data

- **Real today:** the frontend. Every screen in the core loop renders and works: the recorder UI, the film room with tags and deep links to a possession (`/film/<id>?t=<seconds>`), the review queue, the play editor, ClinIQ's cited answer to the demo question, player study and the quiz, and the "Hide this player" option on upload. The three API routes answer with the contract below.
- **Sample data:** the team (the fictional Lakeshore Lions), players, games, clips, tags and every ClinIQ answer. The numbers in the demo answer are computed from the sample Westview film, but the film itself is fictional. Record and upload are previews: no video is processed and nothing is saved. Sources that point at screens outside this demo (scouting, roster, stats) show as plain labels.
- **Planned for this build (Oct 28–Nov 3):** the Modal + SAM 3.1 pipeline, Muse Spark naming and cited answers, and the first measured accuracy results. "How we test" on `/` lists the pass lines; the results table stays empty until the eval runs. Demo footage is adult or our own, never real minors' data.

## The API contract the backend fills

Three route handlers return mock data today, each with `x-demo: mock` and `Cache-Control: no-store`. The backend replaces their bodies and keeps the shapes.

| Route                    | Request                                 | Response                                                                                            |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST /api/film/upload`  | the clip (multipart)                    | `202 { jobId, status: "queued", statusUrl }`: the Modal job id                                      |
| `GET /api/film/jobs/:id` |                                         | `{ jobId, status, steps[], suggestedName, playDna }`; `400` on a bad id                             |
| `POST /api/cliniq/ask`   | `{ "question": "..." }` (max 500 chars) | `{ question, answer: { body[], citations[], confidence, credits }, noSource }`; `400` on a bad body |
1. `POST /api/film/upload` stores the clip, starts the Modal job (ffmpeg frames, SAM 3.1 tracks for the 10 players) and returns its job id.
2. `GET /api/film/jobs/:id` returns the status of each pipeline step (Upload → Frames → Track → Name → Review → Cite), the player tracks as play-dna JSON (the `src/lib/play-dna/*.play.json` format: NFHS court, 84 × 50 ft, in feet) and Muse Spark's suggested play name for the coach to confirm.
3. `POST /api/cliniq/ask` answers with Muse Spark using tool calls (`fetch_play`, `fetch_clip`, `fetch_stat`). Every claim carries a citation `{ kind: "play" | "clip" | "stat", label, href }` pointing at a route in this app. With no source, it says so instead of guessing.

## How to run it locally

Needs Node 22+ and pnpm. No environment variables, no sign-in.

```bash
pnpm install
pnpm build
npx next start -p 3120
```

Then open http://localhost:3120 (the submission page) and http://localhost:3120/demo (the demo). Every page is `noindex`.
