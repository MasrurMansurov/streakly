-- One "best streak" everywhere (P2 audit): achievements, the public profile and
-- its share image used to count plain consecutive days, while the dashboard
-- counts freezes, vacation and repaired days. Someone with a 30-day streak on
-- the dashboard (thanks to a freeze) didn't get the 30-day badge.
--
-- Same rules as habitStreak() in src/lib/streaks.ts:
-- - bridges: repaired days (per habit) and vacation days (per user) keep a run alive;
-- - freezes (daily habits): a single missed day between two covered days, counted
--   from the habit's first check-in, at most 2 per calendar month, in date order;
-- - bridged / frozen days connect runs but don't add to their length;
-- - "N times a week" habits: plain consecutive check-in days (their streak is in weeks).
-- SECURITY INVOKER: RLS applies, so it works for your own profile and public ones.
create or replace function public.achievement_stats(p_user uuid)
returns table (total_checkins bigint, best_streak integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with h as (
    select id, target_per_week >= 7 as daily from public.habits where user_id = p_user
  ),
  done as (
    select habit_id, log_date as d from public.habit_logs where user_id = p_user
  ),
  first_done as (
    select habit_id, min(d) as d from done group by habit_id
  ),
  bridge as (
    select r.habit_id, r.day as d
    from public.habit_repairs r join h on h.id = r.habit_id and h.daily
    union
    select h.id, g::date
    from h
    join public.pauses p on p.user_id = p_user
    cross join generate_series(p.start_date, p.end_date, interval '1 day') g
    where h.daily
  ),
  covered as (
    select d.habit_id, d.d from done d join h on h.id = d.habit_id and h.daily
    union
    select habit_id, d from bridge
  ),
  candidates as (
    select c.habit_id, c.d + 1 as d
    from covered c
    join first_done f on f.habit_id = c.habit_id
    where c.d + 1 > f.d
      and c.d + 1 < current_date
      and not exists (select 1 from covered x where x.habit_id = c.habit_id and x.d = c.d + 1)
      and exists (select 1 from covered x where x.habit_id = c.habit_id and x.d = c.d + 2)
  ),
  frozen as (
    select habit_id, d
    from (
      select habit_id, d, row_number() over (partition by habit_id, date_trunc('month', d) order by d) as n
      from candidates
    ) x
    where n <= 2
  ),
  days as (
    select habit_id, d, true as is_done from done
    union all
    select g.habit_id, g.d, false
    from (select habit_id, d from bridge union select habit_id, d from frozen) g
    where not exists (select 1 from done x where x.habit_id = g.habit_id and x.d = g.d)
  ),
  islands as (
    select habit_id, is_done, d - (row_number() over (partition by habit_id order by d))::int as grp
    from days
  ),
  runs as (
    select count(*) filter (where is_done) as len from islands group by habit_id, grp
  )
  select
    (select count(*) from done),
    coalesce((select max(len) from runs), 0)::integer;
$$;
