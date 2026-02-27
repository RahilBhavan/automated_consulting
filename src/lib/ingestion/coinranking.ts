/**
 * Coinranking API client — alternative source for coins rank 200–2000 by market cap.
 * Requires COINRANKING_API_KEY (free tier: 100 items/request). Used when COIN_SOURCE=coinranking.
 * Returns same shape as CoinGeckoNormalized so merge can use it (match by slug; no gecko_id).
 */

import type { CoinGeckoNormalized } from "./coingecko";

const BASE = "https://api.coinranking.com/v2";

type CoinrankingCoin = {
  uuid: string;
  symbol: string;
  name: string;
  marketCap: string | null;
  "24hVolume": string | null;
  price: string;
  change: string | null;
  allTimeHigh?: { price: string | null; timestamp: number | null } | null;
};

type CoinrankingResponse = {
  status: string;
  data?: {
    coins: CoinrankingCoin[];
  };
  pagination?: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

function getApiKey(): string {
  const key = process.env.COINRANKING_API_KEY;
  if (!key) throw new Error("COINRANKING_API_KEY is required when using Coinranking as coin source.");
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch one page of coins (market cap desc). Free tier: max 100 per request.
 * Use timePeriod=7d so "change" is 7d percentage.
 */
async function fetchCoinsPage(offset: number, limit: number): Promise<CoinrankingCoin[]> {
  const url = new URL(`${BASE}/coins`);
  url.searchParams.set("orderBy", "marketCap");
  url.searchParams.set("orderDirection", "desc");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("timePeriod", "7d");

  const res = await fetch(url.toString(), {
    headers: { "x-access-token": getApiKey() },
  });

  if (!res.ok) throw new Error(`Coinranking coins ${res.status}: ${await res.text()}`);

  const json = (await res.json()) as CoinrankingResponse;
  if (json.status !== "success" || !json.data?.coins) {
    throw new Error("Coinranking invalid response");
  }

  return json.data.coins;
}

/**
 * Fetch coins with rank 200–2000 (inclusive). Coinranking returns by market cap desc;
 * offset 0 = rank 1, offset 199 = rank 200. We need 1801 coins (200–2000).
 * Free tier: 100 per request → 18 requests (offset 199, 299, … 1899).
 */
export async function fetchMarketsRank200To2000(): Promise<CoinGeckoNormalized[]> {
  const limit = 100;
  const startOffset = 199; // rank 200
  const endRank = 2000;
  const totalToFetch = endRank - 200 + 1; // 1801
  const numPages = Math.ceil(totalToFetch / limit); // 19 pages; we'll do 18 (200–1999) then one more for 2000

  await sleep(500); // avoid burst

  const all: CoinGeckoNormalized[] = [];
  for (let i = 0; i < numPages; i++) {
    const offset = startOffset + i * limit;
    const coins = await fetchCoinsPage(offset, limit);
    if (coins.length === 0) break;

    for (let j = 0; j < coins.length; j++) {
      const c = coins[j];
      const rank = offset + j + 1;
      if (rank > endRank) break;

      const mcap = c.marketCap != null ? parseFloat(c.marketCap) : 0;
      const volume = c["24hVolume"] != null ? parseFloat(c["24hVolume"]) : 0;
      const price = parseFloat(c.price);
      const athPrice = c.allTimeHigh?.price != null ? parseFloat(c.allTimeHigh.price) : null;
      const athChangePct =
        athPrice != null && athPrice > 0 ? ((price - athPrice) / athPrice) * 100 : null;
      const priceChange7d = c.change != null ? parseFloat(c.change) : null;

      all.push({
        id: c.uuid,
        name: c.name,
        slug: c.symbol.toLowerCase(),
        mcap,
        volume,
        athChangePct,
        priceChange7d,
      });
    }

    if (coins.length < limit) break;
    await sleep(800); // rate limit
  }

  return all;
}
