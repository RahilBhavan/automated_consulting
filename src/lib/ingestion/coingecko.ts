/**
 * CoinGecko API client — market data for coins rank 500–2000 by market cap.
 * Free tier: no key required; rate limit ~10–30 calls/min.
 */

const BASE = "https://api.coingecko.com/api/v3";

export type CoinGeckoMarketItem = {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  ath_change_percentage: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_24h?: number | null;
};

export type CoinGeckoNormalized = {
  id: string;
  name: string;
  slug: string;
  mcap: number;
  volume: number;
  athChangePct: number | null;
  priceChange7d: number | null;
};

/**
 * Fetch markets page (100 per page). Page 1 = rank 1–100, page 5 = 401–500, etc.
 * For rank 500–2000 we need pages 5–20.
 */
export async function fetchMarketsPage(page: number): Promise<CoinGeckoMarketItem[]> {
  const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`CoinGecko markets ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Fetch rank 500–2000 (pages 5–20). Optionally limit pages for dev.
 */
export async function fetchMarketsRank500To2000(
  maxPages: number = 16
): Promise<CoinGeckoNormalized[]> {
  const all: CoinGeckoNormalized[] = [];
  for (let page = 5; page < 5 + maxPages; page++) {
    const items = await fetchMarketsPage(page);
    if (items.length === 0) break;
    for (const c of items) {
      all.push({
        id: c.id,
        name: c.name,
        slug: c.symbol.toLowerCase(),
        mcap: c.market_cap ?? 0,
        volume: c.total_volume ?? 0,
        athChangePct: c.ath_change_percentage ?? null,
        priceChange7d: c.price_change_percentage_7d_in_currency ?? c.price_change_percentage_24h ?? null,
      });
    }
    await sleep(1200); // avoid rate limit
  }
  return all;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
