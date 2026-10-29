-- ProofBeforePay schema. Paste into the Supabase SQL Editor and press Run (safe to run twice).
--
-- One row per investigation keeps the full report and event log, which is what the app reads back for
-- report links and replays. The evidence trail is also stored as plain rows (claims, sources, evidence,
-- signals, findings) so it can be queried directly. Row-level security is on with no policies, so only the
-- server's secret key can read or write; the browser never talks to the database.

create table if not exists investigations (
  id                  text primary key,
  created_at          timestamptz not null default now(),
  status              text not null,
  input               jsonb not null,
  decision            text check (decision in ('PROCEED', 'VERIFY_FIRST', 'STOP')),
  confidence          int,
  headline            text,
  company             text,
  role                text,
  challenge_outcome   text,
  report              jsonb,
  events              jsonb not null default '[]'::jsonb,
  error               text,
  cost_usd            numeric(10, 6) not null default 0,
  methodology_version int not null default 1
);

create table if not exists claims (
  investigation_id text not null references investigations (id) on delete cascade,
  claim_id         text not null,
  type             text,
  text             text not null,
  status           text not null check (status in ('verified', 'contradicted', 'inconclusive')),
  confidence       real,
  checked_by       text,
  escalated        boolean not null default false,
  note             text,
  primary key (investigation_id, claim_id)
);

create table if not exists sources (
  investigation_id text not null references investigations (id) on delete cascade,
  source_id        text not null,
  url              text not null,
  title            text,
  domain           text,
  purposes         text[] not null default '{}',
  retrieved_at     timestamptz,
  primary key (investigation_id, source_id)
);

-- Which source each claim check rests on, the quote it rests on, and whether it supports or contradicts the claim.
create table if not exists evidence (
  investigation_id text not null,
  claim_id         text not null,
  source_id        text not null,
  excerpt          text,
  relation         text not null check (relation in ('supports', 'contradicts', 'context')),
  primary key (investigation_id, claim_id),
  foreign key (investigation_id, claim_id) references claims (investigation_id, claim_id) on delete cascade,
  foreign key (investigation_id, source_id) references sources (investigation_id, source_id) on delete cascade
);

-- Hard signals: facts established by code (patterns, registry records, domain matching, linked pages).
create table if not exists signals (
  investigation_id text not null references investigations (id) on delete cascade,
  signal_id        text not null,
  rule             text,
  kind             text,
  polarity         text not null check (polarity in ('red', 'amber', 'green')),
  severity         text,
  title            text not null,
  detail           text,
  primary key (investigation_id, signal_id)
);

-- The verdict's key findings, each with the ids of the evidence it cites.
create table if not exists findings (
  investigation_id text not null references investigations (id) on delete cascade,
  position         int not null,
  polarity         text not null,
  text             text not null,
  refs             text[] not null default '{}',
  primary key (investigation_id, position)
);

-- Every live run's model cost, so the spending ceiling survives server restarts.
create table if not exists spend_ledger (
  id               bigint generated always as identity primary key,
  investigation_id text,
  cost_usd         numeric(10, 6) not null,
  created_at       timestamptz not null default now()
);

create or replace view spend_total with (security_invoker = on) as
  select coalesce(sum(cost_usd), 0)::float8 as spent_usd from spend_ledger;

create index if not exists investigations_created_at on investigations (created_at desc);

alter table investigations enable row level security;
alter table claims         enable row level security;
alter table sources        enable row level security;
alter table evidence       enable row level security;
alter table signals        enable row level security;
alter table findings       enable row level security;
alter table spend_ledger   enable row level security;
revoke all on spend_total from anon, authenticated;
