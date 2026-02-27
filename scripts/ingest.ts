/**
 * Standalone ingestion script for GitHub Actions (or local with env set).
 * Run: bun run ingest
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (in .env.local or env)
 * Optional: GITHUB_TOKEN (for higher GitHub API rate limit)
 *
 * Do not run from Vercel serverless (timeout); use this script in GHA instead.
 */

import { existsSync } from "fs";
import { resolve } from "path";

// Load .env.local (or .env) so bun run ingest works with local env vars
const root = resolve(process.cwd());
const envLocal = resolve(root, ".env.local");
const envFile = resolve(root, ".env");
const path = existsSync(envLocal) ? envLocal : existsSync(envFile) ? envFile : null;
if (path) {
  const text = await Bun.file(path).text();
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const i = trimmed.indexOf("=");
      if (i > 0) {
        const key = trimmed.slice(0, i).trim();
        const raw = trimmed.slice(i + 1).trim();
        const value = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1).replace(/\\"/g, '"') : raw;
        if (!(key in process.env)) process.env[key] = value;
      }
    }
  }
}

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
