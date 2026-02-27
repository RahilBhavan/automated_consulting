# CryptoProspect — Freelance Intelligence Dashboard

Automates **discovery** and **diagnosis** of crypto prospects for freelance financial dashboard work. Surfaces projects (DeFiLlama TVL $10M–$100M, CoinGecko rank 500–2000) with a pain-signal score and treasury gate, and provides outreach tools (email draft + deliverable spec via Claude).

## Features

- **Prospect discovery:** CoinGecko + DeFiLlama + GitHub activity (top 10% by score only, to respect rate limits)
- **Pain scoring:** 9 heuristic signals (multi-chain, RWA, TVL decline, volume/mcap, ATH drawdown, Lending/CDP, DEX/AMM, 7d price swing, dead repo)
- **Treasury gate:** Score capped at 4 when TVL &lt; $5M (unless VC-backed)
- **Dashboard:** Sortable prospect table, detail panel with score breakdown and links
- **Outreach:** Claude-generated email draft and deliverable spec (structured via tool use: tech stack, hours, price range, proof-of-work paragraph)
- **Tracker:** Kanban/list pipeline (Uncontacted → Hook Building → Hook Sent → Replied → Demo Built → Converted)
- **Analytics:** Category distribution, score bins, funnel counts, pipeline value and revenue
- **Export:** CSV of prospects via `GET /api/export/prospects?format=csv`

## Setup

```bash
bun install
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY; optionally GITHUB_TOKEN
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data persistence (Supabase)

Prospects and pipeline are stored in **Supabase**. No local JSON.

1. Create a Supabase project and run the migration:
   - `supabase/migrations/20260227000000_init_prospects_pipeline.sql` (run in SQL Editor or via `supabase db push`).
2. In `.env.local` and in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL` — project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only; never expose to client)

## Populate prospects (ingestion)

Ingestion is **not** run from the Next.js app (Vercel serverless timeouts). Use either:

- **GitHub Actions (recommended):** Daily at 6:00 UTC via `.github/workflows/ingest.yml`. Add repo secrets:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GITHUB_TOKEN` (optional; higher GitHub rate limit)
- **Local / CI:** From repo root with env set:
  ```bash
  bun run ingest
  ```
  Same env vars as above. The script writes directly to Supabase. Bun resolves `@/*` from `tsconfig.json` when running the ingest script.

The `/api/ingest` route returns **501** with a message that ingestion must be run via GHA or `bun run ingest`.

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server) |
| `ANTHROPIC_API_KEY` | For Claude | Email draft and deliverable spec |
| `GITHUB_TOKEN` | Optional | Higher rate limit for GitHub in ingestion |

## API

- `GET /api/prospects` — list (query: `minScore`, `category`, `limit`)
- `GET /api/prospects/[id]` — single prospect + pipeline entry
- `GET /api/pipeline` — list (query: `status`)
- `POST /api/pipeline` — create/update entry (body: `prospectId`, `status`, `notes`, `contactedAt`, `followUpAt`, `estimatedValue`, `revenue`)
- `GET /api/ingest` / `POST /api/ingest` — return 501; use GHA or `bun run ingest` instead
- `GET /api/export/prospects?format=csv` — CSV export
- `POST /api/claude/email-draft` — body `{ prospectId }`
- `POST /api/claude/deliverable-spec` — body `{ prospectId, deliverableId?, deliverableTitle? }`

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind
- Bun
- Supabase (prospects + pipeline)
- Anthropic SDK (Claude, structured outputs via tool use)
