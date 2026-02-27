"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Prospect } from "@/types/prospect";
import type { PipelineEntry } from "@/types/pipeline";

type SortKey = "painScore" | "tvl" | "mcap" | "category" | "name";

export function ProspectTable() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("painScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const pipelineByProspect = new Map(pipeline.map((e) => [e.prospectId, e]));

  const sorted = [...prospects].sort((a, b) => {
    let va: number | string = 0;
    let vb: number | string = 0;
    switch (sortKey) {
      case "painScore":
        va = a.painScore;
        vb = b.painScore;
        break;
      case "tvl":
        va = a.tvl;
        vb = b.tvl;
        break;
      case "mcap":
        va = a.mcap ?? 0;
        vb = b.mcap ?? 0;
        break;
      case "category":
        va = a.category ?? "";
        vb = b.category ?? "";
        break;
      case "name":
        va = a.name ?? "";
        vb = b.name ?? "";
        break;
      default:
        return 0;
    }
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else setSortKey(key);
  };

  const fmtNum = (n: number | null | undefined) =>
    n == null ? "—" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n);
  const statusLabel = (e: PipelineEntry | undefined) => e?.status ?? "Uncontacted";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500">
        Loading prospects…
      </div>
    );
  }

  if (prospects.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
        <p className="text-neutral-600 dark:text-neutral-400">
          No prospects yet. Run ingestion via GitHub Actions or <code className="rounded bg-neutral-200 px-1 dark:bg-neutral-700">bun run ingest</code> to populate.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
            <th className="p-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("name")}
                className="hover:underline"
              >
                Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th className="p-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("category")}
                className="hover:underline"
              >
                Category {sortKey === "category" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th className="p-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("painScore")}
                className="hover:underline"
              >
                Score {sortKey === "painScore" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th className="p-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("tvl")}
                className="hover:underline"
              >
                TVL {sortKey === "tvl" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th className="p-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort("mcap")}
                className="hover:underline"
              >
                Mcap {sortKey === "mcap" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            </th>
            <th className="p-3 font-medium">Signals</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const entry = pipelineByProspect.get(p.id);
            const expanded = expandedId === p.id;
            return (
              <>
                <tr
                  key={p.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="p-3 font-medium">
                    <Link
                      href={`/prospect/${p.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td className="p-3 text-neutral-600 dark:text-neutral-400">
                    {p.category}
                  </td>
                  <td className="p-3">
                    <span className={p.treasuryGated ? "text-amber-600 dark:text-amber-400" : ""}>
                      {p.painScore}
                      {p.treasuryGated && " (gated)"}
                    </span>
                  </td>
                  <td className="p-3 tabular-nums">{fmtNum(p.tvl)}</td>
                  <td className="p-3 tabular-nums">{fmtNum(p.mcap)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.painSignals.filter((s) => s.points > 0).slice(0, 4).map((s) => (
                        <span
                          key={s.key}
                          className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-700"
                        >
                          {s.key}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">{statusLabel(entry)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : p.id)}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      {expanded ? "Collapse" : "Expand"}
                    </button>
                  </td>
                </tr>
                {expanded && (
                  <tr key={`${p.id}-exp`} className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <td colSpan={8} className="p-4">
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">Signal breakdown</p>
                        <ul className="list-inside list-disc space-y-1">
                          {p.painSignals.map((s) => (
                            <li key={s.key}>
                              <strong>{s.key}</strong> ({s.points} pt): {s.explanation}
                            </li>
                          ))}
                        </ul>
                        {p.treasuryGated && (
                          <p className="text-amber-600 dark:text-amber-400">
                            Treasury gate applied (TVL &lt; $5M).
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
