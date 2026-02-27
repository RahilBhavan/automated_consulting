/**
 * Full ingestion run: fetch CoinGecko + DeFiLlama, merge, score (with top-10% GitHub), delta, write.
 * Designed for standalone script (e.g. GitHub Actions); not for Vercel serverless (timeout).
 */

import type { Prospect } from "@/types/prospect";
import type { RawProspect } from "@/types/prospect";
import { fetchMarketsRank500To2000 } from "./coingecko";
import { fetchProtocols } from "./defillama";
import { merge, attachGitHubForTopIds } from "./merge";
import { computePainSignals, computeRawScore, applyTreasuryGate } from "@/lib/scoring/score";
import { getDeliverableRecommendations } from "@/lib/scoring/deliverables";
import { readProspects, writeProspects } from "@/lib/db";

const SCORE_JUMP_THRESHOLD = 2;
/** Only fetch GitHub for top N% by preliminary score to avoid rate limits. */
const GITHUB_TOP_PERCENT = 0.1;

export type IngestOptions = {
  /** Limit CoinGecko pages (100 coins per page) to avoid long runs. */
  coingeckoMaxPages?: number;
  /** Max GitHub requests (for top 10% only). */
  maxGitHubRequests?: number;
};

/**
 * Run full pipeline and return new prospects (does not write).
 * Applies treasury gate and score threshold before calling GitHub; only top 10% get GitHub data.
 */
export async function runIngestion(options: IngestOptions = {}): Promise<Prospect[]> {
  const { coingeckoMaxPages = 6, maxGitHubRequests = 30 } = options;

  const [defiLlama, coingecko] = await Promise.all([
    fetchProtocols(),
    fetchMarketsRank500To2000(coingeckoMaxPages),
  ]);

  const rawList = await merge(defiLlama, coingecko, { attachGitHub: false });

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
