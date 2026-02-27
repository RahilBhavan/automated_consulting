-- CryptoProspect: prospects (read by app, written by ingest script) and pipeline (read/write by app).

create table if not exists prospects (
  id text primary key,
  name text not null,
  slug text not null,
  category text not null default '',
  chains jsonb not null default '[]',
  tvl numeric not null default 0,
  tvl_change_1m numeric,
  mcap numeric,
  volume numeric,
  volume_mcap_ratio numeric,
  ath_change_pct numeric,
  price_change_7d numeric,
  github_activity jsonb,
  pain_score numeric not null default 0,
  pain_score_raw numeric not null default 0,
  pain_signals jsonb not null default '[]',
  treasury_gated boolean not null default false,
  score_jumped boolean default false,
  deliverable_recommendations jsonb not null default '[]',
  sources jsonb not null default '[]',
  last_updated timestamptz not null default now(),
  url_defillama text,
  url_coingecko text,
  url_twitter text,
  url_discord text
);

create index if not exists idx_prospects_pain_score on prospects (pain_score desc);
create index if not exists idx_prospects_category on prospects (category);
create index if not exists idx_prospects_last_updated on prospects (last_updated desc);

create table if not exists pipeline (
  prospect_id text primary key,
  status text not null check (status in (
    'Uncontacted', 'HookBuilding', 'HookSent', 'Replied', 'DemoBuilt', 'Converted'
  )),
  contacted_at timestamptz,
  notes text,
  follow_up_at timestamptz,
  estimated_value numeric,
  revenue numeric,
  updated_at timestamptz not null default now()
);

create index if not exists idx_pipeline_status on pipeline (status);
