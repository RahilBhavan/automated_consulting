/**
 * Data layer: Supabase-backed storage replacing local JSON.
 * Same logical API as previous storage (readProspects, writeProspects, readPipeline, writePipeline).
 */

import type { Prospect } from "@/types/prospect";
import type { PipelineEntry } from "@/types/pipeline";
import type { ProspectRow, PipelineRow } from "./supabase-server";
import { getSupabase } from "./supabase-server";

function rowToProspect(r: ProspectRow): Prospect {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    category: r.category,
    chains: Array.isArray(r.chains) ? r.chains : [],
    tvl: Number(r.tvl),
    tvlChange1m: r.tvl_change_1m != null ? Number(r.tvl_change_1m) : null,
    mcap: r.mcap != null ? Number(r.mcap) : null,
    volume: r.volume != null ? Number(r.volume) : null,
    volumeMcapRatio: r.volume_mcap_ratio != null ? Number(r.volume_mcap_ratio) : null,
    athChangePct: r.ath_change_pct != null ? Number(r.ath_change_pct) : null,
    priceChange7d: r.price_change_7d != null ? Number(r.price_change_7d) : null,
    githubActivity: (r.github_activity as Prospect["githubActivity"]) ?? null,
    painScore: Number(r.pain_score),
    painScoreRaw: Number(r.pain_score_raw),
    painSignals: Array.isArray(r.pain_signals) ? (r.pain_signals as Prospect["painSignals"]) : [],
    treasuryGated: Boolean(r.treasury_gated),
    scoreJumped: r.score_jumped ?? undefined,
    deliverableRecommendations: Array.isArray(r.deliverable_recommendations)
      ? (r.deliverable_recommendations as Prospect["deliverableRecommendations"])
      : [],
    sources: Array.isArray(r.sources) ? (r.sources as Prospect["sources"]) : [],
    lastUpdated: r.last_updated,
    urlDefillama: r.url_defillama ?? undefined,
    urlCoingecko: r.url_coingecko ?? undefined,
    urlTwitter: r.url_twitter ?? undefined,
    urlDiscord: r.url_discord ?? undefined,
  };
}

function prospectToRow(p: Prospect): Record<string, unknown> {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    chains: p.chains,
    tvl: p.tvl,
    tvl_change_1m: p.tvlChange1m,
    mcap: p.mcap,
    volume: p.volume,
    volume_mcap_ratio: p.volumeMcapRatio,
    ath_change_pct: p.athChangePct,
    price_change_7d: p.priceChange7d,
    github_activity: p.githubActivity,
    pain_score: p.painScore,
    pain_score_raw: p.painScoreRaw,
    pain_signals: p.painSignals,
    treasury_gated: p.treasuryGated,
    score_jumped: p.scoreJumped ?? null,
    deliverable_recommendations: p.deliverableRecommendations,
    sources: p.sources,
    last_updated: p.lastUpdated,
    url_defillama: p.urlDefillama ?? null,
    url_coingecko: p.urlCoingecko ?? null,
    url_twitter: p.urlTwitter ?? null,
    url_discord: p.urlDiscord ?? null,
  };
}

function rowToPipelineEntry(r: PipelineRow): PipelineEntry {
  return {
    prospectId: r.prospect_id,
    status: r.status as PipelineEntry["status"],
    contactedAt: r.contacted_at ?? undefined,
    notes: r.notes ?? undefined,
    followUpAt: r.follow_up_at ?? undefined,
    estimatedValue: r.estimated_value != null ? Number(r.estimated_value) : undefined,
    revenue: r.revenue != null ? Number(r.revenue) : undefined,
    updatedAt: r.updated_at,
  };
}

function entryToRow(e: PipelineEntry): Record<string, unknown> {
  return {
    prospect_id: e.prospectId,
    status: e.status,
    contacted_at: e.contactedAt ?? null,
    notes: e.notes ?? null,
    follow_up_at: e.followUpAt ?? null,
    estimated_value: e.estimatedValue ?? null,
    revenue: e.revenue ?? null,
    updated_at: e.updatedAt,
  };
}

export async function getProspectById(id: string): Promise<Prospect | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data == null ? null : rowToProspect(data as ProspectRow);
}

export async function getPipelineEntryByProspectId(prospectId: string): Promise<PipelineEntry | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("pipeline")
    .select("*")
    .eq("prospect_id", prospectId)
    .maybeSingle();
  if (error) throw error;
  return data == null ? null : rowToPipelineEntry(data as PipelineRow);
}

export async function readProspects(): Promise<Prospect[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .order("pain_score", { ascending: false });
  if (error) throw error;
  return (data as ProspectRow[]).map(rowToProspect);
}

export async function writeProspects(prospects: Prospect[]): Promise<void> {
  const supabase = getSupabase();
  const rows = prospects.map((p) => prospectToRow(p));
  const { error } = await supabase.from("prospects").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

export async function readPipeline(): Promise<PipelineEntry[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("pipeline").select("*");
  if (error) throw error;
  return (data as PipelineRow[]).map(rowToPipelineEntry);
}

export async function writePipeline(entries: PipelineEntry[]): Promise<void> {
  const supabase = getSupabase();
  const rows = entries.map((e) => entryToRow(e));
  const { error } = await supabase.from("pipeline").upsert(rows, { onConflict: "prospect_id" });
  if (error) throw error;
}
