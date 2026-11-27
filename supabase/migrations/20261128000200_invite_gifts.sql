-- Growth plan 3.3: accepting an invite gives both people a spare streak repair.
-- A repair already bridges a missed day everywhere a streak is counted (the app,
-- pushes, achievements), so the reward needs no new streak rules: it only lifts
-- the "one repair per habit per month" limit once.

create table public.streak_gifts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  -- the other person of the invite
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  reason       text not null default 'invite' check (reason in ('invite')),
  created_at   timestamptz not null default now(),
  used_at      timestamptz,
  check (user_id <> from_user_id),
  -- one gift per pair, ever: inviting the same person again gives nothing
  unique (user_id, from_user_id)
);

alter table public.streak_gifts enable row level security;

create policy "streak_gifts: read own" on public.streak_gifts for select to authenticated
  using (user_id = (select auth.uid()));

-- given and spent only by the functions below
revoke all on public.streak_gifts from anon;
revoke insert, update, delete, truncate, references, trigger on public.streak_gifts from authenticated;

-- a repair made with a gift doesn't count toward the monthly limit
alter table public.habit_repairs add column gift boolean not null default false;
drop index public.habit_repairs_once_a_month;
create unique index habit_repairs_once_a_month on public.habit_repairs
  (habit_id, ((extract(year from day) * 12 + extract(month from day))::int))
  where not gift;

-- a direct insert is the monthly repair; it can't claim to be a gift
drop policy "habit_repairs: repair own recent day" on public.habit_repairs;
create policy "habit_repairs: repair own recent day"
  on public.habit_repairs for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not gift
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()) and h.archived_at is null)
    -- a little slack for time zones: "yesterday or the day before" in the user's local time
    and day between current_date - 3 and current_date
    and not exists (select 1 from public.habit_logs l where l.habit_id = habit_repairs.habit_id and l.log_date = habit_repairs.day)
  );

-- Repair a day with a spare repair: the same rules as the monthly one, plus an
-- unused gift, spent atomically. Returns false when there is no gift to spend.
create function public.repair_with_gift(p_habit uuid, p_day date)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  gift_id uuid;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if public.is_guest() then
    return false;
  end if;
  if not exists (select 1 from public.habits h where h.id = p_habit and h.user_id = me and h.archived_at is null)
     or p_day not between current_date - 3 and current_date
     or exists (select 1 from public.habit_logs l where l.habit_id = p_habit and l.log_date = p_day)
     or exists (select 1 from public.habit_repairs r where r.habit_id = p_habit and r.day = p_day) then
    raise exception 'this day can''t be repaired' using errcode = '42501';
  end if;

  select g.id into gift_id from public.streak_gifts g
  where g.user_id = me and g.used_at is null
  order by g.created_at
  limit 1
  for update skip locked;
  if gift_id is null then
    return false;
  end if;

  insert into public.habit_repairs (habit_id, user_id, day, gift) values (p_habit, me, p_day, true);
  update public.streak_gifts set used_at = now() where id = gift_id;
  return true;
end;
$$;

revoke execute on function public.repair_with_gift(uuid, date) from public, anon;
grant execute on function public.repair_with_gift(uuid, date) to authenticated;

-- accept_invite: as before, plus the gift for both (once per pair)
drop function public.accept_invite(text);
create function public.accept_invite(p_code text)
returns table (inviter_username text, pact_proposed boolean, gift_given boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  inv public.invites;
  proposed boolean := false;
  gifted boolean := false;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  -- guests accept after creating an account (the invite cookie waits)
  if public.is_guest() then
    return;
  end if;
  select * into inv from public.invites where code = p_code;
  if inv is null or inv.inviter_id = me then
    return;
  end if;

  insert into public.follows (follower_id, following_id) values (me, inv.inviter_id), (inv.inviter_id, me)
  on conflict do nothing;

  if inv.habit_id is not null and exists (
    select 1 from public.habits h where h.id = inv.habit_id and h.archived_at is null
  ) then
    insert into public.pacts (inviter_id, invitee_id, inviter_habit_id, status)
    values (inv.inviter_id, me, inv.habit_id, 'pending')
    on conflict do nothing;
    proposed := found;
  end if;

  -- a spare streak repair for both of you — once per pair
  insert into public.streak_gifts (user_id, from_user_id) values (me, inv.inviter_id), (inv.inviter_id, me)
  on conflict do nothing;
  gifted := found;

  update public.invites set uses = uses + 1 where code = p_code;
  return query select p.username, proposed, gifted from public.profiles p where p.id = inv.inviter_id;
end;
$$;

revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
