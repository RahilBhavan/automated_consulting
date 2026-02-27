# CryptoProspect — Freelance Intelligence Dashboard

Automates **discovery** and **diagnosis** of crypto prospects for freelance financial dashboard work. Surfaces projects (DeFiLlama TVL $10M–$100M, coin data rank **200–2000** by market cap) with a pain-signal score and treasury gate, and provides outreach tools (email draft + deliverable spec via Claude).

## Features

- **Prospect discovery:** Coin data (rank 200–2000) + DeFiLlama + GitHub activity (top 10% by score only, to respect rate limits). Coin source: CoinGecko (default) or Coinranking (set `COIN_SOURCE=coinranking`). See [docs/coin-sources-research.md](docs/coin-sources-research.md).
- **Pain scoring:** 9 heuristic signals (multi-chain, RWA, TVL decline, volume/mcap, ATH drawdown, Lending/CDP, DEX/AMM, 7d price swing, dead repo)
- **Treasury gate:** Score capped at 4 when TVL &lt; $5M (unless VC-backed)
- **Dashboard:** Sortable prospect table, detail panel with score breakdown and links
- **Outreach:** Claude or Gemini-generated email draft and deliverable spec (tech stack, hours, price range, proof-of-work paragraph). Choose provider in the prospect detail panel.
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
  - `COINRANKING_API_KEY` (optional; only if using Coinranking as coin source)
- Repo variable (optional): `COIN_SOURCE` = `coinranking` to use Coinranking instead of CoinGecko for coins rank 200–2000.
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
| `DATABASE_URL` | Optional | Direct Postgres URI (migrations, scripts, ORMs). Format: `postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres` |
| `ANTHROPIC_API_KEY` | For Claude | Email draft and deliverable spec (when using Claude) |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | For Gemini | Email draft and deliverable spec (when using Gemini). Get key at [Google AI Studio](https://aistudio.google.com/apikey). |
| `GITHUB_TOKEN` | Optional | Higher rate limit for GitHub in ingestion |
| `COIN_SOURCE` | Optional | `coingecko` (default) or `coinranking`. When `coinranking`, requires `COINRANKING_API_KEY`. |
| `COINRANKING_API_KEY` | For Coinranking | Required when `COIN_SOURCE=coinranking`. Free at [developers.coinranking.com](https://developers.coinranking.com). |

## API

- `GET /api/prospects` — list (query: `minScore`, `category`, `limit`)
- `GET /api/prospects/[id]` — single prospect + pipeline entry
- `GET /api/pipeline` — list (query: `status`)
- `POST /api/pipeline` — create/update entry (body: `prospectId`, `status`, `notes`, `contactedAt`, `followUpAt`, `estimatedValue`, `revenue`)
- `GET /api/ingest` / `POST /api/ingest` — return 501; use GHA or `bun run ingest` instead
- `GET /api/export/prospects?format=csv` — CSV export
- `POST /api/claude/email-draft` — body `{ prospectId }` (Claude)
- `POST /api/claude/deliverable-spec` — body `{ prospectId, deliverableId?, deliverableTitle? }` (Claude)
- `POST /api/gemini/email-draft` — body `{ prospectId }` (Gemini)
- `POST /api/gemini/deliverable-spec` — body `{ prospectId, deliverableId?, deliverableTitle? }` (Gemini)

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind
- Bun
- Supabase (prospects + pipeline)
- Anthropic SDK (Claude); @google/genai (Gemini) for email draft and deliverable spec
