/**
 * DeFiLlama API client — protocols with TVL $10M–$100M.
 * No auth required. Base: https://api.llama.fi
 */

const BASE = "https://api.llama.fi";

export type DefiLlamaProtocol = {
  id: string;
  name: string;
  slug: string;
  category: string;
  chains: string[];
  tvl: number;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
  mcap?: number | null;
  gecko_id?: string | null;
  url?: string;
  twitter?: string;
  github?: string[];
};

export type DefiLlamaNormalized = {
  id: string;
  name: string;
  slug: string;
  category: string;
  chains: string[];
  tvl: number;
  tvlChange1m: number | null;
  urlDefillama?: string;
  urlCoingecko?: string;
  urlTwitter?: string;
  urlDiscord?: string;
  geckoId: string | null;
  github?: string[];
};

const TVL_MIN = 10_000_000;
const TVL_MAX = 100_000_000;

/**
 * Fetch all protocols and filter by TVL band.
 * DeFiLlama returns change_7d; we use it as 30d proxy for "TVL decline" signal.
 */
export async function fetchProtocols(): Promise<DefiLlamaNormalized[]> {
  const res = await fetch(`${BASE}/protocols`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`DeFiLlama protocols ${res.status}: ${await res.text()}`);
  const raw = (await res.json()) as DefiLlamaProtocol[];
  const list: DefiLlamaNormalized[] = [];
  for (const p of raw) {
    const tvl = p.tvl ?? 0;
    if (tvl < TVL_MIN || tvl > TVL_MAX) continue;
    const chains = Array.isArray(p.chains) ? p.chains : [];
    list.push({
      id: p.id,
      name: p.name,
      slug: p.slug ?? p.name.toLowerCase().replace(/\s+/g, "-"),
      category: p.category ?? "Uncategorized",
      chains,
      tvl,
      tvlChange1m: p.change_7d ?? null,
      urlDefillama: p.url ? `https://defillama.com/protocol/${p.slug}` : undefined,
      urlCoingecko: p.gecko_id ? `https://www.coingecko.com/en/coins/${p.gecko_id}` : undefined,
      urlTwitter: p.twitter ? `https://twitter.com/${p.twitter}` : undefined,
      geckoId: p.gecko_id ?? null,
      github: p.github,
    });
  }
  return list;
}
