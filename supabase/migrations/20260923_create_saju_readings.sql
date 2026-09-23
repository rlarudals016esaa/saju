-- Review and back up the target project before applying this migration.
create table if not exists public.saju_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  chart jsonb not null,
  reading jsonb not null,
  model text not null,
  schema_version integer not null default 1 check (schema_version = 1),
  created_at timestamptz not null default now(),
  unique (user_id, request_id)
);

create index if not exists saju_readings_user_created_idx
  on public.saju_readings (user_id, created_at desc, id desc);

alter table public.saju_readings enable row level security;

revoke all on public.saju_readings from anon, authenticated;
grant select, insert, delete on public.saju_readings to authenticated;

create policy "read own saju readings"
  on public.saju_readings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "insert own saju readings"
  on public.saju_readings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "delete own saju readings"
  on public.saju_readings for delete to authenticated
  using ((select auth.uid()) = user_id);
