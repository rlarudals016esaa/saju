-- Review and back up the target project before applying this migration.
create table if not exists public.saju_reading_shares (
  token uuid primary key default gen_random_uuid(),
  reading_id uuid not null unique references public.saju_readings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chart jsonb not null,
  reading jsonb not null,
  model text not null,
  schema_version integer not null check (schema_version = 1),
  generated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.saju_reading_shares enable row level security;
revoke all on public.saju_reading_shares from anon, authenticated;

create or replace function public.create_saju_reading_share(p_reading_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shared_token uuid;
begin
  if auth.uid() is null then
    raise insufficient_privilege using message = 'authentication required';
  end if;

  insert into public.saju_reading_shares (
    reading_id, user_id, chart, reading, model, schema_version, generated_at
  )
  select
    source.id, source.user_id, source.chart, source.reading,
    source.model, source.schema_version, source.created_at
  from public.saju_readings as source
  where source.id = p_reading_id
    and source.user_id = auth.uid()
  on conflict (reading_id) do update
    set reading_id = excluded.reading_id
  returning token into shared_token;

  if shared_token is null then
    raise no_data_found using message = 'reading not found';
  end if;

  return shared_token;
end;
$$;

create or replace function public.get_saju_reading_share(p_token uuid)
returns table (
  chart jsonb,
  reading jsonb,
  model text,
  schema_version integer,
  generated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    shared.chart,
    shared.reading,
    shared.model,
    shared.schema_version,
    shared.generated_at
  from public.saju_reading_shares as shared
  where shared.token = p_token
  limit 1;
$$;

revoke all on function public.create_saju_reading_share(uuid) from public;
revoke all on function public.get_saju_reading_share(uuid) from public;
grant execute on function public.create_saju_reading_share(uuid) to authenticated;
grant execute on function public.get_saju_reading_share(uuid) to anon, authenticated;
