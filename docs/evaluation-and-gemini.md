# Project evaluation: coins 200–2000 and Gemini deliverables

## What this project does

**CryptoProspect** discovers and scores crypto/DeFi prospects for freelance financial dashboard work. It:

1. **Gets coins in rank 200–2000** (by market cap) from CoinGecko or Coinranking.
2. Merges that with **DeFiLlama** protocol/TVL data and optional **GitHub** activity.
3. **Scores** prospects with pain signals and a treasury gate.
4. Generates **outreach deliverables**: email draft and deliverable spec (tech stack, hours, price range, proof-of-work paragraph).

Originally only **Claude** was used for (4). This doc explains how to get coins 200–2000 and how **Gemini** is wired in to analyze prospects and generate the same deliverables.

---

## How to get coins 200–2000

The “200–2000” is **market cap rank**, not a coin count. You get that universe in two ways.

### Option A: CoinGecko (default)

- **No key**: Free tier, ~10–30 calls/min. Use pages 2–20 of `/coins/markets` (100 per page) and filter by `market_cap_rank` in [200, 2000].
- **Demo key**: Set `COINGECKO_API_KEY` → same base URL, higher limits.
- **Pro key**: Set `COINGECKO_API_KEY` and `COINGECKO_PRO=1` → `pro-api.coingecko.com`.

Implementation: `src/lib/ingestion/coingecko.ts` → `fetchMarketsRank200To2000(maxPages)` (default 19 pages).

### Option B: Coinranking

- Set `COIN_SOURCE=coinranking` and `COINRANKING_API_KEY` (free at [developers.coinranking.com](https://developers.coinranking.com)).
- Implementation: `src/lib/ingestion/coinranking.ts` → `fetchMarketsRank200To2000()`.

### Running ingestion (required to populate prospects)

Ingestion is **not** run from the Next.js app (Vercel timeouts). Use either:

1. **GitHub Actions (recommended)**  
   - Workflow: `.github/workflows/ingest.yml` (e.g. daily at 6:00 UTC).  
   - Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; optional: `GITHUB_TOKEN`, `COINRANKING_API_KEY`.  
   - Repo variable (optional): `COIN_SOURCE` = `coinranking` to use Coinranking for coins 200–2000.

2. **Local / CI**  
   ```bash
   bun run ingest
   ```  
   Same env in `.env.local`. Script: `scripts/ingest.ts` (loads `.env.local`, then calls `runIngestionAndSave`).  
   For a quicker dev run, ingestion already supports `coingeckoMaxPages: 6` in the script (fewer CoinGecko pages).

Result: prospects (with coins 200–2000 + DeFiLlama merge + scoring) are written to **Supabase**. The dashboard and APIs read from there.

---

## Using Gemini for analysis and deliverables

The app can use **Gemini** instead of (or alongside) Claude to:

- **Analyze** a prospect (same context: name, category, TVL, pain signals).
- **Generate** the same two deliverables:
  - **Email draft**: short cold outreach email (body + optional subject).
  - **Deliverable spec**: tech stack, estimated hours, price range, proof-of-work paragraph.

### Setup

1. Get an API key: [Google AI Studio](https://aistudio.google.com/apikey).
2. In `.env.local` (and in Vercel if you deploy):
   ```bash
   GEMINI_API_KEY=your_key
   ```
3. Use the **Gemini** endpoints or the UI option (if enabled):
   - `POST /api/gemini/email-draft` — body `{ prospectId }`
   - `POST /api/gemini/deliverable-spec` — body `{ prospectId, deliverableId?, deliverableTitle? }`

Response shapes match the Claude APIs so the same frontend can call either provider.

### What Gemini “solves” for the project

- **Cost/latency**: Alternative to Claude for the same use case; you can choose by env or UI.
- **Analysis**: Same prospect context (pain signals, TVL, category) is sent to Gemini to produce:
  - Email that cites a pain signal and includes a placeholder for a Tier 1 hook.
  - Deliverable spec aligned to the selected deliverable type (from pain-signal recommendations).
- **Deliverables**: Structured outputs (tech stack, hours, price range, proof-of-work paragraph) so you can paste into outreach or internal specs.

### Optional: choose provider in UI

The detail panel can call either Claude or Gemini (e.g. dropdown “Use Claude” / “Use Gemini”). If only one API key is set, the app can fall back to the other or show a clear error.

---

## Summary

| Goal | How |
|------|-----|
| Get coins 200–2000 | CoinGecko (default) or Coinranking via `COIN_SOURCE`; ingestion via GHA or `bun run ingest`. |
| Analyze prospect | Same context (name, category, TVL, pain signals) is sent to Claude or Gemini. |
| Generate deliverables | Email draft + deliverable spec via Claude or Gemini APIs; same request/response shape. |
