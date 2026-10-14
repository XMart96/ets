-- Monthly hours per employee for the director (root only).
-- Month boundaries are in Moscow time; a running timer counts up to now().
create or replace function public.monthly_report(p_month date)
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
  v_from timestamptz := date_trunc('month', p_month::timestamp) at time zone 'Europe/Moscow';
  v_to timestamptz := (date_trunc('month', p_month::timestamp) + interval '1 month') at time zone 'Europe/Moscow';
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

revoke all on function public.monthly_report(date) from public, anon;
grant execute on function public.monthly_report(date) to authenticated;
