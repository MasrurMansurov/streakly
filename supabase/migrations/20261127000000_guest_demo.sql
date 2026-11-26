-- Demo without sign-up (growth plan 1.3): Supabase anonymous sign-in.
-- A guest is a real (temporary) user, so the whole app works unchanged and
-- converting to an account (email + password) keeps everything.
--
-- A guest stays private and can't reach other people or cost money:
-- no follows / invites / pacts / challenges / proofs / uploads / push /
-- AI letters / public profile. Guests not converted in 7 days are deleted.

create function public.is_guest()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- RESTRICTIVE: combined with AND on top of the existing (permissive) policies.
create policy "guests: no follows" on public.follows as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no invites" on public.invites as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no pacts" on public.pacts as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no pact answers" on public.pacts as restrictive for update to authenticated
  using (not (select public.is_guest()));
create policy "guests: no challenges" on public.challenges as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no challenge members" on public.challenge_members as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no challenge answers" on public.challenge_members as restrictive for update to authenticated
  using (not (select public.is_guest()));
create policy "guests: no proofs" on public.pact_proofs as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no proof edits" on public.pact_proofs as restrictive for update to authenticated
  using (not (select public.is_guest()));
create policy "guests: no push" on public.push_subscriptions as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no letters" on public.weekly_letters as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: stay private" on public.profiles as restrictive for update to authenticated
  using (true)
  with check (not (select public.is_guest()) or is_public = false);
create policy "guests: no uploads" on storage.objects as restrictive for insert to authenticated
  with check (not (select public.is_guest()));
create policy "guests: no upload edits" on storage.objects as restrictive for update to authenticated
  using (not (select public.is_guest()));

-- SECURITY DEFINER functions skip RLS → the same rules, by hand.
create or replace function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  -- a guest on a shared device must not take over someone's reminders
  if public.is_guest() then
    raise exception 'guests cannot subscribe to push';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_seen_at)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300), now())
  on conflict (endpoint) do update
    set user_id      = excluded.user_id,
        p256dh       = excluded.p256dh,
        auth         = excluded.auth,
        user_agent   = coalesce(excluded.user_agent, public.push_subscriptions.user_agent),
        last_seen_at = now();
end;
$$;

create or replace function public.accept_invite(p_code text)
returns table (inviter_username text, pact_proposed boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  inv public.invites;
  proposed boolean := false;
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

  update public.invites set uses = uses + 1 where code = p_code;
  return query select p.username, proposed from public.profiles p where p.id = inv.inviter_id;
end;
$$;

-- The check-in date window (±8 days) is a rule for what the app writes on a
-- user's behalf (role authenticated). Trusted database functions running as
-- their owner (seed_demo below) may write history.
create or replace function public.habit_logs_check_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.log_date > current_date + 1 or new.log_date < current_date - 8 then
    raise exception 'check-in date out of range' using errcode = '22008';
  end if;
  if exists (
    select 1 from public.habits h
    where h.id = new.habit_id and new.log_date < (h.created_at at time zone 'UTC')::date - 1
  ) then
    raise exception 'check-in before the habit was created' using errcode = '22008';
  end if;
  return new;
end;
$$;

-- Sample habits: marked, so they can be removed in one go when converting.
alter table public.habits add column is_sample boolean not null default false;

-- Fill a fresh guest with ~60 days of believable history ending yesterday:
-- a daily habit with a couple of misses and comebacks, a 3×/week one, a
-- weekday one, an irregular one, and moods. Today is left for the guest.
create function public.seed_demo(p_today date, p_locale text default 'en')
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  ru boolean := p_locale = 'ru';
  h_read uuid; h_gym uuid; h_walk uuid; h_med uuid;
  d date;
  i int;
begin
  if me is null or not public.is_guest() then
    raise exception 'demo data is for guests only';
  end if;
  if abs(p_today - current_date) > 1 then
    raise exception 'bad date';
  end if;
  if exists (select 1 from public.habits where user_id = me) then
    return; -- already seeded (a reload, a second tab)
  end if;

  insert into public.habits (user_id, name, color, position, target_per_week, mini_label, cue, created_at, is_sample)
  values (me, case when ru then 'Читать 10 страниц' else 'Read 10 pages' end, 'emerald', 0, 7,
          case when ru then '1 страница' else '1 page' end,
          case when ru then 'После ужина — открою книгу' else 'After dinner, I open the book' end,
          (p_today - 60)::timestamptz, true)
  returning id into h_read;
  insert into public.habits (user_id, name, color, position, target_per_week, created_at, is_sample)
  values (me, case when ru then 'Тренировка' else 'Workout' end, 'sky', 1, 3, (p_today - 60)::timestamptz, true)
  returning id into h_gym;
  insert into public.habits (user_id, name, color, position, target_per_week, created_at, is_sample)
  values (me, case when ru then 'Прогулка 30 минут' else '30-minute walk' end, 'amber', 2, 5, (p_today - 60)::timestamptz, true)
  returning id into h_walk;
  insert into public.habits (user_id, name, color, position, target_per_week, mini_label, created_at, is_sample)
  values (me, case when ru then 'Медитация' else 'Meditate' end, 'violet', 3, 7,
          case when ru then '3 вдоха' else '3 breaths' end, (p_today - 45)::timestamptz, true)
  returning id into h_med;

  for i in 1..60 loop
    d := p_today - i;
    -- reading: daily, missed on days 41–42 and 23 → two comebacks, a 22-day streak now
    if i not in (23, 41, 42) then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at)
      values (me, h_read, d, d + time '21:30' + (i % 40) * interval '1 minute');
    end if;
    -- workout: Mon / Wed / Fri, one week skipped
    if extract(isodow from d) in (1, 3, 5) and i not between 29 and 35 then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at)
      values (me, h_gym, d, d + time '07:40');
    end if;
    -- walk: weekdays, most of them
    if extract(isodow from d) <= 5 and i % 9 <> 4 then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at)
      values (me, h_walk, d, d + time '13:10');
    end if;
    -- meditation: since 45 days ago, irregular; some days only the mini version
    if i <= 45 and (i * 7) % 10 < 7 then
      insert into public.habit_logs (user_id, habit_id, log_date, created_at, is_mini)
      values (me, h_med, d, d + time '08:05', i % 5 = 0);
    end if;
    -- moods for the last 30 days: better on days with a workout
    if i <= 30 then
      insert into public.daily_moods (user_id, day, mood, energy)
      values (me, d,
              case when extract(isodow from d) in (1, 3, 5) then 4 + (i % 2) else 3 + (i % 2) end,
              case when extract(isodow from d) in (1, 3, 5) then 4 else 2 + (i % 3) end);
    end if;
  end loop;
end;
$$;
revoke execute on function public.seed_demo(date, text) from public, anon;
grant execute on function public.seed_demo(date, text) to authenticated;

-- Guests who didn't create an account within 7 days: gone with all their data
-- (profiles and everything else cascade from auth.users).
select cron.schedule(
  'cleanup-stale-guests',
  '45 3 * * *',
  $$delete from auth.users where is_anonymous and created_at < now() - interval '7 days'$$
);

-- Analytics: demo events; the funnel counts real accounts only (+ how many came via the demo).
alter table public.events drop constraint events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'share_opened', 'share_done', 'invite_link_copied', 'invite_opened', 'invite_accepted',
  'wrapped_viewed', 'wrapped_shared', 'demo_started', 'demo_converted'));

drop function public.growth_funnel(date, date);
create function public.growth_funnel(p_from date default current_date - 30, p_to date default current_date)
returns table (source text, signups bigint, from_demo bigint, activated bigint, d7_eligible bigint, d7 bigint, inviters bigint, sharers bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with u as (
    select p.id, p.created_at, coalesce(a.source, 'direct') as src
    from public.profiles p
    join auth.users au on au.id = p.id and not au.is_anonymous
    left join public.user_attribution a on a.user_id = p.id
    where p.created_at::date between p_from and p_to
  )
  select
    u.src,
    count(*),
    count(*) filter (where exists (select 1 from public.events e where e.user_id = u.id and e.name = 'demo_started')),
    count(*) filter (where exists (
      select 1 from public.habit_logs l join public.habits h on h.id = l.habit_id
      where l.user_id = u.id and not h.is_sample and l.created_at < u.created_at + interval '24 hours')),
    count(*) filter (where u.created_at < now() - interval '14 days'),
    count(*) filter (where u.created_at < now() - interval '14 days' and exists (
      select 1 from public.habit_logs l where l.user_id = u.id
        and l.created_at >= u.created_at + interval '7 days' and l.created_at < u.created_at + interval '14 days')),
    count(*) filter (where exists (select 1 from public.pacts x where x.inviter_id = u.id)
                       or exists (select 1 from public.challenges c where c.owner_id = u.id)
                       or exists (select 1 from public.events e where e.user_id = u.id and e.name = 'invite_link_copied')),
    count(*) filter (where exists (
      select 1 from public.events e where e.user_id = u.id and e.name in ('share_done', 'wrapped_shared')))
  from u
  group by u.src
  order by 2 desc;
$$;
revoke execute on function public.growth_funnel(date, date) from public, anon, authenticated;
