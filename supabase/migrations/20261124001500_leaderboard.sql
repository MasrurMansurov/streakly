-- Leaderboard of public profiles over the last 30 days.
-- Score = check-ins + 2 × active days (days with at least one check-in):
-- rewards both volume and showing up regularly.
-- SECURITY INVOKER: RLS applies; only public profiles and active habits count.
create function public.leaderboard(p_limit integer default 50)
returns table (
  username text,
  display_name text,
  avatar_url text,
  checkins_30 integer,
  active_days_30 integer,
  score integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.username, p.display_name, p.avatar_url,
         count(*)::int as checkins_30,
         count(distinct l.log_date)::int as active_days_30,
         (count(*) + 2 * count(distinct l.log_date))::int as score
  from public.profiles p
  join public.habit_logs l on l.user_id = p.id
  join public.habits h on h.id = l.habit_id and h.archived_at is null
  where p.is_public
    and l.log_date > current_date - 30
    and l.log_date <= current_date + 1
  group by p.id, p.username, p.display_name, p.avatar_url
  order by score desc, checkins_30 desc, p.username
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.leaderboard(integer) to anon, authenticated;
