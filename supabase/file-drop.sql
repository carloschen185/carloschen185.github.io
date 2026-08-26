-- File Drop schema for Supabase project hxpiiajuhcxettowruwr.
-- Files live in a private Storage bucket and are reachable only through the Edge Function.

insert into storage.buckets (id, name, public, file_size_limit)
values ('file-drop', 'file-drop', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

create table if not exists public.file_drop_config (
  singleton boolean primary key default true check (singleton),
  admin_key_sha256 text not null check (admin_key_sha256 ~ '^[0-9a-f]{64}$'),
  pattern_salt text,
  pattern_hash text check (pattern_hash is null or pattern_hash ~ '^[0-9a-f]{64}$'),
  pattern_iterations integer not null default 310000 check (pattern_iterations >= 100000),
  updated_at timestamptz not null default now(),
  check ((pattern_salt is null) = (pattern_hash is null))
);

create table if not exists public.file_drop_files (
  id uuid primary key default extensions.gen_random_uuid(),
  object_path text not null unique check (length(object_path) between 1 and 320),
  original_name text not null check (length(original_name) between 1 and 255),
  mime_type text not null default 'application/octet-stream' check (length(mime_type) between 1 and 255),
  size_bytes bigint not null check (size_bytes between 0 and 52428800),
  status text not null default 'pending' check (status in ('pending', 'ready')),
  share_token_hash text check (share_token_hash is null or share_token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  ready_at timestamptz
);

create table if not exists public.file_drop_delete_sessions (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  vault_token_hash text not null references public.backup_vault_sessions(token_hash) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.file_drop_delete_attempts (
  fingerprint text primary key check (fingerprint ~ '^[0-9a-f]{64}$'),
  failed_count integer not null default 0 check (failed_count >= 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists file_drop_files_ready_created_idx
  on public.file_drop_files (created_at desc)
  where status = 'ready';
create index if not exists file_drop_files_pending_created_idx
  on public.file_drop_files (created_at)
  where status = 'pending';
create index if not exists file_drop_delete_sessions_vault_idx
  on public.file_drop_delete_sessions (vault_token_hash);
create index if not exists file_drop_delete_sessions_expires_idx
  on public.file_drop_delete_sessions (expires_at);

alter table public.file_drop_config enable row level security;
alter table public.file_drop_files enable row level security;
alter table public.file_drop_delete_sessions enable row level security;
alter table public.file_drop_delete_attempts enable row level security;

drop policy if exists deny_client_access on public.file_drop_config;
create policy deny_client_access on public.file_drop_config
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.file_drop_files;
create policy deny_client_access on public.file_drop_files
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.file_drop_delete_sessions;
create policy deny_client_access on public.file_drop_delete_sessions
  for all to anon, authenticated using (false) with check (false);
drop policy if exists deny_client_access on public.file_drop_delete_attempts;
create policy deny_client_access on public.file_drop_delete_attempts
  for all to anon, authenticated using (false) with check (false);

revoke all on table public.file_drop_config from anon, authenticated;
revoke all on table public.file_drop_files from anon, authenticated;
revoke all on table public.file_drop_delete_sessions from anon, authenticated;
revoke all on table public.file_drop_delete_attempts from anon, authenticated;
grant all on table public.file_drop_config to service_role;
grant all on table public.file_drop_files to service_role;
grant all on table public.file_drop_delete_sessions to service_role;
grant all on table public.file_drop_delete_attempts to service_role;

-- Replace this hash before applying. The matching plaintext key belongs only in Windows Credential Manager.
insert into public.file_drop_config (singleton, admin_key_sha256)
values (true, 'f0b150178c8e2382bfdbe8914b2bde7ed5de2d1c7257a2273e8966ea315ba5e0')
on conflict (singleton) do update
set admin_key_sha256 = excluded.admin_key_sha256,
    updated_at = now();
