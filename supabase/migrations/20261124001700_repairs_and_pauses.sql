-- Streak repair: once a month per habit, a missed day from the last 2 days can
-- be repaired so a broken streak continues (it bridges the gap, it isn't a check-in).
create table public.habit_repairs (
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, day)
);
create unique index habit_repairs_once_a_month on public.habit_repairs (habit_id, ((extract(year from day) * 12 + extract(month from day))::int));
create index habit_repairs_user_idx on public.habit_repairs (user_id);

alter table public.habit_repairs enable row level security;

-- visible wherever the habit is visible (own, or on a public profile)
create policy "habit_repairs: read with the habit"
  on public.habit_repairs for select to anon, authenticated
  using (exists (select 1 from public.habits h where h.id = habit_id));

create policy "habit_repairs: repair own recent day"
  on public.habit_repairs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null)
    -- a little slack for time zones: "yesterday or the day before" in the user's local time
    and day between current_date - 3 and current_date
    and not exists (select 1 from public.habit_logs l where l.habit_id = habit_repairs.habit_id and l.log_date = habit_repairs.day)
  );

create policy "habit_repairs: delete own"
  on public.habit_repairs for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.habit_repairs to anon;
grant select, insert, delete on public.habit_repairs to authenticated;

-- Vacation mode: days inside a pause never break streaks, and reminders stay quiet.
create table public.pauses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 30)
);
create index pauses_user_idx on public.pauses (user_id, end_date);

alter table public.pauses enable row level security;

create policy "pauses: read own or public"
  on public.pauses for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = pauses.user_id and p.is_public)
  );

-- no retroactive pauses (that would be an unlimited streak repair)
create policy "pauses: start own"
  on public.pauses for insert to authenticated
  with check (user_id = (select auth.uid()) and start_date >= current_date - 1);

create policy "pauses: end own"
  on public.pauses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "pauses: delete own"
  on public.pauses for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.pauses to anon;
grant select, insert, delete on public.pauses to authenticated;
grant update (end_date) on public.pauses to authenticated;

-- ending early only moves the end date back — never forward (no retroactive cover)
create function public.pauses_end_only_earlier()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.end_date > old.end_date then
    raise exception 'a pause can only be ended earlier';
  end if;
  return new;
end;
$$;

revoke execute on function public.pauses_end_only_earlier() from public, anon, authenticated;

create trigger pauses_end_only_earlier
  before update on public.pauses
  for each row execute function public.pauses_end_only_earlier();
