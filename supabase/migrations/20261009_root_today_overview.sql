-- Who is on shift now and who finished today (root only).
-- "Today" starts at midnight Moscow time. Includes running timers started earlier.
create or replace function public.today_overview()
returns table (
  entry_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  clinic_name text,
  started_at timestamptz,
  ended_at timestamptz,
  server_now timestamptz,
  day_start timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day_start timestamptz := date_trunc('day', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow';
begin
  if not public.is_root() then
    raise exception 'forbidden';
  end if;

  return query
    select t.id, t.user_id, p.first_name, p.last_name, c.name,
           t.started_at, t.ended_at, now(), v_day_start
      from public.time_entries t
      join public.profiles p on p.id = t.user_id
      join public.clinics c on c.id = t.clinic_id
     where t.ended_at is null or t.ended_at > v_day_start
     order by t.started_at;
end;
$$;

revoke all on function public.today_overview() from public, anon;
grant execute on function public.today_overview() to authenticated;
