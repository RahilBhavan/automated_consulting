/**
 * Deliverable recommendation engine — map pain signals to dashboard deliverables.
 * Rank by relevance (GM/financial analytics), estimated value, build hours.
 */

import type { PainSignal } from "@/types/prospect";
import type { DeliverableRecommendation } from "@/types/prospect";

const DELIVERABLE_MAP: Record<
  string,
  { title: string; relevance: number; valueMin: number; valueMax: number; hours: number }
> = {
  "Multi-chain": {
    title: "Cross-chain treasury reconciliation dashboard",
    relevance: 9,
    valueMin: 3000,
    valueMax: 8000,
    hours: 8,
  },
  RWA: {
    title: "RWA / off-chain asset reconciliation report",
    relevance: 10,
    valueMin: 4000,
    valueMax: 10000,
    hours: 12,
  },
  "TVL decline": {
    title: "Burn rate & runway visibility dashboard",
    relevance: 8,
    valueMin: 2500,
    valueMax: 6000,
    hours: 6,
  },
  "Volume/MCap": {
    title: "Trading desk P&L and volume reporting",
    relevance: 8,
    valueMin: 2000,
    valueMax: 5000,
    hours: 5,
  },
  "ATH drawdown": {
    title: "Treasury pressure & runway model",
    relevance: 7,
    valueMin: 2000,
    valueMax: 5000,
    hours: 6,
  },
  "Lending/CDP": {
    title: "Utilization & liquidation risk dashboard",
    relevance: 9,
    valueMin: 3000,
    valueMax: 7000,
    hours: 8,
  },
  "DEX/AMM": {
    title: "Fee revenue vs IL P&L dashboard",
    relevance: 9,
    valueMin: 2500,
    valueMax: 6000,
    hours: 7,
  },
  "7d price swing": {
    title: "Investor comms one-pager template",
    relevance: 5,
    valueMin: 1500,
    valueMax: 3500,
    hours: 3,
  },
};

/**
 * Build deliverable recommendations from triggered pain signals (positive points only).
 * Sorted by relevance desc, then value desc.
 */
export function getDeliverableRecommendations(
  signals: PainSignal[]
): DeliverableRecommendation[] {
  const seen = new Set<string>();
  const list: DeliverableRecommendation[] = [];

  for (const s of signals) {
    if (s.points <= 0) continue;
    const def = DELIVERABLE_MAP[s.key];
    if (!def || seen.has(s.key)) continue;
    seen.add(s.key);
    list.push({
      deliverableId: s.key,
      title: def.title,
      relevance: def.relevance,
      estimatedValueMin: def.valueMin,
      estimatedValueMax: def.valueMax,
      buildHours: def.hours,
    });
  }

  list.sort((a, b) => b.relevance - a.relevance || b.estimatedValueMax - a.estimatedValueMax);
  return list;
}
