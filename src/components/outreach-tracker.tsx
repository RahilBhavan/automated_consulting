"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Prospect } from "@/types/prospect";
import type { PipelineEntry } from "@/types/pipeline";
import { PIPELINE_STATUSES, type PipelineStatus } from "@/types/pipeline";

export function OutreachTracker() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");

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

  const prospectsById = new Map(prospects.map((p) => [p.id, p]));
  const pipelineByProspect = new Map(pipeline.map((e) => [e.prospectId, e]));

  const entriesWithProspect: { entry: PipelineEntry; prospect: Prospect }[] = prospects.map((p) => ({
    prospect: p,
    entry: pipelineByProspect.get(p.id) ?? {
      prospectId: p.id,
      status: "Uncontacted" as PipelineStatus,
      updatedAt: new Date().toISOString(),
    },
  }));

  const pipelineValue = entriesWithProspect
    .filter(({ entry }) =>
      ["HookBuilding", "HookSent", "Replied", "DemoBuilt"].includes(entry.status)
    )
    .reduce((sum, { entry }) => sum + (entry.estimatedValue ?? 0), 0);

  const totalRevenue = entriesWithProspect
    .filter(({ entry }) => entry.status === "Converted")
    .reduce((sum, { entry }) => sum + (entry.revenue ?? 0), 0);

  const updateStatus = async (prospectId: string, status: PipelineStatus) => {
    const entry = pipelineByProspect.get(prospectId);
    await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prospectId,
        status,
        notes: entry?.notes,
        contactedAt: entry?.contactedAt,
        followUpAt: entry?.followUpAt,
        estimatedValue: entry?.estimatedValue,
        revenue: entry?.revenue,
      }),
    });
    const res = await fetch("/api/pipeline");
    const pl = await res.json();
    setPipeline(Array.isArray(pl) ? pl : []);
  };

  const columns = PIPELINE_STATUSES;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`rounded px-3 py-1.5 text-sm ${view === "kanban" ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700"}`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`rounded px-3 py-1.5 text-sm ${view === "list" ? "bg-blue-600 text-white" : "bg-neutral-200 dark:bg-neutral-700"}`}
          >
            List
          </button>
        </div>
        <div className="flex gap-4 text-sm">
          <span>Pipeline value: <strong>${pipelineValue.toLocaleString()}</strong></span>
          <span>Revenue: <strong>${totalRevenue.toLocaleString()}</strong></span>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {columns.map((status) => {
            const cards = entriesWithProspect.filter((x) => x.entry.status === status);
            return (
              <div
                key={status}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <h3 className="mb-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {status}
                </h3>
                <div className="space-y-2">
                  {cards.map(({ entry, prospect }) => (
                    <div
                      key={prospect.id}
                      className="rounded border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <Link
                        href={`/prospect/${prospect.id}`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {prospect.name}
                      </Link>
                      <select
                        className="mt-1 w-full rounded border border-neutral-200 bg-white text-xs dark:border-neutral-600 dark:bg-neutral-900"
                        value={entry.status}
                        onChange={(e) =>
                          updateStatus(prospect.id, e.target.value as PipelineStatus)
                        }
                      >
                        {PIPELINE_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                <th className="p-3 font-medium">Prospect</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Contacted</th>
                <th className="p-3 font-medium">Follow-up</th>
                <th className="p-3 font-medium">Est. value</th>
                <th className="p-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithProspect.map(({ entry, prospect }) => (
                <tr key={prospect.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="p-3">
                    <Link
                      href={`/prospect/${prospect.id}`}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {prospect.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded border border-neutral-200 bg-white dark:border-neutral-600 dark:bg-neutral-900"
                      value={entry.status}
                      onChange={(e) =>
                        updateStatus(prospect.id, e.target.value as PipelineStatus)
                      }
                    >
                      {PIPELINE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">{entry.contactedAt?.slice(0, 10) ?? "—"}</td>
                  <td className="p-3">{entry.followUpAt?.slice(0, 10) ?? "—"}</td>
                  <td className="p-3 tabular-nums">
                    {entry.estimatedValue != null ? `$${entry.estimatedValue}` : "—"}
                  </td>
                  <td className="p-3 tabular-nums">
                    {entry.revenue != null ? `$${entry.revenue}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entriesWithProspect.length === 0 && (
            <p className="p-4 text-center text-neutral-500">
              No pipeline entries yet. Add prospects from the Dashboard by updating status in the prospect detail or via API.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
