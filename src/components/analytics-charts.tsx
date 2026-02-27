"use client";

import { useEffect, useState } from "react";
import type { Prospect } from "@/types/prospect";
import type { PipelineEntry } from "@/types/pipeline";

const SCORE_BINS = [
  { label: "0–2", min: 0, max: 2 },
  { label: "3–4", min: 3, max: 4 },
  { label: "5–6", min: 5, max: 6 },
  { label: "7+", min: 7, max: 10 },
];

export function AnalyticsCharts() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/prospects").then((r) => r.json()),
      fetch("/api/pipeline").then((r) => r.json()),
    ])
      .then(([p, pl]) => {
        setProspects(Array.isArray(p) ? p : []);
        setPipeline(Array.isArray(pl) ? pl : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500">
        Loading…
      </div>
    );
  }

  const byCategory = prospects.reduce<Record<string, number>>((acc, p) => {
    const c = p.category || "Uncategorized";
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 12);

  const scoreDistribution = SCORE_BINS.map((bin) => ({
    ...bin,
    count: prospects.filter((p) => p.painScore >= bin.min && p.painScore <= bin.max).length,
  }));
  const maxScoreCount = Math.max(1, ...scoreDistribution.map((d) => d.count));

  const contacted = pipeline.filter((e) =>
    ["HookSent", "Replied", "DemoBuilt", "Converted"].includes(e.status)
  ).length;
  const responded = pipeline.filter((e) =>
    ["Replied", "DemoBuilt", "Converted"].includes(e.status)
  ).length;
  const converted = pipeline.filter((e) => e.status === "Converted").length;

  const pipelineValue = pipeline
    .filter((e) => ["HookBuilding", "HookSent", "Replied", "DemoBuilt"].includes(e.status))
    .reduce((sum, e) => sum + (e.estimatedValue ?? 0), 0);
  const totalRevenue = pipeline
    .filter((e) => e.status === "Converted")
    .reduce((sum, e) => sum + (e.revenue ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Prospects</p>
          <p className="text-2xl font-semibold">{prospects.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Pipeline value</p>
          <p className="text-2xl font-semibold">${pipelineValue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Total revenue</p>
          <p className="text-2xl font-semibold">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-sm text-neutral-500">Converted</p>
          <p className="text-2xl font-semibold">{converted}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-medium">Prospects by category</h2>
        <div className="space-y-2">
          {categoryEntries.map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="w-32 shrink-0 truncate text-sm">{cat}</span>
              <div className="h-6 flex-1 max-w-md overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full bg-blue-500 dark:bg-blue-600"
                  style={{
                    width: `${(count / Math.max(1, categoryEntries[0]?.[1] ?? 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 text-right text-sm tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-medium">Pain score distribution</h2>
        <div className="flex gap-4">
          {scoreDistribution.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center">
              <div className="flex h-32 w-full flex-col justify-end">
                <div
                  className="w-full rounded-t bg-blue-500 dark:bg-blue-600"
                  style={{
                    height: `${(d.count / maxScoreCount) * 100}%`,
                    minHeight: d.count > 0 ? "4px" : "0",
                  }}
                />
              </div>
              <p className="mt-2 text-sm font-medium">{d.label}</p>
              <p className="text-xs text-neutral-500">{d.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-medium">Outreach funnel</h2>
        <div className="flex flex-wrap gap-6">
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="text-sm text-neutral-500">Contacted (Hook Sent+)</p>
            <p className="text-xl font-semibold">{contacted}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="text-sm text-neutral-500">Responded</p>
            <p className="text-xl font-semibold">{responded}</p>
          </div>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
            <p className="text-sm text-neutral-500">Converted</p>
            <p className="text-xl font-semibold">{converted}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
