# GrowEasy AI CSV Importer

This is my submission for GrowEasy's Software Developer Intern assignment: a CSV importer that uses an LLM to map lead data from any spreadsheet format — Facebook exports, Google Ads, real-estate CRMs, someone's hand-built spreadsheet, whatever — into GrowEasy's fixed CRM schema.

- **Live app:** https://groweasy-csv-importer-amber.vercel.app
- **Live API:** https://groweasy-csv-importer-lo1o.onrender.com
- **Position applying for:** Software Developer Intern

## The flow

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│  1. Upload   │ ──▶ │  2. Preview  │ ──▶ │  3. Confirm import │ ──▶ │  4. Results  │
│  CSV file    │     │  (no AI yet) │     │  (calls backend)   │     │  imported /  │
└──────────────┘     └──────────────┘     └───────────────────┘     │  skipped     │
                                                                      └──────────────┘
```

1. The frontend parses the CSV in the browser (Papa Parse) and shows a preview table. No AI call happens at this point — that's a hard requirement in the spec and it also means you can bail out before spending any AI credits on a file you uploaded by mistake.
2. Once you click confirm, the file goes to the backend, which re-parses it, splits the rows into batches, and sends each batch to an LLM along with a prompt describing GrowEasy's CRM schema, the allowed enum values, and how to handle messy edge cases.
3. Every field the AI returns gets re-checked in plain code before it's trusted — enums are snapped to the allowed set (or blanked if there's no confident match), dates have to survive `new Date()`, emails and phone numbers are regex-validated, and rows with neither get dropped, per the spec.
4. Progress comes back to the frontend over Server-Sent Events, so there's a real progress bar instead of a spinner that doesn't tell you anything.
5. The results page splits everything into imported / skipped / column-mapping tabs, and you can download the mapped output as a CSV.

## A few decisions worth explaining

**Groq instead of Gemini as the default provider.** I originally built this against Gemini, but the free-tier API key kept coming back with a hard 0 request quota no matter how many times I regenerated it or made a fresh project — turned out to be an account/region restriction on Google's end, not something wrong with the code. Groq's free tier doesn't require a card and is fast, so that's the default now. The Gemini code is still in the repo and fully working (`backend/src/services/ai/gemini.provider.ts`) — set `AI_PROVIDER=gemini` and a `GEMINI_API_KEY` to use it instead. Both implement the same `AiProvider` interface, so swapping providers (or adding OpenAI/Claude later) is a one-file change.

**The AI's output doesn't get trusted blindly.** `validation.service.ts` re-checks everything after extraction — enum coercion, date parsing, email/mobile regex, and the "must have an email or a mobile number or get skipped" rule are all enforced in code, not left up to whatever the model decided to do that call.

**Batches, not one giant request.** Rows go out in batches of 40 by default, with up to 2 in flight at once, and each batch retries with exponential backoff if it fails. If a batch still fails after retries, only those rows get marked as skipped — the rest of the import isn't wasted.

**SSE instead of polling for progress.** Felt like the more honest way to show "here's what's actually happening right now" instead of a fake progress bar or a poll-every-2-seconds hack.

**The data table uses CSS Grid, not a real `<table>`.** I wanted the preview and results tables to handle large files well, which meant virtualizing rows (only rendering what's on screen). A real `<table>` doesn't virtualize cleanly — each visible row would need its own separate `<table>` element, and then row widths stop matching the header. Building it on `role="table"` / `role="grid"` semantics over CSS Grid keeps header and body columns pixel-aligned no matter how many rows are actually mounted.

**Column mapping is shown, not hidden.** The AI also reports back how it interpreted each source column (e.g. `full_name → name`, confidence: high), and that's surfaced in its own tab on the results page. Felt important that the mapping isn't a total black box — you should be able to sanity-check what the model actually did.

## Project layout

```
backend/     Express + TypeScript API — CSV parsing, AI extraction, validation
frontend/    Next.js 16 + TypeScript + Tailwind UI
samples/     5 test CSVs in different real-world formats
docker-compose.yml
```

The backend pipeline, if you want to trace it: `csv.service.ts` → `extraction.service.ts` → `ai/*.provider.ts` → `validation.service.ts`. The frontend's four steps live in `frontend/src/app/page.tsx`, with the reusable bits split out into `components/`.

## Running it locally

You'll need Node 20+ and a free [Groq API key](https://console.groq.com/keys) (no card required to sign up).

**Backend**

```bash
cd backend
cp .env.example .env      # paste your GROQ_API_KEY in
npm install
npm run dev                # http://localhost:4000
```

**Frontend**

```bash
cd frontend
cp .env.example .env.local  # already points at localhost:4000 by default
npm install
npm run dev                 # http://localhost:3000 (or the next free port)
```

Then open the frontend, try one of the sample-CSV buttons (or drop in your own file), and walk through preview → confirm → results.

**Or with Docker, both services in one shot:**

```bash
GROQ_API_KEY=your_key_here docker compose up --build
```

Frontend on `http://localhost:3000`, backend on `http://localhost:4000`.

## Tests

```bash
cd backend
npm test
```

23 tests covering CSV parsing edge cases (BOM handling, quoted commas and newlines, empty rows, missing headers), the validation layer (enum coercion, date normalization, email/mobile checks, the contact-info skip rule, newline escaping), and the extraction pipeline itself (batching, progress events, retry-then-recover, retry-exhaustion falls back to skipped rather than crashing, partial AI responses).

## Environment variables

**Backend** (`backend/.env`):

| Variable | Default | Notes |
|---|---|---|
| `AI_PROVIDER` | `groq` | `groq` or `gemini` |
| `GROQ_API_KEY` | — | required if using groq |
| `GEMINI_API_KEY` | — | required if using gemini |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `*` | comma-separated origins in production |
| `BATCH_SIZE` | `40` | rows sent per AI request |
| `BATCH_CONCURRENCY` | `2` | batches processed in parallel |
| `MAX_UPLOAD_BYTES` | `5242880` | 5MB |

**Frontend** (`frontend/.env.local`):

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

## How the CRM mapping rules were implemented

Everything from the spec is in there: `crm_status` and `data_source` get snapped to their allowed enum lists (or left blank if the model isn't confident), `created_at` gets normalized into something `new Date()` can parse, the first email/mobile is used with any extras appended into `crm_note`, newlines inside fields get escaped so the CSV output stays valid, and rows with no email and no mobile number are skipped. The actual prompt (field definitions, a fuzzy-status mapping guide, a few worked examples of messy real-world rows) is in `backend/src/services/ai/prompt.ts`, and the code that double-checks everything afterward is in `backend/src/services/validation.service.ts`.

## Bonus items from the brief

- Drag & drop upload
- Live progress bar, driven by SSE from the backend
- Retry with exponential backoff for failed AI batches (3 attempts before a batch's rows get marked skipped)
- Virtualized tables for large CSVs (kicks in above 60 rows, `@tanstack/react-virtual`)
- Dark mode
- 23 unit tests (Vitest)
- Docker setup for both services
- Deployed (Vercel + Render, see below)
- This README

A couple of things I added beyond the list because they seemed worth doing: the AI provider is swappable through one env var instead of hardcoded, the results page shows *why* each row was skipped (with the raw source data alongside it) instead of just a count, there's rate limiting on the public import endpoint since the AI key behind it is shared, and you can download the mapped output as a CSV to round-trip and confirm it's actually valid.

## Deployment notes

- **Backend on Render** (free tier): connect the repo, root directory `backend`, build with `npm install && npm run build`, start with `npm start`.
- **Frontend on Vercel**: connect the repo, root directory `frontend`, set `NEXT_PUBLIC_API_URL` to the Render backend URL.
- Render's free tier spins the backend down after 15 minutes of no traffic, which would normally mean a ~50 second delay on the next request. I set up a free UptimeRobot monitor pinging `/health` every 5 minutes to keep it warm, and the frontend also pings `/health` on load and shows a "waking up" message as a fallback in case a cold start ever slips through.
