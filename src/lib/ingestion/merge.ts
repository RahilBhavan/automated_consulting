/**
 * Merge CoinGecko and DeFiLlama data; attach GitHub where repo is known.
 * Output: RawProspect[] for scoring. Merge key: gecko_id (DeFiLlama) vs id (CoinGecko), or name/slug heuristic.
 */

import type { ProspectSource } from "@/types/prospect";
import type { RawProspect } from "@/types/prospect";
import type { GithubActivity } from "@/types/prospect";
import type { CoinGeckoNormalized } from "./coingecko";
import type { DefiLlamaNormalized } from "./defillama";
import { fetchActivityForRepoUrl, resolveRepoFromProtocol } from "./github";

const TREASURY_GATE_TVL = 5_000_000;

export type MergeOptions = {
  /** Fetch GitHub for DeFiLlama protocols that have github[] (slows down a lot). */
  attachGitHub?: boolean;
  /** Max GitHub requests to avoid rate limit. */
  maxGitHubRequests?: number;
  /** Label for coin data source when a match is found (default "coingecko"). */
  coinSource?: "coingecko" | "coinranking";
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Merge DeFiLlama (primary) with CoinGecko where gecko_id matches; add GitHub when requested.
 */
export async function merge(
  defiLlama: DefiLlamaNormalized[],
  coingecko: CoinGeckoNormalized[],
  options: MergeOptions = {}
): Promise<RawProspect[]> {
  const { attachGitHub = false, maxGitHubRequests = 20, coinSource = "coingecko" } = options;
  const cgBySlug = new Map<string, CoinGeckoNormalized>();
  const cgById = new Map<string, CoinGeckoNormalized>();
  for (const c of coingecko) {
    cgBySlug.set(c.slug, c);
    cgById.set(c.id, c);
  }

  const raw: RawProspect[] = [];
  let githubCount = 0;

  for (const p of defiLlama) {
    const id = `dl-${p.slug}`;
    let mcap: number | null = null;
    let volume: number | null = null;
    let athChangePct: number | null = null;
    let priceChange7d: number | null = null;

    const cg = p.geckoId ? cgById.get(p.geckoId) : cgBySlug.get(slugify(p.name));
    if (cg) {
      mcap = cg.mcap;
      volume = cg.volume;
      athChangePct = cg.athChangePct;
      priceChange7d = cg.priceChange7d;
    }

    let githubActivity: GithubActivity | null = null;
    const githubSlug = p.github?.[0] ?? null;
    if (attachGitHub && githubCount < maxGitHubRequests && githubSlug) {
      const repoUrl = resolveRepoFromProtocol(p.slug, githubSlug);
      if (repoUrl) {
        try {
          githubActivity = await fetchActivityForRepoUrl(repoUrl);
          githubCount++;
          await sleep(800);
        } catch {
          // ignore
        }
      }
    }

    raw.push({
      id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      chains: p.chains,
      tvl: p.tvl,
      tvlChange1m: p.tvlChange1m,
      mcap,
      volume,
      athChangePct,
      priceChange7d,
      githubActivity,
      sources: [
        "defillama",
        ...(cg ? ([coinSource] as ProspectSource[]) : []),
        ...(githubActivity ? (["github"] as ProspectSource[]) : []),
      ],
      urlDefillama: p.urlDefillama,
      urlCoingecko: p.urlCoingecko,
      urlTwitter: p.urlTwitter,
      ...(githubSlug ? { githubSlug } : {}),
    });
  }

  return raw;
}

/**
 * Fetch GitHub activity only for prospects whose id is in topIds (e.g. top 10% by score).
 * Mutates rawList in place. Use after initial merge without GitHub to avoid rate limits.
 */
export async function attachGitHubForTopIds(
  rawList: RawProspect[],
  topIds: Set<string>,
  maxRequests: number
): Promise<void> {
  const defiLlamaBySlug = new Map<string, RawProspect>();
  for (const r of rawList) {
    if (topIds.has(r.id) && r.githubSlug) defiLlamaBySlug.set(r.slug, r);
  }
  let count = 0;
  for (const r of rawList) {
    if (!topIds.has(r.id) || !r.githubSlug || count >= maxRequests) continue;
    const repoUrl = resolveRepoFromProtocol(r.slug, r.githubSlug);
    if (!repoUrl) continue;
    try {
      const activity = await fetchActivityForRepoUrl(repoUrl);
      r.githubActivity = activity;
      r.sources = r.sources.includes("github") ? r.sources : ([...r.sources, "github"] as ProspectSource[]);
      count++;
      await sleep(800);
    } catch {
      // ignore
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
