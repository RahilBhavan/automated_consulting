/**
 * Unit tests for merge (DeFiLlama + CoinGecko → RawProspect[]).
 * Uses attachGitHub: false to avoid network.
 */

import { describe, it, expect } from "vitest";
import { merge } from "./merge";
import type { DefiLlamaNormalized } from "./defillama";
import type { CoinGeckoNormalized } from "./coingecko";

function dl(overrides: Partial<DefiLlamaNormalized> = {}): DefiLlamaNormalized {
  return {
    id: "dl-1",
    name: "Protocol One",
    slug: "protocol-one",
    category: "DEX",
    chains: ["ethereum", "arbitrum"],
    tvl: 50_000_000,
    tvlChange1m: null,
    geckoId: null,
    ...overrides,
  };
}

function cg(overrides: Partial<CoinGeckoNormalized> = {}): CoinGeckoNormalized {
  return {
    id: "coingecko-1",
    name: "Protocol One",
    slug: "protocol-one",
    mcap: 100_000_000,
    volume: 20_000_000,
    athChangePct: -50,
    priceChange7d: 5,
    ...overrides,
  };
}

describe("merge", () => {
  it("produces one RawProspect per DeFiLlama protocol with id dl-{slug}", async () => {
    const defiLlama = [dl({ slug: "foo-protocol" })];
    const coingecko: CoinGeckoNormalized[] = [];
    const result = await merge(defiLlama, coingecko, { attachGitHub: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dl-foo-protocol");
    expect(result[0].name).toBe("Protocol One");
    expect(result[0].sources).toContain("defillama");
    expect(result[0].sources).not.toContain("coingecko");
  });

  it("merges CoinGecko when geckoId matches", async () => {
    const defiLlama = [dl({ slug: "bar", geckoId: "coingecko-bar" })];
    const coingecko = [cg({ id: "coingecko-bar", mcap: 5_000_000, volume: 1_000_000 })];
    const result = await merge(defiLlama, coingecko, { attachGitHub: false });
    expect(result).toHaveLength(1);
    expect(result[0].mcap).toBe(5_000_000);
    expect(result[0].volume).toBe(1_000_000);
    expect(result[0].sources).toContain("coingecko");
  });

  it("sets githubSlug when DeFiLlama has github[]", async () => {
    const defiLlama = [dl({ slug: "baz", github: ["org/repo"] })];
    const coingecko: CoinGeckoNormalized[] = [];
    const result = await merge(defiLlama, coingecko, { attachGitHub: false });
    expect(result[0].githubSlug).toBe("org/repo");
  });

  it("does not set githubSlug when DeFiLlama has no github", async () => {
    const defiLlama = [dl({ slug: "qux" })];
    const coingecko: CoinGeckoNormalized[] = [];
    const result = await merge(defiLlama, coingecko, { attachGitHub: false });
    expect(result[0].githubSlug).toBeUndefined();
  });

  it("produces multiple prospects for multiple DeFiLlama protocols", async () => {
    const defiLlama = [
      dl({ slug: "one" }),
      dl({ slug: "two", name: "Two" }),
    ];
    const coingecko: CoinGeckoNormalized[] = [];
    const result = await merge(defiLlama, coingecko, { attachGitHub: false });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("dl-one");
    expect(result[1].id).toBe("dl-two");
  });
});
