/**
 * Pain signal scoring — 9 signals from PRD rubric; composite 0–10; treasury gate.
 */

import type { PainSignal } from "@/types/prospect";
import type { RawProspect } from "@/types/prospect";

const TREASURY_GATE_TVL = 5_000_000;
const SCORE_MIN = 0;
const SCORE_MAX = 10;

function sig(key: string, points: number, explanation: string): PainSignal {
  return { key, points, explanation };
}

/**
 * Compute all pain signals and raw score (before treasury gate).
 */
export function computePainSignals(r: RawProspect): PainSignal[] {
  const out: PainSignal[] = [];

  if (r.chains.length >= 3) {
    out.push(
      sig(
        "Multi-chain",
        4,
        `Deployed on ${r.chains.length} chains — treasury reconciliation across chains is a common pain point.`
      )
    );
  }

  const cat = (r.category ?? "").toLowerCase();
  if (cat.includes("rwa") || cat.includes("real world")) {
    out.push(
      sig(
        "RWA",
        5,
        "RWA category — off-chain/on-chain asset reconciliation and reporting gaps."
      )
    );
  }

  const tvlChange = r.tvlChange1m ?? 0;
  if (tvlChange <= -20) {
    out.push(
      sig(
        "TVL decline",
        3,
        `TVL down ${Math.round(-tvlChange)}% (30d proxy) — burn rate visibility and investor reporting pressure.`
      )
    );
  }

  const mcap = r.mcap ?? 0;
  const vol = r.volume ?? 0;
  const ratio = mcap > 0 ? (vol / mcap) * 100 : 0;
  if (ratio >= 15) {
    out.push(
      sig(
        "Volume/MCap",
        2,
        `Volume/MCap ${ratio.toFixed(1)}% — active trading desk needs reporting.`
      )
    );
  }

  const ath = r.athChangePct ?? 0;
  if (ath <= -70) {
    out.push(
      sig(
        "ATH drawdown",
        2,
        `ATH drawdown ${Math.round(-ath)}% — treasury pressure and runway modeling.`
      )
    );
  }

  if (cat.includes("lending") || cat.includes("cdp")) {
    out.push(
      sig(
        "Lending/CDP",
        2,
        "Lending/CDP category — utilization rate and liquidation risk reporting gaps."
      )
    );
  }

  if (cat.includes("dex") || cat.includes("amm")) {
    out.push(
      sig(
        "DEX/AMM",
        2,
        "DEX/AMM category — fee revenue vs IL P&L often missing."
      )
    );
  }

  const price7 = r.priceChange7d ?? 0;
  if (Math.abs(price7) >= 25) {
    out.push(
      sig(
        "7d price swing",
        1,
        `7-day price swing ${price7 >= 0 ? "+" : ""}${price7.toFixed(1)}% — investor comms burden.`
      )
    );
  }

  const commits = r.githubActivity?.commitCount30d ?? -1;
  if (commits === 0) {
    out.push(
      sig(
        "Dead Repo",
        -5,
        "No commits in last 30 days — abandoned project, flight risk."
      )
    );
  }

  return out;
}

/**
 * Raw score (sum of signal points, clamped to 0–10).
 */
export function computeRawScore(signals: PainSignal[]): number {
  const sum = signals.reduce((a, s) => a + s.points, 0);
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(sum * 10) / 10));
}

/**
 * Apply treasury gate: if TVL < $5M and not VC-backed, cap score at 4.
 */
export function applyTreasuryGate(
  rawScore: number,
  tvl: number,
  vcBacked?: boolean
): { score: number; treasuryGated: boolean } {
  if (vcBacked) return { score: rawScore, treasuryGated: false };
  if (tvl < TREASURY_GATE_TVL) {
    return { score: Math.min(rawScore, 4), treasuryGated: true };
  }
  return { score: rawScore, treasuryGated: false };
}
