/**
 * Server-side Supabase client (service role for full access).
 * Use for API routes and server components.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase() {
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}

export type ProspectRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  chains: unknown;
  tvl: number;
  tvl_change_1m: number | null;
  mcap: number | null;
  volume: number | null;
  volume_mcap_ratio: number | null;
  ath_change_pct: number | null;
  price_change_7d: number | null;
  github_activity: unknown;
  pain_score: number;
  pain_score_raw: number;
  pain_signals: unknown;
  treasury_gated: boolean;
  score_jumped: boolean | null;
  deliverable_recommendations: unknown;
  sources: unknown;
  last_updated: string;
  url_defillama: string | null;
  url_coingecko: string | null;
  url_twitter: string | null;
  url_discord: string | null;
};

export type PipelineRow = {
  prospect_id: string;
  status: string;
  contacted_at: string | null;
  notes: string | null;
  follow_up_at: string | null;
  estimated_value: number | null;
  revenue: number | null;
  updated_at: string;
};
