/**
 * Prospect types for CryptoProspect — discovery and pain-signal scoring.
 */

export type ProspectSource = "coingecko" | "defillama" | "github";

export type PainSignal = {
  key: string;
  points: number;
  explanation: string;
};

export type DeliverableRecommendation = {
  deliverableId: string;
  title: string;
  relevance: number;
  estimatedValueMin: number;
  estimatedValueMax: number;
  buildHours: number;
};

export type GithubActivity = {
  lastCommitDate: string | null;
  commitCount30d: number;
  contributorCount: number;
  repoUrl: string | null;
};

export type Prospect = {
  id: string;
  name: string;
  slug: string;
  category: string;
  chains: string[];
  tvl: number;
  tvlChange1m: number | null;
  mcap: number | null;
  volume: number | null;
  volumeMcapRatio: number | null;
  athChangePct: number | null;
  priceChange7d: number | null;
  githubActivity: GithubActivity | null;
  painScore: number;
  painScoreRaw: number;
  painSignals: PainSignal[];
  treasuryGated: boolean;
  scoreJumped?: boolean;
  deliverableRecommendations: DeliverableRecommendation[];
  sources: ProspectSource[];
  lastUpdated: string;
  /** Optional links for UI */
  urlDefillama?: string;
  urlCoingecko?: string;
  urlTwitter?: string;
  urlDiscord?: string;
};

/** Raw prospect shape before scoring (merge output). */
export type RawProspect = {
  id: string;
  name: string;
  slug: string;
  category: string;
  chains: string[];
  tvl: number;
  tvlChange1m: number | null;
  mcap: number | null;
  volume: number | null;
  athChangePct: number | null;
  priceChange7d: number | null;
  githubActivity: GithubActivity | null;
  sources: ProspectSource[];
  /** Only set when known (e.g. Tier 1/2 VC-backed). */
  vcBacked?: boolean;
  urlDefillama?: string;
  urlCoingecko?: string;
  urlTwitter?: string;
  urlDiscord?: string;
  /** Set by merge from DeFiLlama github[]; used to fetch GitHub only for top prospects. */
  githubSlug?: string;
};
