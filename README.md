# Hoops ClinIQ: hackathon demo

Hoops ClinIQ turns a coach's phone video of a basketball game into tagged plays and answers that cite the exact clip.

This is the open demo for the **Meta Global AI Developer Hackathon 2026** (theme: Build for Your World). It is a copy of the Hoops ClinIQ product app (`../../frontends/hoopscliniq-app`) cut down to the core loop: the sign-in, the role switcher and every screen outside Record → Tag → Ask → Study are deleted, so any other path is a 404. It adds a submission landing page at `/`, a demo flow at `/demo`, a hackathon bar on every demo screen and an AI pipeline status strip on the film screens.

Everything is sample data for a fictional team (the Lakeshore Lions). No video is processed and nothing is saved.

**The submission writeup (theme, 90-second demo script, Meta models, what's real, API contract) is in [SUBMISSION.md](SUBMISSION.md).**

## Run it

```bash
pnpm install
pnpm build
npx next start -p 3120     # production build: http://localhost:3120 (same as `pnpm start`)
pnpm dev                   # dev server, also on 3120 (3100 and 3110 are taken by the app and the site)
```

Checks: `npx tsc --noEmit`, `npx biome check .`, `pnpm build`.

## No sign-in, on purpose

The demo has no auth, so anyone with the link can open it. The product app's sign-in gate (proxy, session cookie, login page, log out) was removed. Pages stay out of search engines: `robots.txt` disallows everything, every response carries `X-Robots-Tag: noindex`, and the root layout sets `robots: noindex`. No environment variables are needed.

## Where things are

| What                                            | Where                                                                                                          |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Submission landing page                         | `/` (`src/app/page.tsx`); `/hackathon` redirects there (308, `next.config.ts`)                                 |
| Demo flow (start here)                          | `/demo` (`src/app/(app)/demo/page.tsx`): Record → Tag → Ask → Study, plus "Hide this player"                   |
| Navigation (core only)                          | `src/lib/nav.ts`: Demo home, Playbook, Film (Record, Review), ClinIQ, Study (Team results at `/study/results`) |
| Study (player view of one assigned play + quiz) | `/study`, `/study?play=<id>`, `/study/quiz`, `/study/clips/<film>`, `/study/results`                           |
| Build statuses (flip "planned" to "live")       | `src/mocks/hackathon.ts`: `modelRows`, `pipelineSteps`, `demoFlow`, `consentStep`, `statusAsOf`                |
| 90-second demo script                           | `src/mocks/hackathon.ts`: `demoScript` (listed on `/demo`, told beat by beat in `SUBMISSION.md`)               |
| Measured eval results (empty until measured)    | `src/mocks/hackathon.ts`: `measuredResults`                                                                    |
| AI pipeline strip                               | `src/components/hackathon/pipeline-strip.tsx`, shown on `/film`, `/film/[id]` and `/`                          |
| Hackathon bar                                   | `src/components/hackathon/demo-bar.tsx` (links to `/`)                                                         |
| Seeded ClinIQ question                          | `/cliniq?q=What did we run against Westview's zone and what worked?` (answer in `src/mocks/cliniq-answers.ts`) |
| Film deep link                                  | `/film/<id>?t=<seconds>` opens the film room at a cited clip                                                   |

The routes are the core loop only: `/`, `/demo`, `/playbook`, `/plays/new`, `/plays/<id>`, `/film`, `/film/record`, `/film/review`, `/film/<id>`, `/cliniq`, `/cliniq/limits`, `/study` (with `quiz`, `clips/<film>` and `results`), the three API stubs and `robots.txt`. Roster, schedule, practice, scouting, messages, insights, sideline, print, settings, sign-up, ClinIQ agents, workflows and approvals, and the player and parent apps were deleted; typing one of those paths shows the branded 404. ClinIQ sources that point at a deleted screen (a scouting report, a player page, season stats) render as plain labels instead of links (`inDemo()` in `src/lib/nav.ts`).

## Where the backend plugs in

The backend (Modal + SAM 3.1 + Muse Spark on the Meta API + Muse Spark Open on Baseten) lives in its own repo. These three route handlers return mock data today, each with an `x-demo: mock` header. Set the server-only env var `HOOPSCLINIQ_API_URL` (no `NEXT_PUBLIC`; see `.env.example`) and they proxy to `<url>/film/upload`, `<url>/film/jobs/<id>` and `<url>/cliniq/ask` with a 25 s timeout, passing the status and JSON through with `x-demo: live`. On a network error, timeout or 5xx they fall back to the mock with `x-demo: mock` and an `x-demo-fallback: <reason>` header; the existing 400 validation runs before proxying. Unset, they return the mock as before.

| Route                    | Request                                 | Response today (mock)                                                                                                                        |
| ------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/film/upload`  | the clip (multipart)                    | `202 { jobId, status: "queued", statusUrl }`: the Modal job id                                                                               |
| `GET /api/film/jobs/:id` |                                         | `{ jobId, status, steps[], suggestedName, playDna }`: tracks as play-dna JSON (`src/lib/play-dna/*.play.json` format, NFHS 84 x 50 ft, feet) |
| `POST /api/cliniq/ask`   | `{ "question": "..." }` (max 500 chars) | `{ question, answer: { body[], citations[], confidence, credits }, noSource }`; `400` on a bad body                                          |

Expected contract once the backend is live:
1. `POST /api/film/upload` stores the clip, starts the Modal job (ffmpeg frames, SAM 3.1 tracks for the 10 players) and returns its job id.
2. `GET /api/film/jobs/:id` returns the job status per pipeline step, the player tracks and the play-dna JSON, plus Muse Spark's suggested play name for the coach to confirm.
3. `POST /api/cliniq/ask` answers with Muse Spark using tool calls (`fetch_play`, `fetch_clip`, `fetch_stat`). Every claim carries a citation `{ kind: "play" | "clip" | "stat", label, href }` pointing at a route in this app; with no source, it says so instead of guessing.

The screens still read `src/data/*` (which re-exports `src/mocks/*`); that is the seam for wiring live data into the UI. Keep the mocks as the live-demo fallback.

## Deploy

Not deployed yet. When it is, use its own Vercel project (`hoopscliniq-demo`), separate from the product app and the site.
