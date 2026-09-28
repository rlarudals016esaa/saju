-- Review and back up the target project before applying this migration.
create table if not exists public.saju_daily_fortunes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null references public.saju_readings(id) on delete cascade,
  fortune_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  fortune jsonb,
  model text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fortune_date),
  check ((status = 'completed' and fortune is not null and model is not null) or status <> 'completed')
);

create index if not exists saju_daily_fortunes_user_date_idx
  on public.saju_daily_fortunes (user_id, fortune_date desc);

alter table public.saju_daily_fortunes enable row level security;

revoke all on public.saju_daily_fortunes from anon, authenticated;
grant select on public.saju_daily_fortunes to authenticated;

create policy "read own daily fortunes"
  on public.saju_daily_fortunes for select to authenticated
  using ((select auth.uid()) = user_id and status = 'completed');

create or replace function public.claim_saju_daily_fortune(
  p_user_id uuid,
  p_reading_id uuid,
  p_fortune_date date
)
returns table (claimed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  insert into public.saju_daily_fortunes (user_id, reading_id, fortune_date, status)
  values (p_user_id, p_reading_id, p_fortune_date, 'pending')
  on conflict (user_id, fortune_date) do nothing;
  get diagnostics affected = row_count;
  if affected = 1 then
    return query select true;
    return;
  end if;

  update public.saju_daily_fortunes
  set reading_id = p_reading_id,
      status = 'pending',
      fortune = null,
      model = null,
      error_code = null,
      updated_at = now()
  where user_id = p_user_id
    and fortune_date = p_fortune_date
    and (status = 'failed' or (status = 'pending' and updated_at < now() - interval '5 minutes'));
  get diagnostics affected = row_count;
  return query select affected = 1;
end;
$$;

revoke all on function public.claim_saju_daily_fortune(uuid, uuid, date) from public, anon, authenticated;
grant execute on function public.claim_saju_daily_fortune(uuid, uuid, date) to service_role;

create or replace function public.list_saju_daily_fortune_targets(
  p_fortune_date date,
  p_limit integer default 20
)
returns table (user_id uuid, reading_id uuid, chart jsonb)
language sql
security definer
set search_path = ''
as $$
  select latest.user_id, latest.id, latest.chart
  from (
    select distinct on (r.user_id) r.user_id, r.id, r.chart, r.created_at
    from public.saju_readings r
    order by r.user_id, r.created_at desc, r.id desc
  ) latest
  left join public.saju_daily_fortunes f
    on f.user_id = latest.user_id and f.fortune_date = p_fortune_date and f.status = 'completed'
  where f.id is null
  order by latest.created_at
  limit greatest(1, least(p_limit, 100));
$$;

revoke all on function public.list_saju_daily_fortune_targets(date, integer) from public, anon, authenticated;
grant execute on function public.list_saju_daily_fortune_targets(date, integer) to service_role;
