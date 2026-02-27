/**
 * Unit tests for Coinranking client (mocked fetch).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchMarketsRank200To2000 } from "./coinranking";

const COINRANKING_API_KEY = "COINRANKING_API_KEY";

function coinResponse(coins: unknown[]) {
  return {
    status: "success",
    data: { coins },
    pagination: { hasNextPage: coins.length >= 100, nextCursor: null },
  };
}

describe("fetchMarketsRank200To2000", () => {
  const originalEnv = process.env[COINRANKING_API_KEY];

  beforeEach(() => {
    process.env[COINRANKING_API_KEY] = "test-key";
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        callCount++;
        // First page (offset 199): return one coin. Second page: empty to stop loop.
        const coins =
          callCount === 1
            ? [
                {
                  uuid: "cr-uuid-1",
                  symbol: "MID",
                  name: "Mid Cap Coin",
                  marketCap: "100000000",
                  "24hVolume": "5000000",
                  price: "1.5",
                  change: "-2.5",
                  allTimeHigh: { price: "2.0", timestamp: 1600000000 },
                },
              ]
            : [];
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(coinResponse(coins))),
          json: () => Promise.resolve(coinResponse(coins)),
          headers: new Headers(),
        } as Response);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalEnv !== undefined) process.env[COINRANKING_API_KEY] = originalEnv;
    else delete process.env[COINRANKING_API_KEY];
  });

  it("returns CoinGeckoNormalized-shaped list with slug and ATH/7d derived", async () => {
    const result = await fetchMarketsRank200To2000();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "cr-uuid-1",
      name: "Mid Cap Coin",
      slug: "mid",
      mcap: 100_000_000,
      volume: 5_000_000,
      athChangePct: -25, // (1.5 - 2) / 2 * 100
      priceChange7d: -2.5,
    });
  });

  it("throws when COINRANKING_API_KEY is not set", async () => {
    delete process.env[COINRANKING_API_KEY];

    await expect(fetchMarketsRank200To2000()).rejects.toThrow(
      /COINRANKING_API_KEY is required/
    );
  });
});
