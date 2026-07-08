# GrowEasy AI CSV Importer

An AI-powered CSV importer that maps **any** lead export — Facebook Lead Ads, Google Ads, real-estate CRMs, sales reports, manually built spreadsheets — into GrowEasy's fixed CRM schema, regardless of column names or layout.

Built for the **Software Developer Intern** assignment at GrowEasy.

- **Live app:** https://groweasy-csv-importer-amber.vercel.app
- **Live API:** https://groweasy-csv-importer-lo1o.onrender.com

## How it works

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│  1. Upload   │ ──▶ │  2. Preview  │ ──▶ │  3. Confirm import │ ──▶ │  4. Results  │
│  CSV file    │     │  (no AI yet) │     │  (calls backend)   │     │  imported /  │
└──────────────┘     └──────────────┘     └───────────────────┘     │  skipped     │
                                                                      └──────────────┘
```

1. **Frontend** parses the CSV client-side (Papa Parse) and renders a preview table — no AI call happens until the user explicitly confirms.
2. On confirm, the file is uploaded to the **backend**, which re-parses it, splits rows into batches, and sends each batch to an **LLM** (Groq/Llama 3.3 70B by default, with a Gemini implementation included) with a carefully engineered prompt describing the GrowEasy CRM schema, allowed enum values, and edge-case rules.
3. Every AI-returned record is **deterministically re-validated** (Zod-style checks, not just trusted) — enums are coerced to the allowed set, dates must survive `new Date()`, emails/mobiles are regex-checked, and rows lacking any contact info are skipped per the assignment spec.
4. Progress streams back to the frontend over **Server-Sent Events**, so the UI shows a live progress bar instead of a blank spinner.
5. Results are shown in a table with **imported / skipped / column-mapping** tabs, and can be downloaded as a GrowEasy-formatted CSV.

## Why these decisions

- **Groq (Llama 3.3 70B) as the default AI provider, not Gemini.** Gemini's free tier turned out to return a hard `0` request quota for the account used to build this (a known account/region-gating issue, not a bug in this code) even after regenerating keys and creating fresh projects. Groq's free tier requires no billing card and is fast. The `AiProvider` interface (`backend/src/services/ai/provider.ts`) means either works interchangeably — a working `gemini.provider.ts` implementation is included and can be swapped in by setting `AI_PROVIDER=gemini` and providing `GEMINI_API_KEY`.
- **Deterministic post-validation, not blind trust in the LLM.** The AI is treated as untrusted input. `validation.service.ts` re-checks every field after extraction: enum coercion, date parsing, email/mobile regex validation, and the mandatory "skip rows with neither email nor mobile" rule are all enforced in code, not left to the model's judgment.
- **Batching + bounded concurrency + retry.** Rows are sent in batches of 40 (configurable), with up to 2 batches in flight at once and exponential-backoff retries per batch. A batch that exhausts retries is marked skipped rather than failing the whole import — partial failures degrade gracefully.
- **SSE over polling.** The import endpoint streams progress events so the frontend can show real-time progress without a polling loop.
- **CSS Grid instead of `<table>` for the virtualized data table.** A real `<table>` can't be virtualized without rows losing column alignment with the header (each virtualized row would need its own `<table>`, and widths would drift). The `DataTable` component uses `role="table"`/`role="row"` semantics over CSS Grid so header and body always share identical column widths, virtualized or not.
- **Column-mapping transparency.** The AI also returns how it interpreted each source column (`full_name → name`, confidence: high), surfaced in a dedicated "Column Mapping" tab — so the mapping isn't a black box.

## Project structure

```
backend/     Express + TypeScript API (CSV parsing, AI extraction, validation)
frontend/    Next.js 16 + TypeScript + Tailwind UI
samples/     5 realistic test CSVs in different formats
docker-compose.yml
```

See `backend/src/` for the pipeline (`csv.service.ts` → `extraction.service.ts` → `ai/*.provider.ts` → `validation.service.ts`) and `frontend/src/` for the 4-step UI flow.

## Running locally

### Prerequisites
Node.js 20+, npm. A free [Groq API key](https://console.groq.com/keys) (no billing card required).

### Backend

```bash
cd backend
cp .env.example .env      # then paste your GROQ_API_KEY into .env
npm install
npm run dev                # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local  # defaults to http://localhost:4000
npm install
npm run dev                 # http://localhost:3000 (or next free port)
```

Open the frontend URL, click one of the sample-CSV quick-try buttons (or drag in your own), preview, confirm, and watch the AI-mapped results.

### Docker (one command, both services)

```bash
GROQ_API_KEY=your_key_here docker compose up --build
```

Frontend at `http://localhost:3000`, backend at `http://localhost:4000`.

## Tests

```bash
cd backend
npm test
```

23 unit tests covering: CSV parsing edge cases (BOM, quoted commas/newlines, empty rows, missing header), field validation (enum coercion, date normalization, email/mobile regex, the contact-info skip rule, newline escaping for CSV safety), and the extraction pipeline (batching, progress reporting, retry-then-recover, retry-exhaustion-marks-skipped, partial AI responses).

## Environment variables

**Backend** (`backend/.env`, see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `groq` | `groq` or `gemini` |
| `GROQ_API_KEY` | — | Required if `AI_PROVIDER=groq` |
| `GEMINI_API_KEY` | — | Required if `AI_PROVIDER=gemini` |
| `PORT` | `4000` | |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins in production |
| `BATCH_SIZE` | `40` | Rows per AI request |
| `BATCH_CONCURRENCY` | `2` | Parallel batches in flight |
| `MAX_UPLOAD_BYTES` | `5242880` | 5MB |

**Frontend** (`frontend/.env.local`, see `.env.example`):

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` |

## CRM field mapping & AI rules

Implements every rule from the assignment spec: enum coercion for `crm_status` (`GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`) and `data_source` (`leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`) with blank fallback on low confidence; `created_at` normalized to a `new Date()`-parseable format; first email/mobile used with extras appended to `crm_note`; newline escaping for CSV safety; rows with neither email nor mobile are skipped. See `backend/src/services/ai/prompt.ts` for the full engineered prompt (field definitions, fuzzy-status mapping guide, few-shot examples for messy real-world rows) and `backend/src/services/validation.service.ts` for the deterministic enforcement layer.

## Bonus features implemented

- ✅ Drag & drop upload
- ✅ Live progress indicator (SSE-driven)
- ✅ Incremental/streaming parsing (Papa Parse worker step callback client-side; SSE progress server-side)
- ✅ Retry mechanism for failed AI batches (exponential backoff, 3 attempts)
- ✅ Virtualized table for large CSVs (`@tanstack/react-virtual`, kicks in above 60 rows)
- ✅ Dark mode
- ✅ Unit tests (23 tests, Vitest)
- ✅ Docker setup (both services, `docker-compose.yml`)
- ✅ Deployment-ready (Vercel + Render configs, see below)
- ✅ This README

Plus, beyond the bonus list: an AI provider abstraction (swap Groq/Gemini/OpenAI/Claude via one env var), a column-mapping transparency panel, per-row skip reasons with raw data shown, rate limiting on the public API, and a "download imported CSV" round-trip proving the CSV-compatibility rule.

## Deployment

- **Backend → Render** (free tier): connect this repo, root directory `backend`, build `npm install && npm run build`, start `npm start`, add env vars from the table above.
- **Frontend → Vercel**: connect this repo, root directory `frontend`, add `NEXT_PUBLIC_API_URL` pointing at the Render backend URL.
- **No cold-start gap:** Render's free tier sleeps after 15 minutes idle. A free [UptimeRobot](https://uptimerobot.com) monitor pings `GET /health` every 5 minutes to keep the instance warm. The frontend also pings `/health` on load and shows a "waking up" banner as a fallback if a cold start is ever hit.
