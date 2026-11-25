-- Day start hour (P2 audit): "my day ends at 3 a.m." The setting lives in the
-- user's auth metadata as day_start = { h, ph?, since? } (see DayStart in
-- src/lib/dates.ts): a change applies from the next day (`since`); until then
-- the previous hour `ph` does, so "today" never jumps back.

-- The person's "today" — same rule as logicalToday() in src/lib/dates.ts.
-- Wall-clock arithmetic (timestamp without time zone), so DST days work.
create function public.logical_date(p_tz text, p_day_start jsonb, p_at timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  with v as (
    select
      p_at at time zone p_tz as lt,
      least(greatest(coalesce((p_day_start ->> 'h')::int, 0), 0), 6) as h,
      least(greatest(coalesce((p_day_start ->> 'ph')::int, (p_day_start ->> 'h')::int, 0), 0), 6) as ph,
      case when (p_day_start ->> 'since') ~ '^\d{4}-\d{2}-\d{2}$' then (p_day_start ->> 'since')::date end as since
  )
  select case
    when since is null or (p_day_start ->> 'ph') is null then (lt - make_interval(hours => h))::date
    when (lt - make_interval(hours => ph))::date < since then (lt - make_interval(hours => ph))::date
    else greatest((lt - make_interval(hours => h))::date, since)
  end
  from v;
$$;

-- The current streak of a daily habit before `p_today` (today is still open):
-- the same freezes / vacation / repaired days as habitStreak() in
-- src/lib/streaks.ts, so a reminder's "N-day streak at risk" matches the app.
create function public.habit_current_streak(p_habit uuid, p_today date)
returns integer
language sql
stable
set search_path = ''
as $$
  with h as (
    select id, user_id from public.habits where id = p_habit and target_per_week >= 7
  ),
  done as (
    select l.log_date as d from public.habit_logs l join h on h.id = l.habit_id
    where l.log_date < p_today and l.log_date >= p_today - 400
  ),
  bridge as (
    select r.day as d from public.habit_repairs r join h on h.id = r.habit_id
    union
    select g::date
    from public.pauses pa join h on pa.user_id = h.user_id
    cross join generate_series(pa.start_date, pa.end_date, interval '1 day') g
    where pa.end_date >= p_today - 400
  ),
  covered as (select d from done union select d from bridge),
  candidates as (
    select c.d + 1 as d
    from covered c
    where c.d + 1 > (select min(d) from done)
      and c.d + 1 < p_today
      and not exists (select 1 from covered x where x.d = c.d + 1)
      and (c.d + 2 = p_today or exists (select 1 from covered x where x.d = c.d + 2))
  ),
  frozen as (
    select d from (
      select d, row_number() over (partition by date_trunc('month', d) order by d) as n from candidates
    ) x where n <= 2
  ),
  days as (
    select d, true as is_done from done
    union all
    select g.d, false from (select d from bridge union select d from frozen) g
    where g.d < p_today and not exists (select 1 from done x where x.d = g.d)
  ),
  islands as (
    select d, is_done, d - (row_number() over (order by d))::int as grp from days
  ),
  last_run as (
    select grp from islands where d = p_today - 1
  )
  select coalesce((select count(*) filter (where is_done) from islands where grp = (select grp from last_run)), 0)::int;
$$;

revoke execute on function public.logical_date(text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.habit_current_streak(uuid, date) from public, anon, authenticated;
