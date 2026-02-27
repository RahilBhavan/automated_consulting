/**
 * CoinGecko API client — market data for coins rank 200–2000 (or 500–2000) by market cap.
 * Free tier: no key required; rate limit ~10–30 calls/min.
 * Demo API key: set COINGECKO_API_KEY → uses api.coingecko.com (free base).
 * Pro API key: set COINGECKO_API_KEY and COINGECKO_PRO=1 → uses pro-api.coingecko.com.
 */

const BASE_FREE = "https://api.coingecko.com/api/v3";
const BASE_PRO = "https://pro-api.coingecko.com/api/v3";

function getBase(): string {
  // Pro URL only when explicitly requested; Demo keys must use api.coingecko.com
  const isPro = process.env.COINGECKO_PRO === "1" || process.env.COINGECKO_PRO === "true";
  return isPro ? BASE_PRO : BASE_FREE;
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) return {};
  // Demo keys must use api.coingecko.com and x-cg-demo-api-key; Pro keys use pro-api and x-cg-pro-api-key
  const base = getBase();
  const isPro = base === BASE_PRO;
  return isPro ? { "x-cg-pro-api-key": key } : { "x-cg-demo-api-key": key };
}

/**
 * Fetch markets page (100 per page). Page 1 = rank 1–100, page 2 = 101–200, etc.
 * For rank 200–2000 use pages 2–20 and filter by market_cap_rank.
 * Retries once on 429 after Retry-After (default 60s).
 */
export async function fetchMarketsPage(page: number): Promise<CoinGeckoMarketItem[]> {
  const path = `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}`;
  const headers = buildHeaders();

  const doFetch = async (b: string): Promise<Response> => fetch(`${b}${path}`, { headers });

  let base = getBase();
  let res = await doFetch(base);

  if (res.status === 429) {
    const retryAfterSec = parseInt(res.headers.get("Retry-After") ?? "", 10) || 60;
    await sleep(retryAfterSec * 1000);
    res = await doFetch(base);
  }

  if (res.status === 400 && process.env.COINGECKO_API_KEY) {
    const body = await res.json().catch(() => ({})) as { error_code?: number | string; status?: { error_message?: string } };
    const code = body?.error_code != null ? Number(body.error_code) : undefined;
    const altBase = base === BASE_PRO ? BASE_FREE : BASE_PRO;
    // 10010 / 10011: Demo key used on Pro URL, or Pro key used on Free URL — retry with other base
    if (code === 10010 || code === 10011) {
      res = await doFetch(altBase);
      // Fall through to !res.ok check; if retry succeeded we return res.json() below
    } else {
      throw new Error(`CoinGecko markets 400: ${JSON.stringify(body)}`);
    }
  }

  if (!res.ok) throw new Error(`CoinGecko markets ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Fetch rank 500–2000 (pages 5–20). Optionally limit pages for dev.
 * Uses 2s initial delay and 2.5s between pages (free tier); 1.2s between pages when API key set.
 */
export async function fetchMarketsRank500To2000(
  maxPages: number = 16
): Promise<CoinGeckoNormalized[]> {
  return fetchMarketsRankRange(5, 5 + maxPages, 500, 2000);
}

/**
 * Fetch rank 200–2000 (pages 2–20). Page 2 = 101–200, pages 3–20 = 201–2000.
 * Filters by market_cap_rank so result is exactly 200–2000.
 */
export async function fetchMarketsRank200To2000(
  maxPages: number = 19
): Promise<CoinGeckoNormalized[]> {
  return fetchMarketsRankRange(2, 2 + maxPages, 200, 2000);
}

/**
 * Internal: fetch pages startPage..startPage+maxPages-1 and filter by market_cap_rank in [rankMin, rankMax].
 */
async function fetchMarketsRankRange(
  startPage: number,
  endPageExclusive: number,
  rankMin: number,
  rankMax: number
): Promise<CoinGeckoNormalized[]> {
  const hasKey = Boolean(process.env.COINGECKO_API_KEY);
  const delayBetweenPages = hasKey ? 1200 : 2500;

  await sleep(2000); // avoid bursting first request on free tier

  const all: CoinGeckoNormalized[] = [];
  for (let page = startPage; page < endPageExclusive; page++) {
    const items = await fetchMarketsPage(page);
    if (items.length === 0) break;
    for (const c of items) {
      const rank = c.market_cap_rank ?? 0;
      if (rank < rankMin) continue;
      if (rank > rankMax) continue;
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
    await sleep(delayBetweenPages);
  }
  return all;
}
