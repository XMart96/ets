-- Admin views for an arbitrary day and for week / month reports (root only).
-- Day, week and month boundaries are in Moscow time; running timers count up to now().

-- Same as today_overview, but for any day (null = today).
create or replace function public.day_overview(p_day date default null)
returns table (
  entry_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  clinic_name text,
  started_at timestamptz,
  ended_at timestamptz,
  server_now timestamptz,
  day_start timestamptz,
  day_end timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day timestamp := date_trunc('day', coalesce(p_day::timestamp, now() at time zone 'Europe/Moscow'));
  v_day_start timestamptz := v_day at time zone 'Europe/Moscow';
  v_day_end timestamptz := (v_day + interval '1 day') at time zone 'Europe/Moscow';
begin
  if not public.is_root() then
    raise exception 'forbidden';
  end if;

  return query
    select t.id, t.user_id, p.first_name, p.last_name, c.name,
           t.started_at, t.ended_at, now(), v_day_start, v_day_end
      from public.time_entries t
      join public.profiles p on p.id = t.user_id
      join public.clinics c on c.id = t.clinic_id
     where t.started_at < v_day_end
       and coalesce(t.ended_at, now()) > v_day_start
     order by t.started_at;
end;
$$;

-- Hours per employee for any period [p_from, p_to) (week, month, ...).
create or replace function public.period_report(p_from date, p_to date)
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  total_seconds bigint,
  entries_count bigint,
  has_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Europe/Moscow';
  v_to timestamptz := p_to::timestamp at time zone 'Europe/Moscow';
begin
  if not public.is_root() then
    raise exception 'forbidden';
  end if;

  return query
    select p.id,
           p.first_name,
           p.last_name,
           coalesce(sum(extract(epoch from
             least(coalesce(t.ended_at, now()), v_to) - greatest(t.started_at, v_from)
           )), 0)::bigint,
           count(t.id),
           coalesce(bool_or(t.ended_at is null), false)
      from public.profiles p
      left join public.time_entries t
        on t.user_id = p.id
       and t.started_at < v_to
       and coalesce(t.ended_at, now()) > v_from
     where p.role = 'employee'
     group by p.id, p.first_name, p.last_name
     order by p.last_name, p.first_name;
end;
$$;

-- All entries of one employee in a period, for the per-day breakdown.
create or replace function public.period_entries(p_user_id uuid, p_from date, p_to date)
returns table (
  entry_id uuid,
  clinic_name text,
  started_at timestamptz,
  ended_at timestamptz,
  server_now timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz := p_from::timestamp at time zone 'Europe/Moscow';
  v_to timestamptz := p_to::timestamp at time zone 'Europe/Moscow';
begin
  if not public.is_root() then
    raise exception 'forbidden';
  end if;

  return query
    select t.id, c.name, t.started_at, t.ended_at, now()
      from public.time_entries t
      join public.clinics c on c.id = t.clinic_id
     where t.user_id = p_user_id
       and t.started_at < v_to
       and coalesce(t.ended_at, now()) > v_from
     order by t.started_at;
end;
$$;

revoke all on function public.day_overview(date) from public, anon;
revoke all on function public.period_report(date, date) from public, anon;
revoke all on function public.period_entries(uuid, date, date) from public, anon;
grant execute on function public.day_overview(date) to authenticated;
grant execute on function public.period_report(date, date) to authenticated;
grant execute on function public.period_entries(uuid, date, date) to authenticated;
