# Hoops ClinIQ: hackathon demo

Hoops ClinIQ turns a coach's phone video of a basketball game into tagged plays and answers that cite the exact clip.

This is the web app for the **Meta Global AI Developer Hackathon 2026** (Indie developer track, theme: Build for Your
World). It is the Hoops ClinIQ coach app cut down to the core loop: Record → Tag → Ask → Study, plus hiding a player
without consent.

- Live: https://web--demo--mnlqynqt4mjy.code.run (no sign-in; start at `/demo`)
- **The submission writeup (problem, Meta models, measured results, the 90-second video) is [SUBMISSION.md](SUBMISSION.md).**

## The two repos

| Repo | What it is | Runs on |
| ---- | ---------- | ------- |
| **hoopscliniq-demo** (this repo) | The web app (Next.js): Record → Tag → Ask → Study. Its `/api` routes proxy to the backend and fall back to sample data when it is unreachable. | Northflank |
| [hoopscliniq-ai](https://github.com/newmachinesph/hoopscliniq-ai) | The backend (FastAPI): SAM 3.1 player and ball tracking, court mapping, Muse Spark play naming, ClinIQ answers, study quizzes, the consent mask. Its README has the pipeline, the API and the [measured results](https://github.com/newmachinesph/hoopscliniq-ai/blob/main/eval/results/summary.md). | Modal |

The team, its games, stats and playbook are sample data for a fictional team (the Lakeshore Lions). The two sample
clips are real game footage (see Attribution).

## Run it

```bash
pnpm install
pnpm build
npx next start -p 3120     # production build: http://localhost:3120
pnpm dev                   # dev server on 3120
```

Checks: `npx tsc --noEmit`, `npx biome check .`, `pnpm build`.

With no environment variables, every API route answers from sample data (`x-demo: mock`). Set the server-only
`HOOPSCLINIQ_API_URL` to the deployed backend (see `.env.example`) and the routes proxy to it (`x-demo: live`).

## Where things are

| What                                  | Where                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Submission page                       | `/` (`src/app/page.tsx`); `/hackathon` redirects there                                                   |
| Demo flow (start here)                | `/demo` (`src/app/(app)/demo/page.tsx`)                                                                  |
| Analyze a clip, recent analyses       | `/film?upload=1`, `/film`; a job page is `/film/jobs/<jobId>`                                            |
| ClinIQ                                | `/cliniq?q=<question>`                                                                                   |
| Study and quizzes                     | `/study?play=<id>`, `/study/quiz?play=<id>&spot=<n>` (written by Muse Spark), `/study/quiz?id=<id>`     |
| Build statuses, measured results      | `src/mocks/hackathon.ts`: `modelRows`, `pipelineSteps`, `measuredResults`, `demoFlow`, `demoScript`     |
| API proxy                             | `src/app/api/**/route.ts`, `src/lib/api-proxy.ts`                                                        |

## API routes

Each route validates its input, then proxies to the backend when `HOOPSCLINIQ_API_URL` is set. On a network error,
timeout or 5xx, ClinIQ and the recent-analyses list fall back to sample data with `x-demo: mock` and an
`x-demo-fallback: <reason>` header. Upload, calibrate, hide and the quiz return the error instead.

| Route                              | Backend route                  | What it does                                                   |
| ---------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| `POST /api/film/upload`            | `POST /film/upload`            | Sends a clip or a sample clip; returns the job id              |
| `GET /api/film/jobs`               | `GET /film/jobs`               | Recent finished analyses                                       |
| `GET /api/film/jobs/:id`           | `GET /film/jobs/{id}`          | Steps, tracks, overlay, suggested name, hidden players         |
| `POST /api/film/jobs/:id/calibrate`| `POST /film/jobs/{id}/calibrate` | The coach's four court points; re-projects the tracks        |
| `POST /api/film/jobs/:id/hide`     | `POST /film/jobs/{id}/hide`    | Blurs up to 4 players in every frame                           |
| `POST /api/study/quiz`             | `POST /study/quiz`             | Muse Spark writes a quiz from a play's frames                  |
| `POST /api/cliniq/ask`             | `POST /cliniq/ask`             | A cited answer, or `noSource: true`                            |

## No sign-in, on purpose

Anyone with the link can open the demo. Pages stay out of search engines: `robots.txt` disallows everything, every
response carries `X-Robots-Tag: noindex`, and the root layout sets `robots: noindex`.

## Deploy

Northflank builds the `Dockerfile` from `main` on every push.

## Attribution

Sample clips in `public/samples/`: Hardwick Community Television (HCTV), Hazen Union, Vermont, via Wikimedia
Commons, **CC BY 4.0**:
[Boys Varsity Basketball v. Stowe - Feb. 10, 2025](https://commons.wikimedia.org/wiki/File:Boys_Varsity_Basketball_v._Stowe_-_Feb._10,_2025.webm)
and [Girls Varsity Basketball v. Lake Region - February 11, 2026](https://commons.wikimedia.org/wiki/File:Girls_Varsity_Basketball_v._Lake_Region_-_February_11,_2026.webm).
20-second cuts, re-encoded.
