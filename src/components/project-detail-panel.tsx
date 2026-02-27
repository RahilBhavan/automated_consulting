"use client";

import { useState } from "react";
import type { Prospect } from "@/types/prospect";
import type { PipelineEntry } from "@/types/pipeline";
import { PIPELINE_STATUSES, type PipelineStatus } from "@/types/pipeline";

type Props = {
  prospect: Prospect;
  pipelineEntry: PipelineEntry | null;
};

export function ProjectDetailPanel({ prospect, pipelineEntry }: Props) {
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [specResult, setSpecResult] = useState<{
    techStack: string;
    hours: string;
    priceRange: string;
    proofOfWorkParagraph: string;
  } | null>(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<string>("");

  const fmtNum = (n: number | null | undefined) =>
    n == null ? "—" : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

  const handleGenerateEmail = async () => {
    setEmailLoading(true);
    setEmailDraft(null);
    try {
      const res = await fetch("/api/claude/email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      });
      const data = await res.json();
      if (data?.emailBody) setEmailDraft(data.emailBody);
      else if (data?.error) setEmailDraft(`Error: ${data.error}`);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGenerateSpec = async () => {
    const deliverableId = selectedDeliverable || prospect.deliverableRecommendations[0]?.deliverableId;
    const title = prospect.deliverableRecommendations.find((r) => r.deliverableId === deliverableId)?.title ?? deliverableId;
    setSpecLoading(true);
    setSpecResult(null);
    try {
      const res = await fetch("/api/claude/deliverable-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id, deliverableId, deliverableTitle: title }),
      });
      const data = await res.json();
      if (data?.techStack != null) {
        setSpecResult({
          techStack: data.techStack,
          hours: data.hours,
          priceRange: data.priceRange,
          proofOfWorkParagraph: data.proofOfWorkParagraph ?? "",
        });
      }
    } finally {
      setSpecLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{prospect.name}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">{prospect.category}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">TVL</p>
          <p className="text-lg font-medium tabular-nums">{fmtNum(prospect.tvl)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Market cap</p>
          <p className="text-lg font-medium tabular-nums">{fmtNum(prospect.mcap)}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Pain score</h2>
        <div className="flex items-center gap-2">
          <div className="h-4 flex-1 max-w-[200px] overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700">
            <div
              className="h-full bg-blue-500 dark:bg-blue-600"
              style={{ width: `${Math.min(100, prospect.painScore * 10)}%` }}
            />
          </div>
          <span className="font-medium">{prospect.painScore}/10</span>
          {prospect.treasuryGated && (
            <span className="text-amber-600 dark:text-amber-400">(Treasury gated)</span>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Signal breakdown</h2>
        <ul className="space-y-2">
          {prospect.painSignals.map((s) => (
            <li key={s.key} className="flex items-start gap-2 rounded border border-neutral-200 p-2 dark:border-neutral-700">
              <span className="shrink-0 font-medium">{s.key}</span>
              <span className="text-neutral-600 dark:text-neutral-400">{s.explanation}</span>
              <span className="ml-auto shrink-0 tabular-nums">{s.points > 0 ? "+" : ""}{s.points}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Links</h2>
        <div className="flex flex-wrap gap-2">
          {prospect.urlDefillama && (
            <a
              href={prospect.urlDefillama}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              DeFiLlama
            </a>
          )}
          {prospect.urlCoingecko && (
            <a
              href={prospect.urlCoingecko}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              CoinGecko
            </a>
          )}
          {prospect.urlTwitter && (
            <a
              href={prospect.urlTwitter}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600"
            >
              Twitter
            </a>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Outreach draft</h2>
        <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
          Generate a short outreach email citing this project&apos;s pain signals.
        </p>
        <button
          type="button"
          onClick={handleGenerateEmail}
          disabled={emailLoading}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {emailLoading ? "Generating…" : "Generate email draft"}
        </button>
        {emailDraft && (
          <div className="mt-4">
            <textarea
              readOnly
              className="w-full rounded border border-neutral-200 bg-neutral-50 p-3 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-900"
              rows={8}
              value={emailDraft}
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(emailDraft)}
              className="mt-2 rounded bg-neutral-200 px-3 py-1.5 text-sm dark:bg-neutral-700"
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </div>

      {pipelineEntry && (
        <div>
          <h2 className="mb-2 font-medium">Pipeline</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Status: {pipelineEntry.status} · Updated: {pipelineEntry.updatedAt.slice(0, 10)}
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-medium">Update pipeline status</h2>
        <select
          className="rounded border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          value={pipelineEntry?.status ?? "Uncontacted"}
          onChange={async (e) => {
            const status = e.target.value as PipelineStatus;
            await fetch("/api/pipeline", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prospectId: prospect.id,
                status,
                notes: pipelineEntry?.notes,
                contactedAt: pipelineEntry?.contactedAt,
                followUpAt: pipelineEntry?.followUpAt,
                estimatedValue: pipelineEntry?.estimatedValue,
                revenue: pipelineEntry?.revenue,
              }),
            });
            window.location.reload();
          }}
        >
          {PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Deliverable generator</h2>
        <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
          Generate a spec and proof-of-work paragraph for a recommended deliverable.
        </p>
        {prospect.deliverableRecommendations.length > 0 ? (
          <>
            <select
              className="mb-2 rounded border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              value={selectedDeliverable}
              onChange={(e) => setSelectedDeliverable(e.target.value)}
            >
              <option value="">Select deliverable</option>
              {prospect.deliverableRecommendations.map((r) => (
                <option key={r.deliverableId} value={r.deliverableId}>
                  {r.title}
                </option>
              ))}
            </select>
            <br />
            <button
              type="button"
              onClick={handleGenerateSpec}
              disabled={specLoading}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {specLoading ? "Generating…" : "Generate spec"}
            </button>
            {specResult && (
              <div className="mt-4 space-y-2 rounded border border-neutral-200 p-4 dark:border-neutral-700">
                <p><strong>Tech stack:</strong> {specResult.techStack}</p>
                <p><strong>Estimated hours:</strong> {specResult.hours}</p>
                <p><strong>Price range:</strong> {specResult.priceRange}</p>
                <p><strong>Proof of work:</strong> {specResult.proofOfWorkParagraph}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(specResult.proofOfWorkParagraph)}
                  className="rounded bg-neutral-200 px-3 py-1.5 text-sm dark:bg-neutral-700"
                >
                  Copy proof-of-work
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">No deliverable recommendations for this prospect.</p>
        )}
      </div>
    </div>
  );
}
