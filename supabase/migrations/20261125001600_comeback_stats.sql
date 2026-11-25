-- Comeback bonus: achievement_stats() also counts comebacks — a check-in on a
-- daily habit the day after a missed day (not done, not vacation, not a
-- repaired day), when the habit had check-ins before — and "never miss twice"
-- comebacks (back the very next day after a single missed day). Same rules as
-- src/lib/comeback.ts. The return type changes, so the function is recreated.
drop function public.achievement_stats(uuid);

create function public.achievement_stats(p_user uuid)
returns table (total_checkins bigint, best_streak integer, comebacks integer, quick_comebacks integer)
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
  ),
  -- comebacks: daily habits; the day before was neither done nor bridged (freezes don't count)
  comeback as (
    select d.habit_id, d.d,
           exists (select 1 from covered x where x.habit_id = d.habit_id and x.d = d.d - 2) as quick
    from done d
    join h on h.id = d.habit_id and h.daily
    join first_done f on f.habit_id = d.habit_id
    where d.d - 1 > f.d
      and not exists (select 1 from covered x where x.habit_id = d.habit_id and x.d = d.d - 1)
  )
  select
    (select count(*) from done),
    coalesce((select max(len) from runs), 0)::integer,
    (select count(*) from comeback)::integer,
    (select count(*) filter (where quick) from comeback)::integer;
$$;

grant execute on function public.achievement_stats(uuid) to anon, authenticated;
