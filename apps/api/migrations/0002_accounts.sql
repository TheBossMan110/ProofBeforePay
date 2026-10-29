-- ProofBeforePay accounts, feedback and contact messages. Run after 0001_init.sql (safe to run twice).
--
-- Passwords are scrypt hashes; one-time codes and session tokens are stored only as digests. As in 0001,
-- row-level security is on with no policies: only the server's secret key can read or write these tables.

create table if not exists users (
  id            uuid primary key,
  name          text not null,
  email         text not null unique check (email = lower(email)),
  password_hash text not null,
  verified_at   timestamptz,
  role          text not null default 'user' check (role in ('user', 'admin')),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists email_codes (
  id          uuid primary key,
  user_id     uuid not null references users (id) on delete cascade,
  purpose     text not null check (purpose in ('verify', 'reset')),
  code_hash   text not null,
  attempts    int not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);
create index if not exists email_codes_lookup on email_codes (user_id, purpose, created_at desc);

create table if not exists sessions (
  id         text primary key,  -- SHA-256 of the session token; the token itself is never stored
  user_id    uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip         text,
  user_agent text
);
create index if not exists sessions_user on sessions (user_id);

alter table investigations add column if not exists user_id uuid references users (id) on delete set null;
alter table investigations add column if not exists duration_s real;
alter table investigations add column if not exists savings_pct real;
create index if not exists investigations_user on investigations (user_id, created_at desc);

create table if not exists feedback (
  id               uuid primary key,
  user_id          uuid references users (id) on delete set null,
  investigation_id text,  -- no foreign key: feedback on the recorded examples is welcome too
  rating           int not null check (rating between 1 and 5),
  comment          text,
  created_at       timestamptz not null default now()
);

create table if not exists contact_messages (
  id         uuid primary key,
  user_id    uuid references users (id) on delete set null,
  name       text not null,
  email      text not null,
  topic      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table users            enable row level security;
alter table email_codes      enable row level security;
alter table sessions         enable row level security;
alter table feedback         enable row level security;
alter table contact_messages enable row level security;
