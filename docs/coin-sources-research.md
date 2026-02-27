# Coin data sources for rank 200–2000 (market cap)

This document compares ways to get **mid-cap coin data** (market cap rank 200–2000) for enriching DeFiLlama prospects in CryptoProspect. The pipeline matches protocols by `gecko_id` or name/slug and uses coin data for mcap, volume, ATH drawdown, and 7d price change.

## Requirements

- **Output shape:** `id`, `name`, `slug`, `mcap`, `volume`, `athChangePct`, `priceChange7d` (same as `CoinGeckoNormalized`).
- **Rank range:** 200–2000 (inclusive) by market cap.
- **Matching:** DeFiLlama has `gecko_id` (CoinGecko id) when available; otherwise merge uses slug/name. An alternative source should at least support slug/symbol matching.

---

## 1. CoinGecko (current)

| Aspect | Detail |
|--------|--------|
| **Endpoint** | `GET /api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page={n}` |
| **Rank 200–2000** | Pages 2–20 (page 2 = ranks 101–200, pages 3–20 = 201–2000). Filter by `market_cap_rank` to get exactly 200–2000. |
| **Auth** | Optional. No key = free tier (~10–30 req/min). `COINGECKO_API_KEY` = demo/pro; `COINGECKO_PRO=1` = pro base URL. |
| **Rate limit** | Free: strict; Pro: higher. Use 2–2.5s between pages (free) or ~1.2s (with key). |
| **Pros** | No key for dev; DeFiLlama already exposes `gecko_id` → direct match; well documented. |
| **Cons** | Rate limits on free tier; 429s under burst. |

**Conclusion:** Keep as default. Extend from rank 500–2000 to 200–2000 by using pages 2–20 and filtering `market_cap_rank >= 200 && <= 2000`.

---

## 2. Coinranking

| Aspect | Detail |
|--------|--------|
| **Endpoint** | `GET https://api.coinranking.com/v2/coins?orderBy=marketCap&orderDirection=desc&limit=100&offset={n}` |
| **Auth** | Required. Header `x-access-token: <COINRANKING_API_KEY>`. Free account at [developers.coinranking.com](https://developers.coinranking.com). |
| **Rank 200–2000** | Free tier max 100 per request. Use `offset=199` then 299, 399, … 1999 (18 requests). Or cursor-based pagination with `nextCursor`. |
| **Response** | `uuid`, `symbol`, `name`, `marketCap`, `24hVolume`, `change` (for `timePeriod=7d`), `allTimeHigh.price`. |
| **Mapping** | No CoinGecko id. Merge by `slug` = `symbol.toLowerCase()`. ATH change = `(price - allTimeHigh.price) / allTimeHigh.price * 100`. |
| **Rate limit** | Free: 100 items/request; paid: up to 5000/request. |
| **Pros** | Alternative when CoinGecko is down or rate-limited; 7d change and ATH in one API. |
| **Cons** | API key required; slug-only matching (no gecko_id); symbol collisions possible. |

**Conclusion:** Good alternative. Implement as optional source when `COIN_SOURCE=coinranking` and `COINRANKING_API_KEY` are set.

---

## 3. CryptoCompare

| Aspect | Detail |
|--------|--------|
| **Endpoint** | `GET /data/top/mktcapfull` returns top 100 by mcap; no built-in “rank 200–2000” slice. |
| **List** | `GET /data/all/coinlist` has metadata but not market cap rank. |
| **Rank range** | Would require multiple calls or a different endpoint; no direct “page by rank” like CoinGecko/Coinranking. |
| **Pros** | Free tier; some historical data. |
| **Cons** | No straightforward pagination by market cap rank 200–2000; not a drop-in replacement. |

**Conclusion:** Not used for this pipeline without extra aggregation logic.

---

## 4. CoinMarketCap

| Aspect | Detail |
|--------|--------|
| **Endpoint** | Listings endpoint with start/limit; requires API key. |
| **Pricing** | Free tier very limited (e.g. 10k credits/month); listing endpoints cost credits. |
| **Pros** | Widely used; good coverage. |
| **Cons** | Credit system and cost; not ideal for free/cheap automation. |

**Conclusion:** Skip for this project unless we add a paid tier later.

---

## 5. Moralis / other aggregators

- Often proxy to CoinGecko or similar; add latency and another point of failure.
- Not evaluated in detail; can be revisited if we need a single “unified” API.

---

## Recommendation

1. **Default:** CoinGecko, rank **200–2000** (pages 2–20, filter by `market_cap_rank`).
2. **Alternative:** Coinranking when `COIN_SOURCE=coinranking` and `COINRANKING_API_KEY` set; same rank range; merge by slug only.
3. **Deliverables implemented:**
   - This research doc (`docs/coin-sources-research.md`).
   - `src/lib/ingestion/coinranking.ts`: fetch rank 200–2000, return `CoinGeckoNormalized`-shaped list.
   - `src/lib/ingestion/coingecko.ts`: add `fetchMarketsRank200To2000()`.
   - `src/lib/ingestion/run.ts`: choose coin source via `COIN_SOURCE` (default `coingecko`).
   - README and `.env.example`: document `COIN_SOURCE`, `COINRANKING_API_KEY`, and rank 200–2000.

---

## References

- [CoinGecko API – coins/markets](https://docs.coingecko.com/reference/coins-markets)
- [Coinranking API – List of coins](https://developers.coinranking.com/api/documentation/coins/coins)
- [CryptoCompare API](https://min-api.cryptocompare.com/documentation)
