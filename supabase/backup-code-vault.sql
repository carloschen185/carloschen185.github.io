-- Backup Code Vault schema for Supabase project hxpiiajuhcxettowruwr.
-- Secret values are encrypted in clients before they reach these tables.

create table if not exists public.backup_vault_config (
  singleton boolean primary key default true check (singleton),
  password_sha256 text not null check (password_sha256 ~ '^[0-9a-f]{64}$'),
  kdf_salt text not null,
  kdf_iterations integer not null default 600000 check (kdf_iterations >= 100000),
  format_version integer not null default 1 check (format_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_vault_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.backup_vault_auth_attempts (
  fingerprint text primary key check (fingerprint ~ '^[0-9a-f]{64}$'),
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_vault_groups (
  id uuid primary key,
  iv text not null check (length(iv) between 16 and 64),
  ciphertext text not null check (length(ciphertext) between 20 and 32768),
  sort_order integer not null default 0,
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.backup_vault_codes (
  id uuid primary key,
  group_id uuid not null references public.backup_vault_groups(id) on delete restrict,
  iv text not null check (length(iv) between 16 and 64),
  ciphertext text not null check (length(ciphertext) between 20 and 32768),
  sort_order integer not null default 0,
  row_version bigint not null default 1 check (row_version > 0),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists backup_vault_sessions_expires_at_idx
  on public.backup_vault_sessions(expires_at);
create index if not exists backup_vault_groups_sort_idx
  on public.backup_vault_groups(sort_order, created_at);
create index if not exists backup_vault_codes_group_sort_idx
  on public.backup_vault_codes(group_id, sort_order, created_at);

alter table public.backup_vault_config enable row level security;
alter table public.backup_vault_sessions enable row level security;
alter table public.backup_vault_auth_attempts enable row level security;
alter table public.backup_vault_groups enable row level security;
alter table public.backup_vault_codes enable row level security;

drop policy if exists deny_client_access on public.backup_vault_config;
create policy deny_client_access on public.backup_vault_config
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.backup_vault_sessions;
create policy deny_client_access on public.backup_vault_sessions
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.backup_vault_auth_attempts;
create policy deny_client_access on public.backup_vault_auth_attempts
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.backup_vault_groups;
create policy deny_client_access on public.backup_vault_groups
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.backup_vault_codes;
create policy deny_client_access on public.backup_vault_codes
  for all to anon, authenticated using (false) with check (false);

revoke all on table public.backup_vault_config from anon, authenticated;
revoke all on table public.backup_vault_sessions from anon, authenticated;
revoke all on table public.backup_vault_auth_attempts from anon, authenticated;
revoke all on table public.backup_vault_groups from anon, authenticated;
revoke all on table public.backup_vault_codes from anon, authenticated;
grant all on table public.backup_vault_config to service_role;
grant all on table public.backup_vault_sessions to service_role;
grant all on table public.backup_vault_auth_attempts to service_role;
grant all on table public.backup_vault_groups to service_role;
grant all on table public.backup_vault_codes to service_role;

insert into public.backup_vault_config (
  singleton,
  password_sha256,
  kdf_salt,
  kdf_iterations,
  format_version
)
values (
  true,
  'abec0c14a0e3815b42fbb02e3eaa2714929f6347ebdb3408f252dcc34fc417bd',
  encode(extensions.gen_random_bytes(16), 'base64'),
  600000,
  1
)
on conflict (singleton) do nothing;

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
