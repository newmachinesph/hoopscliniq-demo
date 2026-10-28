# Hoops ClinIQ: Meta Global AI Developer Hackathon 2026

**Hoops ClinIQ turns a coach's phone video of a basketball game into tagged plays and answers that cite the exact clip.**

- Live demo: https://web--demo--mnlqynqt4mjy.code.run (no sign-in). Start at `/demo`.
- Code: this repo (the web app) and [hoopscliniq-ai](https://github.com/newmachinesph/hoopscliniq-ai) (the backend).
- Track: Indie developer. Theme: Build for Your World.

## The problem

High school and club coaches film every game on a phone and almost never watch it back. Tagging one game by hand takes
hours, and a volunteer coach with no analyst doesn't have them. Pro teams pay for camera rigs and tagging services. A
gym with one coach and one phone gets nothing.

## What it does with Meta's models

1. **SAM 3.1 tracks the players.** The coach sends a 20-second clip. Modal re-encodes it to 12 fps, and SAM 3.1 tracks
   every player with the prompt "basketball player" and the ball with a second prompt, "basketball". The backend
   follows the camera as it pans, maps each player's feet onto the court, splits the two teams by jersey color, and
   finds the ball holder, passes and shots.
2. **Muse Spark 1.3 names the play.** It reads the coach's own playbook, a second-by-second summary of the tracks and
   the passes and shots, and suggests which play this was and why. The coach confirms it; nothing is trusted until a
   person says so.
3. **Muse Spark writes the study quiz.** From the frames of a play, it writes questions for one player spot ("Where do
   you go after the pass?"). The backend drops any question that points at a frame the play doesn't have. A player
   answers and sees the frame that proves it. The quiz is a draft the coach checks before assigning.
4. **ClinIQ answers with a source or not at all.** Muse Spark answers the coach's questions with tool calls
   (`fetch_play`, `fetch_clip`, `fetch_stat`) over the team's season. Every claim carries a citation that opens the
   clip or play behind it. With no source, ClinIQ says so instead of guessing.
5. **SAM 3.1 hides a player without consent.** On a finished clip, the coach picks up to four players whose families
   have not given consent. The backend blurs each one in every frame from that player's SAM track and from then on
   serves only the blurred clip. The page says how many frames tracking missed, so the coach can check them.

## Measured

Measured on Oct 28, 2026, on 5 live-play clips the pipeline was never tuned on (40 frames). A box counts when it
overlaps a reference box at IoU 0.5 or more.

| Measure                          | Result                |
| -------------------------------- | --------------------- |
| Player boxes: precision          | 83% (318 of 384)      |
| Player boxes: recall             | 86% (318 of 369)      |
| Camera motion followed           | 1,200 of 1,200 frames |
| Upload to finished play, mean    | 109 s                 |
| SAM 3.1 cost per 20-second clip  | $0.10                 |
| Study quiz, Muse Spark call      | about 7 s             |
| Hide a player, 20-second clip    | about 7 s             |

An AI vision model checked the reference boxes; a person has not checked them yet. Ball accuracy, passes, shots and
screens are not measured. Full table: [eval/results/summary.md](https://github.com/newmachinesph/hoopscliniq-ai/blob/main/eval/results/summary.md).

## What's real and what's sample data

- **Real:** the whole video pipeline on real game footage, SAM 3.1 tracking, Muse Spark naming, the quiz, the
  consent blur and ClinIQ's tool calls. They all run on the Meta Model API from the backend on Modal.
- **Sample data:** the team. The Lakeshore Lions, their games, stats and playbook are fictional, so ClinIQ's answers
  are about a made-up season. The play names Muse Spark suggests for the real clips come from that fictional playbook.
- **The clips:** two 20-second cuts from public broadcasts of Hazen Union (Vermont) varsity games, CC BY 4.0, by
  Hardwick Community Television via Wikimedia Commons. Attribution is on screen wherever they play.
- **Not in this build:** Muse Spark Open on Baseten (the backend has the switch, but the endpoint returned 403), voice
  tags from Muse Voice Transcribe, made or missed shots, screens and cuts.

## The 90-second video

The video follows `demoScript` in `src/mocks/hackathon.ts`, also listed on `/demo` under "Watch the 90-second path".

| Time      | Beat                | Where                                    | What the viewer sees                                                                                  |
| --------- | ------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0:00–0:08 | The submission page | `/`                                      | The one-liner and the measured results.                                                               |
| 0:08–0:20 | Analyze a clip      | `/film?upload=1`                         | A 20-second game clip goes in; the steps advance through Modal, SAM 3.1 and Muse Spark.               |
| 0:20–0:40 | The finished play   | `/film`, then the newest analysis        | SAM 3.1 boxes on the video, the ten players on the court diagram, Muse Spark's name for the play.     |
| 0:40–0:50 | Hide a player       | the same analysis                        | The coach hides a player; the clip comes back blurred in every frame.                                 |
| 0:50–1:08 | Quiz the team       | `/study/quiz?play=primary-transition`    | Muse Spark writes a quiz for one spot; a player answers and sees the frame that proves it.            |
| 1:08–1:25 | Ask ClinIQ          | `/cliniq`                                | "What did we run against Westview's zone and what worked?", with a citation on every claim.           |
| 1:25–1:30 | What's live         | `/demo`                                  | Each step shows what runs on Meta's models and what is still sample data.                             |

## How it's built

- **Web app** (this repo): Next.js 16 and React 19, deployed on Northflank. Its API routes are a thin proxy to the
  backend. With no backend configured they answer from sample data, marked `x-demo: mock`.
- **Backend** ([hoopscliniq-ai](https://github.com/newmachinesph/hoopscliniq-ai)): Python, FastAPI on Modal, the
  Meta Model API through the OpenAI-compatible SDK, ffmpeg and OpenCV, storage on a Modal Volume, errors to Sentry.
  173 tests. Its README documents every route, the pipeline step by step, and what doesn't work yet.

## How to run it locally

Needs Node 22+ and pnpm.

```bash
pnpm install
pnpm build
npx next start -p 3120
```

Open http://localhost:3120. With no environment variables, every screen runs on sample data. To use the live backend,
set `HOOPSCLINIQ_API_URL` to its URL (see `.env.example`).
