# Implementation Plan — Evaluation Fixes

Plan to implement the fixes from the project evaluation. Tasks are ordered by dependency and priority.

---

## Phase A: Quick wins (no new abstractions)

### A1. Update `.env.example` — High

**Goal:** New clones see correct required env; remove obsolete CRON_SECRET.

**Steps:**
1. Add at top (required):
   - `NEXT_PUBLIC_SUPABASE_URL=`
   - `SUPABASE_SERVICE_ROLE_KEY=`
2. Keep `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` as documented.
3. Remove `CRON_SECRET` (or comment with “No longer used; ingestion runs via GHA or `bun run ingest`”).

**Files:** `.env.example`

**Acceptance:** `.env.example` lists Supabase vars first; README and local setup stay in sync.

---

### A2. Fix UI copy (ingest / CRON) — Medium

**Goal:** UI no longer mentions POST /api/ingest or CRON_SECRET.

**Steps:**
1. Search codebase for strings: `POST /api/ingest`, `CRON_SECRET`, “Run ingestion”, “api/ingest”.
2. In `src/components/prospect-table.tsx` (empty state): replace copy that says to run POST /api/ingest with “Run ingestion via GitHub Actions or `bun run ingest`” (or link to README).
3. In any other component or error message that references cron/ingest API, update to the same wording.

**Files:** `src/components/prospect-table.tsx`, any other hits from search.

**Acceptance:** No user-facing text refers to POST /api/ingest or CRON_SECRET.

---

## Phase B: Data layer — get by ID

### B1. Add `getProspectById(id)` — High

**Goal:** Detail page and API don’t load all prospects to find one.

**Steps:**
1. In `src/lib/db.ts`:
   - Add `getProspectById(id: string): Promise<Prospect | null>`.
   - Use Supabase: `.from('prospects').select('*').eq('id', id).maybeSingle()`.
   - Reuse existing `rowToProspect` (cast row to `ProspectRow` then map).
2. Optionally add `getPipelineEntryByProspectId(prospectId: string): Promise<PipelineEntry | null>` with `.eq('prospect_id', prospectId).maybeSingle()` and reuse `rowToPipelineEntry`.

**Files:** `src/lib/db.ts`

**Acceptance:** `getProspectById('x')` returns one prospect or null; no full-table read.

---

### B2. Use get-by-ID in detail page and API — High

**Goal:** Prospect detail uses a single prospect fetch.

**Steps:**
1. **Detail page** `src/app/prospect/[id]/page.tsx`:
   - Replace `readProspects()` + `.find()` with `getProspectById(id)`.
   - If you added `getPipelineEntryByProspectId`, use it; otherwise keep `readPipeline()` and `.find()` for that one prospect (or add the helper and use it).
   - Call `notFound()` when `getProspectById(id)` returns null.
2. **API** `src/app/api/prospects/[id]/route.ts`:
   - Replace `readProspects()` + `.find()` with `getProspectById(id)`.
   - For pipeline entry: use `getPipelineEntryByProspectId(id)` if added, else keep current read + find.
   - Return 404 when prospect is null.

**Files:** `src/app/prospect/[id]/page.tsx`, `src/app/api/prospects/[id]/route.ts`

**Acceptance:** Detail page and GET /api/prospects/[id] each do at most one prospect query (and one pipeline query if helper added); no full prospects list fetch for detail.

---

## Phase C: Testing

### C1. Test setup — Medium

**Goal:** Single test runner and one place for test utilities.

**Steps:**
1. Add a test runner if missing (e.g. `bun test` or Vitest/Jest). Prefer what’s already in the repo or standard for Next/Bun (e.g. Vitest).
2. In `package.json`, add script: `"test": "vitest"` (or `"test": "bun test"` if using Bun’s built-in runner).
3. Create `src/lib/scoring/__tests__/score.test.ts` (or `score.spec.ts`) and `src/lib/ingestion/__tests__/merge.test.ts` (or next to merge as `merge.spec.ts`). Optionally a top-level `tests/` directory instead of colocated.

**Files:** `package.json`, optionally `vitest.config.ts` or equivalent.

**Acceptance:** `bun run test` (or `npm run test`) runs tests (can be empty at first).

---

### C2. Unit tests: scoring — Medium

**Goal:** Regressions in pain scoring and treasury gate are caught.

**Steps:**
1. In `src/lib/scoring/__tests__/score.test.ts` (or chosen path):
   - Import `computePainSignals`, `computeRawScore`, `applyTreasuryGate` from `@/lib/scoring/score`.
   - Build minimal `RawProspect` fixtures (e.g. multi-chain, RWA, TVL decline, low TVL).
   - Assert: multi-chain gets expected signal; treasury gate caps score when TVL < $5M and not VC-backed; VC-backed bypasses gate when applicable.
   - Add at least one edge case (e.g. zero TVL, null fields).

**Files:** `src/lib/scoring/__tests__/score.test.ts` (or equivalent).

**Acceptance:** Tests pass; changing a signal or gate constant breaks a test as expected.

---

### C3. Unit tests: merge — Medium

**Goal:** Merge key logic (DeFiLlama gecko_id vs CoinGecko id, name/slug) and top-10% GitHub behavior are covered.

**Steps:**
1. In `src/lib/ingestion/__tests__/merge.test.ts`:
   - Mock or minimal inputs: list of DeFiLlama-style and CoinGecko-style items; call `merge(..., { attachGitHub: false })`.
   - Assert: expected number of raw prospects; ids and categories; `githubSlug` present when DeFiLlama has github.
   - If feasible without hitting GitHub: test `attachGitHubForTopIds` with a tiny `rawList` and `topIds` and assert one prospect gets `githubActivity` (or skip and document as integration test).

**Files:** `src/lib/ingestion/__tests__/merge.test.ts`.

**Acceptance:** Merge tests pass; id/slug merging behavior is documented by tests.

---

### C4. API test (optional) — Medium

**Goal:** One happy-path API test so route + db wiring is validated.

**Steps:**
1. Add a test that either:
   - Calls `GET /api/prospects` and asserts 200 and array, or
   - Uses the route handler directly with a mock Supabase/db (if you introduce mocks).
2. If using Supabase in test, use a test project or local Supabase; otherwise mock `getSupabase` / `readProspects` so the test doesn’t need a real DB.

**Files:** e.g. `src/app/api/prospects/__tests__/route.test.ts` or `tests/api/prospects.test.ts`.

**Acceptance:** Test passes in CI; changing response shape or status breaks the test.

---

## Phase D: Ingest script robustness (low)

### D1. Document or fix Bun path resolution for ingest — Low

**Goal:** `bun run scripts/ingest.ts` (and GHA) reliably resolve `@/` imports from `run.ts`.

**Steps:**
1. **Verify:** In CI or locally, run `bun run scripts/ingest.ts` (with Supabase env set) and confirm it completes. If it already works, add one sentence to README: “The ingest script is run with `bun run ingest`; Bun resolves `@/*` from tsconfig.”
2. **If it fails** with “Cannot find module '@/...'”:
   - Option A: Add a small runner (e.g. `scripts/run-ingest.ts`) that uses relative imports to `../src/lib/ingestion/run` and have `run.ts` accept a minimal options bag; ensure any code under `run.ts` that uses `@/` is only reachable from Next (build), not from the script.
   - Option B: In `scripts/ingest.ts`, use relative imports for all ingestion/db/types (e.g. `../src/lib/ingestion/run`, `../src/lib/db`) so the script doesn’t depend on path mapping.

**Files:** `scripts/ingest.ts`, possibly `scripts/run-ingest.ts`, `README.md`.

**Acceptance:** `bun run ingest` (or equivalent) runs successfully in GHA and locally; README states how ingest is run and that path resolution is verified.

---

## Phase E: Future / optional

### E1. RLS and client Supabase — Low (only if adding client-side Supabase)

**Goal:** When/if you add a client-side Supabase client (e.g. real-time pipeline), use RLS and anon key; keep service role for server and ingest only.

**Steps:**
1. In Supabase: enable RLS on `prospects` and `pipeline`; add policies (e.g. select for anon, or for authenticated users only).
2. In the app: use `createClient(url, anon_key)` for client; keep service role in server and in ingest script.
3. Document in README that RLS is used for client access.

**Files:** New migration for RLS policies, client-side Supabase usage, README.

**Defer until:** You actually introduce a browser Supabase client.

---

## Execution order

| Order | Task    | Phase | Priority |
|-------|---------|--------|----------|
| 1     | A1      | .env.example | High |
| 2     | B1      | getProspectById (+ optional getPipelineEntryByProspectId) | High |
| 3     | B2      | Use get-by-ID in detail page and API | High |
| 4     | A2      | UI copy (ingest / CRON) | Medium |
| 5     | C1      | Test setup | Medium |
| 6     | C2      | Scoring unit tests | Medium |
| 7     | C3      | Merge unit tests | Medium |
| 8     | C4      | API test (optional) | Medium |
| 9     | D1      | Ingest script path resolution | Low |
| —     | E1      | RLS (only when adding client Supabase) | Low / Later |

---

## Checklist summary

- [x] A1: `.env.example` updated (Supabase vars, CRON_SECRET removed/commented)
- [x] B1: `getProspectById` (and optionally `getPipelineEntryByProspectId`) in `db.ts`
- [x] B2: Detail page and GET /api/prospects/[id] use get-by-ID
- [x] A2: UI copy updated (no POST /api/ingest or CRON_SECRET)
- [x] C1: Test script and test file layout
- [x] C2: Scoring unit tests
- [x] C3: Merge unit tests
- [x] C4: (Optional) API test
- [x] D1: Ingest script path resolution documented or fixed
- [ ] E1: (Later) RLS when adding client Supabase
