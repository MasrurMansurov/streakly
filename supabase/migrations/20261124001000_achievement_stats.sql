-- All-time stats for achievements: total check-ins and the longest run of
-- consecutive days on any single habit ("gaps and islands": consecutive dates
-- minus their row number give the same value within one run).
-- SECURITY INVOKER: RLS applies, so it works for your own profile and public ones.
create function public.achievement_stats(p_user uuid)
returns table (total_checkins bigint, best_streak integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with logs as (
    select habit_id, log_date
    from public.habit_logs
    where user_id = p_user
  ),
  islands as (
    select habit_id, log_date - (row_number() over (partition by habit_id order by log_date))::int as grp
    from logs
  ),
  runs as (
    select count(*) as len from islands group by habit_id, grp
  )
  select
    (select count(*) from logs),
    coalesce((select max(len) from runs), 0)::integer;
$$;

grant execute on function public.achievement_stats(uuid) to anon, authenticated;
