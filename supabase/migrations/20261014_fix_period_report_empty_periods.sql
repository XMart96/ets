-- Fix: an employee with no entries in the period got the whole period counted
-- (left join gives a null row, and coalesce(null, now()) turned it into hours)
-- and was flagged as having an active timer.
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
           )) filter (where t.id is not null), 0)::bigint,
           count(t.id),
           coalesce(bool_or(t.ended_at is null) filter (where t.id is not null), false)
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
