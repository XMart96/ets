-- Clinic is now taken from the NFC tag, not from the profile
alter table public.profiles drop column clinic_id;

-- Users must not be able to change their own role
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, first_name, last_name) on public.profiles to authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;

create or replace function public.is_root()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'root'
  );
$$;
revoke all on function public.is_root() from public, anon;
grant execute on function public.is_root() to authenticated;

create policy "Root can view all profiles" on public.profiles
  for select to authenticated using (public.is_root());

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint time_entries_end_after_start check (ended_at is null or ended_at >= started_at)
);

-- Only one running timer per user
create unique index time_entries_one_active_per_user
  on public.time_entries (user_id) where ended_at is null;
create index time_entries_user_started_idx on public.time_entries (user_id, started_at);
create index time_entries_clinic_started_idx on public.time_entries (clinic_id, started_at);

alter table public.time_entries enable row level security;
revoke all on public.time_entries from anon, authenticated;
grant select on public.time_entries to authenticated;

create policy "Users can view own entries" on public.time_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Root can view all entries" on public.time_entries
  for select to authenticated using (public.is_root());

-- Start: server time is the source of truth
create or replace function public.start_timer(p_clinic_id uuid)
returns table (entry_id uuid, started_at timestamptz, server_now timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_missing';
  end if;
  if not exists (select 1 from public.clinics where id = p_clinic_id) then
    raise exception 'clinic_not_found';
  end if;

  begin
    return query
      insert into public.time_entries (user_id, clinic_id)
      values (v_uid, p_clinic_id)
      returning id, time_entries.started_at, now();
  exception when unique_violation then
    raise exception 'timer_already_running';
  end;
end;
$$;

create or replace function public.stop_timer()
returns table (entry_id uuid, started_at timestamptz, ended_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  return query
    update public.time_entries t
       set ended_at = now()
     where t.user_id = auth.uid() and t.ended_at is null
    returning t.id, t.started_at, t.ended_at;

  if not found then
    raise exception 'no_active_timer';
  end if;
end;
$$;

-- Active timer (if any) with the server clock, to resume after app restart
create or replace function public.get_active_timer()
returns table (entry_id uuid, clinic_id uuid, started_at timestamptz, server_now timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.clinic_id, t.started_at, now()
    from public.time_entries t
   where t.user_id = auth.uid() and t.ended_at is null;
$$;

revoke all on function public.start_timer(uuid) from public, anon;
revoke all on function public.stop_timer() from public, anon;
revoke all on function public.get_active_timer() from public, anon;
grant execute on function public.start_timer(uuid) to authenticated;
grant execute on function public.stop_timer() to authenticated;
grant execute on function public.get_active_timer() to authenticated;
