/**
 * Unit tests for pain scoring and treasury gate.
 */

import { describe, it, expect } from "vitest";
import {
  computePainSignals,
  computeRawScore,
  applyTreasuryGate,
} from "./score";
import type { RawProspect } from "@/types/prospect";

function baseRaw(overrides: Partial<RawProspect> = {}): RawProspect {
  return {
    id: "test-1",
    name: "Test",
    slug: "test",
    category: "DEX",
    chains: ["ethereum"],
    tvl: 10_000_000,
    tvlChange1m: null,
    mcap: null,
    volume: null,
    athChangePct: null,
    priceChange7d: null,
    githubActivity: null,
    sources: ["defillama"],
    ...overrides,
  };
}

describe("computePainSignals", () => {
  it("adds Multi-chain signal when chains.length >= 3", () => {
    const r = baseRaw({ chains: ["ethereum", "arbitrum", "base"] });
    const signals = computePainSignals(r);
    const multi = signals.find((s) => s.key === "Multi-chain");
    expect(multi).toBeDefined();
    expect(multi?.points).toBe(4);
  });

  it("does not add Multi-chain when chains < 3", () => {
    const r = baseRaw({ chains: ["ethereum"] });
    const signals = computePainSignals(r);
    expect(signals.some((s) => s.key === "Multi-chain")).toBe(false);
  });

  it("adds RWA signal when category contains rwa", () => {
    const r = baseRaw({ category: "RWA" });
    const signals = computePainSignals(r);
    const rwa = signals.find((s) => s.key === "RWA");
    expect(rwa).toBeDefined();
    expect(rwa?.points).toBe(5);
  });

  it("adds TVL decline when tvlChange1m <= -20", () => {
    const r = baseRaw({ tvlChange1m: -25 });
    const signals = computePainSignals(r);
    const tvl = signals.find((s) => s.key === "TVL decline");
    expect(tvl).toBeDefined();
    expect(tvl?.points).toBe(3);
  });

  it("adds Dead Repo when commitCount30d === 0", () => {
    const r = baseRaw({
      githubActivity: {
        lastCommitDate: null,
        commitCount30d: 0,
        contributorCount: 0,
        repoUrl: null,
      },
    });
    const signals = computePainSignals(r);
    const dead = signals.find((s) => s.key === "Dead Repo");
    expect(dead).toBeDefined();
    expect(dead?.points).toBe(-5);
  });

  it("returns empty array when no signals match", () => {
    const r = baseRaw({
      chains: ["ethereum"],
      category: "Other",
      tvlChange1m: 0,
      githubActivity: null,
    });
    const signals = computePainSignals(r);
    expect(signals).toEqual([]);
  });
});

describe("computeRawScore", () => {
  it("sums signal points and clamps to 0-10", () => {
    const signals = [
      { key: "a", points: 4, explanation: "" },
      { key: "b", points: 3, explanation: "" },
    ];
    expect(computeRawScore(signals)).toBe(7);
  });

  it("clamps to 10 when sum exceeds 10", () => {
    const signals = [
      { key: "a", points: 5, explanation: "" },
      { key: "b", points: 6, explanation: "" },
    ];
    expect(computeRawScore(signals)).toBe(10);
  });

  it("clamps to 0 when sum is negative", () => {
    const signals = [{ key: "dead", points: -5, explanation: "" }];
    expect(computeRawScore(signals)).toBe(0);
  });

  it("returns 0 for empty signals", () => {
    expect(computeRawScore([])).toBe(0);
  });
});

describe("applyTreasuryGate", () => {
  const TVL_GATE = 5_000_000;

  it("returns raw score when TVL >= gate", () => {
    const result = applyTreasuryGate(7, TVL_GATE, false);
    expect(result.score).toBe(7);
    expect(result.treasuryGated).toBe(false);
  });

  it("caps at 4 when TVL < gate and not VC-backed", () => {
    const result = applyTreasuryGate(8, 1_000_000, false);
    expect(result.score).toBe(4);
    expect(result.treasuryGated).toBe(true);
  });

  it("leaves score when TVL < gate but VC-backed", () => {
    const result = applyTreasuryGate(8, 1_000_000, true);
    expect(result.score).toBe(8);
    expect(result.treasuryGated).toBe(false);
  });

  it("caps low TVL at 4 when raw is 2", () => {
    const result = applyTreasuryGate(2, 1_000_000, false);
    expect(result.score).toBe(2);
    expect(result.treasuryGated).toBe(true);
  });
});
