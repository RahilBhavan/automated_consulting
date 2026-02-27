/**
 * API test: GET /api/prospects returns 200 and array (mocked db).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  readProspects: vi.fn(),
}));

const { readProspects } = await import("@/lib/db");

describe("GET /api/prospects", () => {
  beforeEach(() => {
    vi.mocked(readProspects).mockReset();
  });

  it("returns 200 and empty array when no prospects", async () => {
    vi.mocked(readProspects).mockResolvedValue([]);
    const req = new Request("http://localhost/api/prospects");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(0);
  });

  it("returns 200 and prospects array when db has data", async () => {
    const mockProspects = [
      {
        id: "dl-test",
        name: "Test",
        slug: "test",
        category: "DEX",
        chains: ["ethereum"],
        tvl: 10_000_000,
        painScore: 5,
        painScoreRaw: 5,
        painSignals: [],
        treasuryGated: false,
        deliverableRecommendations: [],
        sources: ["defillama"],
        lastUpdated: new Date().toISOString(),
      },
    ];
    vi.mocked(readProspects).mockResolvedValue(mockProspects as never);
    const req = new Request("http://localhost/api/prospects");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    expect(json).toHaveLength(1);
    expect(json[0].id).toBe("dl-test");
  });

  it("filters by minScore when query param present", async () => {
    vi.mocked(readProspects).mockResolvedValue([
      { id: "1", painScore: 3, category: "", chains: [], slug: "1", name: "A", tvl: 0, painScoreRaw: 3, painSignals: [], treasuryGated: false, deliverableRecommendations: [], sources: [], lastUpdated: "" },
      { id: "2", painScore: 7, category: "", chains: [], slug: "2", name: "B", tvl: 0, painScoreRaw: 7, painSignals: [], treasuryGated: false, deliverableRecommendations: [], sources: [], lastUpdated: "" },
    ] as never);
    const req = new Request("http://localhost/api/prospects?minScore=5");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].painScore).toBe(7);
  });
});
