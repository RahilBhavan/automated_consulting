/**
 * Standalone ingestion script for GitHub Actions (or local with env set).
 * Run: bun run scripts/ingest.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: GITHUB_TOKEN (for higher GitHub API rate limit)
 *
 * Do not run from Vercel serverless (timeout); use this script in GHA instead.
 */

import { runIngestionAndSave } from "../src/lib/ingestion/run";

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  console.log("Running ingestion (DeFiLlama + CoinGecko, top 10% GitHub)...");
  const prospects = await runIngestionAndSave({
    coingeckoMaxPages: 6,
    maxGitHubRequests: 30,
  });
  console.log(`Done. Wrote ${prospects.length} prospects to Supabase.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
