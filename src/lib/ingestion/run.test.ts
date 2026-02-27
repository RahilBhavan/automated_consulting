/**
 * Unit tests for run ingestion: getCoinSource and config validation.
 */

import { describe, it, expect, afterEach } from "vitest";
import { getCoinSource, runIngestion } from "./run";

const COIN_SOURCE = "COIN_SOURCE";
const COINRANKING_API_KEY = "COINRANKING_API_KEY";

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

describe("getCoinSource", () => {
  afterEach(() => {
    setEnv(COIN_SOURCE, undefined);
  });

  it("returns coingecko when COIN_SOURCE is unset", () => {
    setEnv(COIN_SOURCE, undefined);
    expect(getCoinSource()).toBe("coingecko");
  });

  it("returns coingecko when COIN_SOURCE is coingecko", () => {
    setEnv(COIN_SOURCE, "coingecko");
    expect(getCoinSource()).toBe("coingecko");
  });

  it("returns coinranking when COIN_SOURCE is coinranking", () => {
    setEnv(COIN_SOURCE, "coinranking");
    expect(getCoinSource()).toBe("coinranking");
  });

  it("is case-insensitive and returns coinranking", () => {
    setEnv(COIN_SOURCE, "CoinRanking");
    expect(getCoinSource()).toBe("coinranking");
  });
});

describe("runIngestion", () => {
  afterEach(() => {
    setEnv(COIN_SOURCE, undefined);
    setEnv(COINRANKING_API_KEY, undefined);
  });

  it("throws when COIN_SOURCE=coinranking and COINRANKING_API_KEY is missing", async () => {
    setEnv(COIN_SOURCE, "coinranking");
    setEnv(COINRANKING_API_KEY, undefined);

    await expect(runIngestion()).rejects.toThrow(
      /COIN_SOURCE=coinranking requires COINRANKING_API_KEY/
    );
  });

  it("throws when COIN_SOURCE=coinranking and COINRANKING_API_KEY is empty", async () => {
    setEnv(COIN_SOURCE, "coinranking");
    setEnv(COINRANKING_API_KEY, "");

    await expect(runIngestion()).rejects.toThrow(
      /COIN_SOURCE=coinranking requires COINRANKING_API_KEY/
    );
  });
});
