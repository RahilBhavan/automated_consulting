/**
 * Full ingestion run: fetch CoinGecko + DeFiLlama, merge, score (with top-10% GitHub), delta, write.
 * Designed for standalone script (e.g. GitHub Actions); not for Vercel serverless (timeout).
 */

import type { Prospect } from "@/types/prospect";
import type { RawProspect } from "@/types/prospect";
import { fetchMarketsRank200To2000 as fetchCoingeckoRank200To2000 } from "./coingecko";
import { fetchMarketsRank200To2000 as fetchCoinrankingRank200To2000 } from "./coinranking";
import { fetchProtocols } from "./defillama";
import { merge, attachGitHubForTopIds } from "./merge";
import { computePainSignals, computeRawScore, applyTreasuryGate } from "@/lib/scoring/score";
import { getDeliverableRecommendations } from "@/lib/scoring/deliverables";
import { readProspects, writeProspects } from "@/lib/db";

const SCORE_JUMP_THRESHOLD = 2;
/** Only fetch GitHub for top N% by preliminary score to avoid rate limits. */
const GITHUB_TOP_PERCENT = 0.1;

export type IngestOptions = {
  /** Limit CoinGecko pages (100 coins per page) when using CoinGecko; ignored for Coinranking. */
  coingeckoMaxPages?: number;
  /** Max GitHub requests (for top 10% only). */
  maxGitHubRequests?: number;
};

/** Coin source: coingecko (default) or coinranking. Set via COIN_SOURCE env. */
export function getCoinSource(): "coingecko" | "coinranking" {
  const s = process.env.COIN_SOURCE?.toLowerCase();
  if (s === "coinranking") return "coinranking";
  return "coingecko";
}

/**
 * Fetch coins rank 200–2000 from configured source (CoinGecko or Coinranking).
 */
async function fetchCoinsRank200To2000(options: IngestOptions): Promise<Awaited<ReturnType<typeof fetchCoingeckoRank200To2000>>> {
  const source = getCoinSource();
  if (source === "coinranking") {
    return fetchCoinrankingRank200To2000();
  }
  const maxPages = options.coingeckoMaxPages ?? 19;
  return fetchCoingeckoRank200To2000(maxPages);
}

/**
 * Run full pipeline and return new prospects (does not write).
 * Applies treasury gate and score threshold before calling GitHub; only top 10% get GitHub data.
 */
export async function runIngestion(options: IngestOptions = {}): Promise<Prospect[]> {
  const { maxGitHubRequests = 30 } = options;

  const source = getCoinSource();
  if (source === "coinranking" && !process.env.COINRANKING_API_KEY) {
    throw new Error(
      "COIN_SOURCE=coinranking requires COINRANKING_API_KEY to be set. Set the env var or use COIN_SOURCE=coingecko."
    );
  }

  const [defiLlama, coingecko] = await Promise.all([
    fetchProtocols(),
    fetchCoinsRank200To2000(options),
  ]);

  const rawList = await merge(defiLlama, coingecko, {
    attachGitHub: false,
    coinSource: source,
  });

  const preliminaryScores = rawList.map((r) => {
    const signals = computePainSignals(r);
    const rawScore = computeRawScore(signals);
    const { score } = applyTreasuryGate(rawScore, r.tvl, r.vcBacked);
    return { id: r.id, score };
  });
  preliminaryScores.sort((a, b) => b.score - a.score);
  const topCount = Math.max(1, Math.min(maxGitHubRequests, Math.ceil(preliminaryScores.length * GITHUB_TOP_PERCENT)));
  const topIds = new Set(preliminaryScores.slice(0, topCount).map((x) => x.id));

  await attachGitHubForTopIds(rawList, topIds, maxGitHubRequests);

  const previous = await readProspects();
  const prevById = new Map(previous.map((p) => [p.id, p]));
  const now = new Date().toISOString();

  const prospects: Prospect[] = rawList.map((r: RawProspect) => {
    const signals = computePainSignals(r);
    const rawScore = computeRawScore(signals);
    const { score, treasuryGated } = applyTreasuryGate(rawScore, r.tvl, r.vcBacked);
    const volumeMcapRatio =
      r.mcap != null && r.mcap > 0 && r.volume != null
        ? (r.volume / r.mcap) * 100
        : null;

    const prev = prevById.get(r.id);
    const scoreJumped =
      prev != null && score - prev.painScore > SCORE_JUMP_THRESHOLD;

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      category: r.category,
      chains: r.chains,
      tvl: r.tvl,
      tvlChange1m: r.tvlChange1m,
      mcap: r.mcap,
      volume: r.volume,
      volumeMcapRatio,
      athChangePct: r.athChangePct,
      priceChange7d: r.priceChange7d,
      githubActivity: r.githubActivity,
      painScore: score,
      painScoreRaw: rawScore,
      painSignals: signals,
      treasuryGated,
      ...(scoreJumped ? { scoreJumped: true } : {}),
      deliverableRecommendations: getDeliverableRecommendations(signals),
      sources: r.sources,
      lastUpdated: now,
      urlDefillama: r.urlDefillama,
      urlCoingecko: r.urlCoingecko,
      urlTwitter: r.urlTwitter,
      urlDiscord: r.urlDiscord,
    };
  });

  return prospects;
}

/**
 * Run ingestion and persist to Supabase.
 */
export async function runIngestionAndSave(options: IngestOptions = {}): Promise<Prospect[]> {
  const prospects = await runIngestion(options);
  await writeProspects(prospects);
  return prospects;
}
